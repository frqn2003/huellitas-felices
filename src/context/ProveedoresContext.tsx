"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useMemo, useState } from "react";
import type { Proveedor } from "@/data/proveedores";
import { proveedoresIniciales } from "@/data/proveedores";

export type NuevoProveedorInput = Omit<Proveedor, "id" | "estado">;

interface ProveedoresContextValue {
  proveedores: Proveedor[];
  agregarProveedor: (input: NuevoProveedorInput) => { error?: string };
  actualizarProveedor: (id: number, input: NuevoProveedorInput) => { error?: string };
  darDeBaja: (id: number) => { error?: string };
}

export const ProveedoresContext = createContext<ProveedoresContextValue | null>(null);

// BACKEND:
// - agregarProveedor -> POST /api/proveedores
// - actualizarProveedor -> PUT /api/proveedores/:id
// - darDeBaja -> PATCH /api/proveedores/:id/inactivar
export function ProveedoresProvider({ children }: { children: ReactNode }) {
  const [proveedores, setProveedores] = useState<Proveedor[]>(proveedoresIniciales);

  const chequearCuitDuplicado = useCallback(
    (cuit: string, ignorarId?: number) => {
      return proveedores.some(
        (p) => p.cuit === cuit && p.estado === "Activo" && p.id !== ignorarId,
      );
    },
    [proveedores],
  );

  const agregarProveedor = useCallback(
    (input: NuevoProveedorInput) => {
      if (chequearCuitDuplicado(input.cuit)) {
        return { error: "Ya existe un proveedor activo con este CUIT." };
      }
      setProveedores((prev) => [
        ...prev,
        {
          ...input,
          id: Math.max(0, ...prev.map((p) => p.id)) + 1,
          estado: "Activo",
        },
      ]);
      return {};
    },
    [chequearCuitDuplicado],
  );

  const actualizarProveedor = useCallback(
    (id: number, input: NuevoProveedorInput) => {
      if (chequearCuitDuplicado(input.cuit, id)) {
        return { error: "Ya existe otro proveedor activo con este CUIT." };
      }
      setProveedores((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...input } : p)),
      );
      return {};
    },
    [chequearCuitDuplicado],
  );

  const darDeBaja = useCallback((id: number) => {
    // BACKEND: el backend debería fallar si hay órdenes pendientes, pero
    // por ahora hacemos el "happy path" en el front (baja lógica).
    setProveedores((prev) =>
      prev.map((p) => (p.id === id ? { ...p, estado: "Inactivo" } : p)),
    );
    return {};
  }, []);

  const value = useMemo(
    () => ({ proveedores, agregarProveedor, actualizarProveedor, darDeBaja }),
    [proveedores, agregarProveedor, actualizarProveedor, darDeBaja],
  );

  return (
    <ProveedoresContext.Provider value={value}>
      {children}
    </ProveedoresContext.Provider>
  );
}
