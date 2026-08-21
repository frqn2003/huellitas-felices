"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { PROVEEDORES } from "@/data/articulos";
import { USUARIO_SESION } from "@/data/ordenes-compra";
import {
  solicitudesIniciales,
  type Cotizacion,
  type SolicitudCotizacion,
} from "@/data/cotizaciones";

export interface NuevaSolicitudInput {
  lineas: { articuloId: string; cantidad: string }[];
  notas: string;
}

export interface NuevaCotizacionInput {
  proveedorId: string;
  condicionPago: string;
  fechaRecepcion: string;
  /** Precio por artículo solicitado (clave = articulo_id). */
  precios: Record<string, number>;
}

interface CotizacionesContextValue {
  solicitudes: SolicitudCotizacion[];
  crearSolicitud: (input: NuevaSolicitudInput) => void;
  registrarCotizacion: (solicitudId: number, input: NuevaCotizacionInput) => void;
  adjudicar: (solicitudId: number, cotizacionId: number) => void;
  cancelarSolicitud: (solicitudId: number) => void;
}

const CotizacionesContext = createContext<CotizacionesContextValue | null>(null);

// BACKEND: cada operación reemplaza una llamada real:
// - crearSolicitud      → POST /api/solicitudes-cotizacion
// - registrarCotizacion → POST /api/solicitudes-cotizacion/:id/cotizaciones
// - adjudicar           → PATCH /api/solicitudes-cotizacion/:id/adjudicar
// - cancelarSolicitud   → PATCH /api/solicitudes-cotizacion/:id/cancelar
// El estado inicial viene de GET /api/solicitudes-cotizacion.
export function CotizacionesProvider({ children }: { children: ReactNode }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudCotizacion[]>(solicitudesIniciales);

  const crearSolicitud = useCallback((input: NuevaSolicitudInput) => {
    setSolicitudes((prev) => {
      const nuevoId = Math.max(0, ...prev.map((s) => s.id)) + 1;
      let detalleId = Math.max(
        0,
        ...prev.flatMap((s) => s._articulos_solicitados.map((a) => a.id)),
      );
      const nueva: SolicitudCotizacion = {
        id: nuevoId,
        usuario_id: USUARIO_SESION.id,
        fecha: new Date().toISOString(),
        estado: "Abierta",
        notas: input.notas.trim() || null,
        cotizacion_id_adjudicada: null,
        _usuario: { id: USUARIO_SESION.id, nombre: USUARIO_SESION.nombre },
        _articulos_solicitados: input.lineas.map((l) => ({
          id: ++detalleId,
          solicitud_id: nuevoId,
          articulo_id: Number(l.articuloId),
          cantidad_estimada: Number(l.cantidad),
        })),
        _cotizaciones: [],
      };
      return [nueva, ...prev];
    });
  }, []);

  const registrarCotizacion = useCallback(
    (solicitudId: number, input: NuevaCotizacionInput) => {
      setSolicitudes((prev) =>
        prev.map((s) => {
          if (s.id !== solicitudId) return s;
          const proveedor = { id: Number(input.proveedorId) };
          let detalleId = Math.max(
            0,
            ...prev.flatMap((x) => x._cotizaciones.flatMap((c) => c._detalles.map((d) => d.id))),
          );
          const cotizacionId =
            Math.max(0, ...prev.flatMap((x) => x._cotizaciones.map((c) => c.id))) + 1;
          const nueva: Cotizacion = {
            id: cotizacionId,
            solicitud_id: solicitudId,
            proveedor_id: proveedor.id,
            condicion_pago: input.condicionPago,
            fecha_recepcion: `${input.fechaRecepcion}T12:00:00Z`,
            // En producción el back resuelve la razón social con JOIN a proveedor;
            // en la demo se resuelve desde el catálogo local.
            _proveedor: {
              id: proveedor.id,
              razon_social:
                PROVEEDORES.find((p) => p.id === proveedor.id)?.nombre ?? "",
            },
            _detalles: s._articulos_solicitados.map((a) => ({
              id: ++detalleId,
              cotizacion_id: cotizacionId,
              articulo_id: a.articulo_id,
              precio: input.precios[String(a.articulo_id)] ?? 0,
            })),
          };
          return { ...s, _cotizaciones: [...s._cotizaciones, nueva] };
        }),
      );
    },
    [],
  );

  const adjudicar = useCallback((solicitudId: number, cotizacionId: number) => {
    setSolicitudes((prev) =>
      prev.map((s) =>
        s.id === solicitudId
          ? { ...s, estado: "Adjudicada", cotizacion_id_adjudicada: cotizacionId }
          : s,
      ),
    );
  }, []);

  const cancelarSolicitud = useCallback((solicitudId: number) => {
    setSolicitudes((prev) =>
      prev.map((s) => (s.id === solicitudId ? { ...s, estado: "Cancelada" } : s)),
    );
  }, []);

  const value = useMemo(
    () => ({ solicitudes, crearSolicitud, registrarCotizacion, adjudicar, cancelarSolicitud }),
    [solicitudes, crearSolicitud, registrarCotizacion, adjudicar, cancelarSolicitud],
  );

  return <CotizacionesContext.Provider value={value}>{children}</CotizacionesContext.Provider>;
}

export function useCotizaciones(): CotizacionesContextValue {
  const ctx = useContext(CotizacionesContext);
  if (!ctx) {
    throw new Error("useCotizaciones debe usarse dentro de CotizacionesProvider");
  }
  return ctx;
}
