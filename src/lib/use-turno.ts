"use client";

import { useEffect, useMemo, useState } from "react";
import type { Cliente } from "@/data/clientes";
import type { Mascota } from "@/data/mascotas";
import { armarDirectorio, type Practica, type Profesional, type Turno } from "@/data/turnos";
import { ApiError, apiGet } from "@/lib/api-client";
import { useCatalogo } from "@/lib/use-catalogo";

/**
 * Un turno con todo lo que las pantallas de atención y cobro necesitan mostrar:
 * su cliente, su mascota, el profesional de la franja y la práctica.
 *
 *   GET /api/turnos/:id · /api/clientes/:id · /api/mascotas/:id
 *   GET /api/profesionales · /api/practicas   (catálogos)
 *
 * Reemplaza a los arrays de ejemplo (turnosIniciales, clientesIniciales,
 * mascotasIniciales) que estas pantallas buscaban por id.
 */
export interface TurnoCompleto {
  turno: Turno | null;
  cliente: Cliente | null;
  mascota: Mascota | null;
  practica: Practica | null;
  /** "Nombre Apellido" del profesional de la franja, o "—". */
  profesionalDisplay: string;
  practicaDisplay: string;
  /** true mientras se pide el turno y sus datos. */
  cargando: boolean;
  /** El turno no existe (404). */
  noEncontrado: boolean;
}

export function useTurnoCompleto(turnoId: number): TurnoCompleto {
  const profesionales = useCatalogo<Profesional>("/api/profesionales");
  const practicas = useCatalogo<Practica>("/api/practicas");

  const [datos, setDatos] = useState<{
    turno: Turno | null;
    cliente: Cliente | null;
    mascota: Mascota | null;
  }>({ turno: null, cliente: null, mascota: null });
  const [cargando, setCargando] = useState(true);
  const [noEncontrado, setNoEncontrado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(async () => {
      try {
        const turno = await apiGet<Turno>(`/api/turnos/${turnoId}`);
        const [cliente, mascota] = await Promise.all([
          apiGet<Cliente>(`/api/clientes/${turno.clienteId}`).catch(() => null),
          apiGet<Mascota>(`/api/mascotas/${turno.mascotaId}`).catch(() => null),
        ]);
        if (cancelado) return;
        setDatos({ turno, cliente, mascota });
        setNoEncontrado(false);
      } catch (e) {
        if (cancelado) return;
        // 404 = el turno no existe; cualquier otro fallo se trata igual de cara al usuario.
        setNoEncontrado(e instanceof ApiError ? e.status === 404 : true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }, 0);
    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [turnoId]);

  const directorio = useMemo(() => armarDirectorio(profesionales, practicas), [profesionales, practicas]);
  const { turno } = datos;

  const profesional = turno ? directorio.profesionalPorFranja[turno.agendaProfesionalId] : undefined;
  const practica = turno ? (directorio.practicaPorId[turno.practicaId] ?? null) : null;

  return {
    ...datos,
    practica,
    profesionalDisplay: profesional ? `${profesional.nombre} ${profesional.apellido}` : "—",
    practicaDisplay: practica?.nombre ?? "—",
    cargando,
    noEncontrado,
  };
}
