"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usuarios, roles, type Usuario, type Rol } from "@/data/usuarios";

const MAX_INTENTOS = 3;
const BLOQUEO_MS = 15 * 60 * 1000; // 15 minutos
const CODIGO_2FA = "123456"; // Código simulado

export type AuthState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; intentosRestantes: number }
  | { status: "blocked"; bloqueadoHasta: number }
  | { status: "2fa_required"; usuario: Usuario }
  | { status: "authenticated"; usuario: Usuario; rol: Rol };

interface AuthContextValue {
  state: AuthState;
  login: (email: string, password: string) => void;
  verificar2FA: (codigo: string) => boolean;
  reenviarCodigo: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "idle" });
  const intentosRef = useRef(0);
  const bloqueoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getRol = useCallback((rolId: number): Rol => {
    return roles.find((r) => r.id === rolId) ?? { id: rolId, nombre: "Recepcionista" };
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      setState({ status: "loading" });

      // Simular delay de red
      setTimeout(() => {
        const usuario = usuarios.find(
          (u) => u.email === email && u.password === password && u.estado === "Activo",
        );

        if (!usuario) {
          intentosRef.current += 1;
          const restantes = MAX_INTENTOS - intentosRef.current;

          if (restantes <= 0) {
            const bloqueadoHasta = Date.now() + BLOQUEO_MS;
            setState({ status: "blocked", bloqueadoHasta });
            // BACKEND: registrar en auditoría como login_bloqueado
            if (bloqueoTimerRef.current) clearTimeout(bloqueoTimerRef.current);
            bloqueoTimerRef.current = setTimeout(() => {
              intentosRef.current = 0;
              setState({ status: "idle" });
            }, BLOQUEO_MS);
          } else {
            setState({ status: "error", intentosRestantes: restantes });
          }
          return;
        }

        intentosRef.current = 0;
        const rol = getRol(usuario.rol_id);

        // Solo Administrador requiere 2FA
        if (rol.nombre === "Administrador") {
          setState({ status: "2fa_required", usuario });
        } else {
          setState({ status: "authenticated", usuario, rol });
        }
      }, 800);
    },
    [getRol],
  );

  const verificar2FA = useCallback(
    (codigo: string): boolean => {
      if (state.status !== "2fa_required") return false;

      if (codigo === CODIGO_2FA) {
        const rol = getRol(state.usuario.rol_id);
        setState({ status: "authenticated", usuario: state.usuario, rol });
        return true;
      }
      return false;
    },
    [state, getRol],
  );

  const reenviarCodigo = useCallback(() => {
    // Simular reenvío — en producción iría POST /api/auth/2fa/reenviar
  }, []);

  const logout = useCallback(() => {
    if (bloqueoTimerRef.current) clearTimeout(bloqueoTimerRef.current);
    intentosRef.current = 0;
    setState({ status: "idle" });
  }, []);

  const value = useMemo(
    () => ({ state, login, verificar2FA, reenviarCodigo, logout }),
    [state, login, verificar2FA, reenviarCodigo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
