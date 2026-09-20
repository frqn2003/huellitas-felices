"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiGet, apiSend } from "@/lib/api-client";
import { roles, type Usuario, type Rol, type RolNombre } from "@/data/usuarios";

/**
 * Sesión del front — HU-SIS-04, conectado al backend.
 *
 * QUÉ CAMBIÓ RESPECTO DE LA VERSIÓN SIMULADA
 *   Antes este archivo era la autoridad: buscaba el usuario en el array de
 *   `src/data/usuarios.ts`, comparaba la contraseña en texto plano, contaba los
 *   intentos en un `useRef` y programaba el desbloqueo con un `setTimeout`.
 *
 *   Nada de eso podía sobrevivir a un login real, y no por prolijidad:
 *
 *   · La contraseña estaba en el bundle que baja el navegador. Cualquiera con
 *     F12 leía las 4 contraseñas del sistema.
 *   · El contador vivía en memoria de la pestaña: recargar la página lo
 *     reseteaba, así que los "3 intentos" eran 3 por recarga, o sea infinitos.
 *   · El `setTimeout` de 15 minutos moría al cerrar la pestaña. El bloqueo
 *     duraba lo que durara la pestaña abierta.
 *
 *   Ahora las tres cosas las decide el backend contra la base
 *   (`usuario.intentos_fallidos`, `usuario.bloqueado_hasta`), que es lo que
 *   pide el criterio de aceptación. Este archivo pasó de ser la regla a ser una
 *   pantalla que muestra lo que contesta la API.
 *
 * LA FORMA DEL ESTADO NO CAMBIÓ
 *   `AuthState` mantiene los mismos `status` para que LoginForm, Sidebar y
 *   ConfiguracionForm sigan funcionando igual. Lo único distinto es el payload
 *   de `error`: ver el comentario en `AuthState`.
 */

export type AuthState =
  /** Arrancando: todavía no sabemos si hay sesión (se está consultando la API). */
  | { status: "verificando" }
  /** Ya preguntamos: no hay nadie logueado. */
  | { status: "idle" }
  | { status: "loading" }
  /**
   * Credenciales rechazadas.
   *
   * ⚠️ ANTES ESTO ERA `{ intentosRestantes: number }` Y AHORA NO PUEDE SERLO.
   *    El backend no informa cuántos intentos quedan, a propósito: "te queda 1
   *    intento" confirma que el email existe, y el criterio pide un mensaje que
   *    no revele cuál de los dos datos falló. Un email inventado nunca recibe
   *    ese aviso, así que recibirlo ES la respuesta.
   *
   *    El número sí queda registrado en `auditoria_sesion.detalle`, que es donde
   *    sirve: para auditar, no para ayudar a quien está probando.
   */
  | { status: "error"; mensaje: string }
  /** Bloqueada. `bloqueadoHasta` es epoch en ms, lo que espera BlockedOverlay. */
  | { status: "blocked"; bloqueadoHasta: number }
  | { status: "2fa_required"; usuario: Usuario }
  | { status: "authenticated"; usuario: Usuario; rol: Rol };

export interface ActualizarUsuarioInput {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  password?: string;
}

/** Lo que devuelven POST /api/auth/login y GET /api/auth/sesion. */
type SesionApi = {
  usuarioId: number;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
  requiere2FA: boolean;
};

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  /** Recibe el código en la firma pública; hoy no lo usa (ver la implementación). */
  verificar2FA: (codigo: string) => boolean;
  reenviarCodigo: () => void;
  logout: () => Promise<void>;
  actualizarUsuario: (input: ActualizarUsuarioInput) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

/**
 * Arma el `Usuario` que esperan las pantallas a partir de lo que da la API.
 *
 * La API devuelve menos campos que el `Usuario` del front, y eso es correcto:
 *
 *  · `password` NO viaja nunca. Es la razón de ser de esta HU.
 *  · `telefono` no existe como columna en `usuario` (decisión D6, pendiente con
 *    la DBA). Va vacío.
 *  · `dni`, `estado` y `fecha_creacion` sí son columnas reales, pero el endpoint
 *    de sesión no las expone: para saber quién está logueado no hacen falta, y
 *    una respuesta de sesión es lo último donde conviene mandar datos de más.
 *    La pantalla de Configuración las necesita y las va a pedir por su propio
 *    endpoint en HU-SIS-05.
 */
function aUsuario(sesion: SesionApi): Usuario {
  const rol = buscarRol(sesion.rol);

  return {
    id: sesion.usuarioId,
    rol_id: rol.id,
    nombre: sesion.nombre,
    apellido: sesion.apellido,
    dni: "",
    email: sesion.email,
    telefono: "",
    auth_id: null,
    estado: "Activo",
    fecha_creacion: "",
    // Sin contraseña: el front ya no la tiene ni la puede tener.
    password: "",
  };
}

/**
 * Resuelve el rol por nombre contra el catálogo del front.
 *
 * La comparación es case-insensitive porque los nombres de `rol.nombre` en la
 * base ("Personal de depósito") no tienen por qué coincidir en mayúsculas con el
 * literal del tipo `RolNombre`. Si no matchea, el rol se conserva con el nombre
 * que dio la base en vez de inventar uno: mostrar "Recepcionista" a un gerente
 * porque el catálogo del front está desactualizado es peor que mostrar un
 * nombre que el front no conocía.
 */
function buscarRol(nombre: string): Rol {
  const encontrado = roles.find((r) => r.nombre.toLowerCase() === nombre.toLowerCase());
  return encontrado ?? { id: 0, nombre: nombre as RolNombre };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "verificando" });

  const aplicarSesion = useCallback((sesion: SesionApi) => {
    const usuario = aUsuario(sesion);

    // El 2FA lo decide el BACKEND con el rol que tiene en la base, no el front
    // mirando el nombre del rol. La versión simulada hacía
    // `if (rol.nombre === "Administrador")`, que es una regla de seguridad
    // decidida en el navegador: se salteaba editando una variable.
    if (sesion.requiere2FA) {
      setState({ status: "2fa_required", usuario });
      return;
    }

    setState({ status: "authenticated", usuario, rol: buscarRol(sesion.rol) });
  }, []);

  // Al cargar, preguntamos si ya hay sesión.
  //
  // Hace falta porque la cookie es httpOnly: el JavaScript de la página no
  // puede leerla. Sin esto, recargar cualquier pantalla te dejaría "sin sesión"
  // en la interfaz aunque la sesión esté viva en el servidor.
  useEffect(() => {
    let cancelado = false;

    apiGet<{ sesion: SesionApi | null }>("/api/auth/sesion")
      .then((r) => {
        if (cancelado) return;
        if (r.sesion) aplicarSesion(r.sesion);
        else setState({ status: "idle" });
      })
      .catch(() => {
        // Si el endpoint falla, tratamos el arranque como "sin sesión" en vez de
        // dejar la interfaz colgada en "verificando" para siempre.
        if (!cancelado) setState({ status: "idle" });
      });

    return () => {
      cancelado = true;
    };
  }, [aplicarSesion]);

  const login = useCallback(
    async (email: string, password: string) => {
      setState({ status: "loading" });

      try {
        const sesion = await apiSend<SesionApi>("POST", "/api/auth/login", { email, password });
        aplicarSesion(sesion);
      } catch (e) {
        if (e instanceof ApiError && e.codigo === "CUENTA_BLOQUEADA") {
          // El backend manda `bloqueadoHasta` en ISO. Se convierte a epoch ms
          // porque es lo que BlockedOverlay usa para su cuenta regresiva.
          //
          // Y viene del SERVIDOR, no se calcula acá como `Date.now() + 15min`:
          // si el usuario recarga a los 10 minutos, el contador tiene que
          // arrancar en 5, no en 15 de nuevo.
          const hasta = e.datos?.bloqueadoHasta;
          setState({
            status: "blocked",
            bloqueadoHasta:
              typeof hasta === "string" ? new Date(hasta).getTime() : Date.now() + 15 * 60 * 1000,
          });
          return;
        }

        setState({
          status: "error",
          mensaje:
            e instanceof ApiError ? e.message : "No se pudo iniciar sesión. Intentá de nuevo.",
        });
      }
    },
    [aplicarSesion],
  );

  /**
   * 2FA — todavía no implementado (el criterio lo marca "para el final").
   *
   * Hoy `requiere2FA` siempre llega en false, así que este estado no se alcanza.
   * La función se conserva para no cambiarle la forma al contexto ni tocar
   * TwoFactorModal, y devuelve false: sin backend no hay código que validar, y
   * aceptar cualquier cosa sería peor que rechazar todo.
   */
  const verificar2FA = useCallback((): boolean => false, []);

  const reenviarCodigo = useCallback(() => {
    // Igual que verificar2FA: espera su propia HU.
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiSend("POST", "/api/auth/logout", {});
    } catch {
      // Si la llamada falla (sin red, sesión ya vencida), igual se limpia el
      // estado local: que alguien no pueda salir del sistema es peor que un
      // token que sobrevive hasta expirar. El backend, cuando la recibe,
      // invalida el token en Supabase además de borrar la cookie.
    }
    setState({ status: "idle" });
  }, []);

  const actualizarUsuario = useCallback((input: ActualizarUsuarioInput) => {
    // Solo refleja el cambio en pantalla. La persistencia es HU-SIS-05
    // (PUT /api/usuarios/:id), que todavía no existe: al recargar, estos
    // valores vuelven a los de la base.
    setState((prev) => {
      if (prev.status !== "authenticated") return prev;
      return {
        ...prev,
        usuario: {
          ...prev.usuario,
          nombre: input.nombre,
          apellido: input.apellido,
          email: input.email,
          telefono: input.telefono,
        },
      };
    });
  }, []);

  const value = useMemo(
    () => ({ state, login, verificar2FA, reenviarCodigo, logout, actualizarUsuario }),
    [state, login, verificar2FA, reenviarCodigo, logout, actualizarUsuario],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
