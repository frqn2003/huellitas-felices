"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { Proveedor } from "@/data/proveedores";
import type { FormaPago } from "@/data/formas-pago";
import { apiGet, apiSend, mensajeDeError } from "@/lib/api-client";
import { useCatalogo } from "@/lib/use-catalogo";

export type NuevoProveedorInput = Omit<Proveedor, "id" | "estado">;

/**
 * Fila del catálogo `forma_pago`, que sirve GET /api/formas-pago.
 * Re-exportado para que los componentes del módulo no importen de dos lados.
 */
export type { FormaPago } from "@/data/formas-pago";

type Resultado = { error?: string };

interface ProveedoresContextValue {
  proveedores: Proveedor[];
  /** Catálogo `forma_pago`, desde GET /api/formas-pago. */
  formasPago: FormaPago[];
  loading: boolean;
  error: boolean;
  recargar: () => void;
  agregarProveedor: (input: NuevoProveedorInput) => Promise<Resultado>;
  actualizarProveedor: (id: number, input: NuevoProveedorInput) => Promise<Resultado>;
  darDeBaja: (id: number) => Promise<Resultado>;
}

export const ProveedoresContext = createContext<ProveedoresContextValue | null>(null);

/**
 * HU-PROV-01 — estado de Proveedores contra la API.
 *
 * Las validaciones que antes vivían acá (CUIT duplicado) las hace ahora el
 * backend: el front no puede garantizarlas, porque su lista puede estar
 * desactualizada y dos personas pueden guardar a la vez. Lo que llega es el
 * mensaje del server, que además distingue el caso de la baja con órdenes
 * abiertas — algo que el front directamente no sabe.
 *
 * TRADUCCIÓN DE FORMAS DE PAGO: el formulario envía el nombre elegido en
 * `formasPago: string[]` (wire actual). La conversión nombres → ids
 * (`formaPagoIds`) se hace acá, en el borde, contra el catálogo real que trae
 * GET /api/formas-pago.
 *
 * Antes ese catálogo era el array fijo FORMAS_PAGO de src/data/formas-pago.ts
 * (decisión "D4"). Funcionaba porque sus ids 1–5 coincidían con los del seed,
 * pero nada lo garantizaba: agregar una forma de pago desde Supabase no la
 * hacía aparecer en el formulario, y renombrar una rompía la traducción
 * nombre → id en silencio (el `.filter()` de `aIds` descarta lo que no
 * encuentra, así que el proveedor se guardaba con menos formas de pago de las
 * que el usuario eligió).
 */
export function ProveedoresProvider({ children }: { children: ReactNode }) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  // El catálogo real de `forma_pago`. Va por `useCatalogo` y no por el
  // `Promise.all` del efecto de abajo porque no comparte su estado de
  // carga/error: el listado de proveedores es lo que da sentido a la pantalla,
  // este catálogo solo puebla dos selects.
  const formasPago = useCatalogo<FormaPago>("/api/formas-pago");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;

    // Este efecto trae SOLO el listado, que es lo que tiene estado de
    // carga/error propio. El catálogo de formas de pago lo resuelve
    // `useCatalogo` arriba, con su propio ciclo.
    apiGet<Proveedor[]>("/api/proveedores")
      .then((lista) => {
        if (cancelado) return;
        setProveedores(lista);
      })
      .catch(() => {
        if (!cancelado) setError(true);
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [recarga]);

  const recargar = useCallback(() => {
    setError(false);
    setLoading(true);
    setRecarga((n) => n + 1);
  }, []);

  /** Nombres del formulario → ids que espera la API. Descarta lo que no exista. */
  const aIds = useCallback(
    (nombres: string[]) =>
      nombres
        .map((n) => formasPago.find((f) => f.nombre === n)?.id)
        .filter((id): id is number => typeof id === "number"),
    [formasPago],
  );

  /**
   * El formulario → el body que espera la API.
   *
   * ACÁ SE ROMPÍA EL ALTA. El front habla snake_case en este módulo a propósito
   * (ver el mapper: `razon_social`, `plazo_entrega_dias`, contrato C1), pero el
   * BODY del POST no es el shape de lectura: `crearProveedorSchema` valida
   * `razonSocial` y `plazoEntregaDias`, como todos los schemas del proyecto.
   * Se mandaba `{ ...input }` crudo, así que `razonSocial` llegaba undefined y
   * el server contestaba 422 `Required` — el "Required" rojo del modal, sin
   * decir qué campo, porque el modal solo pinta el mensaje y descarta el
   * `campo` que el error sí trae.
   *
   * Y no fallaba solo la razón social: `plazo_entrega_dias` también se perdía,
   * y zod sin `.strict()` descarta en silencio lo que no declara. O sea que
   * aunque el alta hubiera pasado, el plazo se guardaba en el default.
   *
   * La traducción va acá, en el borde, junto a la de formas de pago: es el
   * único lugar que ya sabía que los dos vocabularios existen.
   */
  const aBody = useCallback(
    (input: NuevoProveedorInput) => ({
      razonSocial: input.razon_social,
      cuit: input.cuit,
      direccion: input.direccion,
      telefono: input.telefono,
      email: input.email,
      contacto: input.contacto,
      plazoEntregaDias: input.plazo_entrega_dias,
      formaPagoIds: aIds(input.formasPago),
      // `calificacion` NO viaja: es HU-PROV-02 y el schema todavía no la
      // declara, así que zod la descartaría igual (ver el mapper).
    }),
    [aIds],
  );

  const agregarProveedor = useCallback(
    async (input: NuevoProveedorInput): Promise<Resultado> => {
      try {
        const creado = await apiSend<Proveedor>("POST", "/api/proveedores", aBody(input));
        // Se agrega el que devuelve la API, no el draft: trae el id real.
        setProveedores((prev) => [...prev, creado]);
        return {};
      } catch (e) {
        return { error: mensajeDeError(e) };
      }
    },
    [aBody],
  );

  const actualizarProveedor = useCallback(
    async (id: number, input: NuevoProveedorInput): Promise<Resultado> => {
      try {
        const actualizado = await apiSend<Proveedor>(
          "PUT",
          `/api/proveedores/${id}`,
          aBody(input),
        );
        setProveedores((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
        return {};
      } catch (e) {
        return { error: mensajeDeError(e) };
      }
    },
    [aBody],
  );

  const darDeBaja = useCallback(async (id: number): Promise<Resultado> => {
    try {
      // El back rechaza la baja si el proveedor tiene órdenes de compra
      // abiertas. Esa regla no se puede validar en el front.
      const actualizado = await apiSend<Proveedor>(
        "PATCH",
        `/api/proveedores/${id}/inactivar`,
      );
      setProveedores((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
      return {};
    } catch (e) {
      return { error: mensajeDeError(e) };
    }
  }, []);

  const value = useMemo(
    () => ({
      proveedores,
      formasPago,
      loading,
      error,
      recargar,
      agregarProveedor,
      actualizarProveedor,
      darDeBaja,
    }),
    [
      proveedores,
      formasPago,
      loading,
      error,
      recargar,
      agregarProveedor,
      actualizarProveedor,
      darDeBaja,
    ],
  );

  return (
    <ProveedoresContext.Provider value={value}>{children}</ProveedoresContext.Provider>
  );
}
