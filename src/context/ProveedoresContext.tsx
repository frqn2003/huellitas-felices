"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { Proveedor } from "@/data/proveedores";
import { apiGet, apiSend, mensajeDeError } from "@/lib/api-client";

export type NuevoProveedorInput = Omit<Proveedor, "id" | "estado">;

/** Fila del catálogo `forma_pago`. GET /api/formas-pago */
export type FormaPago = { id: number; nombre: string };

type Resultado = { error?: string };

interface ProveedoresContextValue {
  proveedores: Proveedor[];
  /** Catálogo real de la base: reemplaza la lista que el modal tenía hardcodeada. */
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
 * TRADUCCIÓN DE FORMAS DE PAGO: el formulario trabaja con nombres
 * (`formasPago: string[]`) porque así lo diseñó el equipo de front, pero la API
 * espera ids (`formaPagoIds: number[]`). La conversión se hace acá, en el
 * borde, contra el catálogo real. Así el modal no necesita saber de ids.
 */
export function ProveedoresProvider({ children }: { children: ReactNode }) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [formasPago, setFormasPago] = useState<FormaPago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;

    Promise.all([
      apiGet<Proveedor[]>("/api/proveedores"),
      apiGet<FormaPago[]>("/api/formas-pago"),
    ])
      .then(([lista, catalogo]) => {
        if (cancelado) return;
        setProveedores(lista);
        setFormasPago(catalogo);
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
