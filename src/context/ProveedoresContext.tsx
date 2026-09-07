"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { Proveedor } from "@/data/proveedores";
import { FORMAS_PAGO, type FormaPago } from "@/data/formas-pago";
import { apiGet, apiSend, mensajeDeError } from "@/lib/api-client";

export type NuevoProveedorInput = Omit<Proveedor, "id" | "estado">;

/**
 * Fila del catálogo `forma_pago`. Es el placeholder compartido FORMAS_PAGO
 * (src/data/formas-pago.ts, decisión D4): la API lo expone por
 * GET /api/formas-pago, pero el front no cuelga de ese endpoint.
 * Re-exportado para que los componentes del módulo no importen de dos lados.
 */
export type { FormaPago } from "@/data/formas-pago";

type Resultado = { error?: string };

interface ProveedoresContextValue {
  proveedores: Proveedor[];
  /** Catálogo `forma_pago` (placeholder compartido FORMAS_PAGO, D4/C2). */
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
 * `formasPago: string[]` (wire actual) Y el `forma_pago_id` nuevo (dict). La
 * conversión nombres → ids (`formaPagoIds`) se hace acá, en el borde, contra
 * el catálogo FORMAS_PAGO (placeholder estático D4: no difiere de la base
 * salvo que el back cambie un nombre; el id viaja al POST en `forma_pago_id`).
 */
export function ProveedoresProvider({ children }: { children: ReactNode }) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  // D4: el catálogo de formas de pago NO se baja por red — arranca con el
  // placeholder compartido FORMAS_PAGO (src/data/formas-pago.ts). BACKEND:
  // cuando exista GET /api/formas-pago, volver a estado vacío + fetch en el
  // efecto (igual que el listado).
  const [formasPago] = useState<FormaPago[]>(FORMAS_PAGO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;

    // Sólo el listado de proveedores viaja por red (con su estado de
    // carga/error compartido). El catálogo de formas de pago ya vive en el
    // estado inicial (D4, ver comentario arriba) — no hay setState en el efecto.
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

  const agregarProveedor = useCallback(
    async (input: NuevoProveedorInput): Promise<Resultado> => {
      try {
        const creado = await apiSend<Proveedor>("POST", "/api/proveedores", {
          ...input,
          formaPagoIds: aIds(input.formasPago),
        });
        // Se agrega el que devuelve la API, no el draft: trae el id real.
        setProveedores((prev) => [...prev, creado]);
        return {};
      } catch (e) {
        return { error: mensajeDeError(e) };
      }
    },
    [aIds],
  );

  const actualizarProveedor = useCallback(
    async (id: number, input: NuevoProveedorInput): Promise<Resultado> => {
      try {
        const actualizado = await apiSend<Proveedor>("PUT", `/api/proveedores/${id}`, {
          ...input,
          formaPagoIds: aIds(input.formasPago),
        });
        setProveedores((prev) => prev.map((p) => (p.id === id ? actualizado : p)));
        return {};
      } catch (e) {
        return { error: mensajeDeError(e) };
      }
    },
    [aIds],
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
