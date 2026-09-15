"use client";

import { Edit2, Eye, PawPrint, UserRound } from "lucide-react";
import type { Cliente } from "@/data/clientes";
import type { Mascota } from "@/data/mascotas";
import { EstadoMascotaBadge } from "./EstadoMascotaBadge";
import { SexoBadge } from "./SexoBadge";

interface MascotasTableProps {
  mascotas: Mascota[];
  /** Mapa de clientes por id (resuelve el dueño de cada mascota para el aria-label). */
  clientePorId?: Record<number, Cliente>;
  loading?: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onNuevo: () => void;
  onVer: (mascota: Mascota) => void;
  onVerDueno: (mascota: Mascota) => void;
  onEditar: (mascota: Mascota) => void;
}

const HEADERS = ["Id", "Nombre", "Especie", "Raza", "Sexo", "Edad", "DNI dueño", "Estado", "Acciones"];

// Edad calculada desde fecha_nacimiento (esquema: date nullable). El recepcionista
// la necesita para vacunas y clasificación cachorro/adulto sin abrir la ficha.
function formatearEdad(fechaNacimiento: string | null): string {
  if (!fechaNacimiento) return "—";
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`);
  if (Number.isNaN(nacimiento.getTime())) return "—";
  const hoy = new Date();
  let meses =
    (hoy.getFullYear() - nacimiento.getFullYear()) * 12 +
    (hoy.getMonth() - nacimiento.getMonth());
  if (hoy.getDate() < nacimiento.getDate()) meses -= 1;
  if (meses < 0) return "—";
  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anios === 0) return resto <= 0 ? "menos de 1 mes" : `${resto} meses`;
  if (resto === 0) return `${anios} ${anios === 1 ? "año" : "años"}`;
  return `${anios} ${anios === 1 ? "año" : "años"} ${resto} ${resto === 1 ? "mes" : "meses"}`;
}

export function MascotasTable({
  mascotas,
  clientePorId = {},
  loading = false,
  hasActiveFilters,
  onClearFilters,
  onNuevo,
  onVer,
  onVerDueno,
  onEditar,
}: MascotasTableProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
        <div className="hidden grid-cols-9 gap-4 border-b border-border bg-cream-50 px-4 py-3 lg:grid">
          {HEADERS.map((h) => (
            <span key={h} className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
              {h}
            </span>
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/60 px-4 py-3 last:border-b-0"
            aria-hidden="true"
          >
            <div className="h-4 w-10 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-24 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-16 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-cream-100" />
            <div className="h-4 w-16 animate-pulse rounded bg-cream-100" />
            <div className="h-6 w-24 animate-pulse rounded-pill bg-cream-100" />
            <div className="ml-auto flex gap-1 lg:ml-0">
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
              <div className="h-11 w-11 animate-pulse rounded-pill bg-cream-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (mascotas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <PawPrint className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            {hasActiveFilters ? "Sin resultados" : "No hay mascotas registradas"}
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            {hasActiveFilters
              ? "No hay mascotas que coincidan con la búsqueda o los filtros aplicados."
              : "Registrá tu primera mascota asociada a un cliente para tener su ficha completa."}
          </p>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="h-11 cursor-pointer rounded-pill border border-brand-900 px-5 text-sm font-bold text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
          >
            Limpiar filtros
          </button>
        ) : (
          <button
            type="button"
            onClick={onNuevo}
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-pill bg-accent-500 px-6 text-base font-bold text-brand-900 transition-all duration-fast ease-out hover:bg-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Nueva mascota
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-surface shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] border-collapse text-left">
          <caption className="sr-only">
            Listado de mascotas con su especie, raza, sexo, edad, DNI del dueño y estado, y acciones para ver, ver el dueño y editar
          </caption>
          <thead>
            <tr className="border-b border-border bg-cream-50">
              {HEADERS.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-4 py-3 text-xs font-extrabold uppercase tracking-wide text-text-secondary"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mascotas.map((m) => {
              const activa = m.estado === "activo";
              const dueno = clientePorId[m.clienteId];
              const nombreDueno = dueno ? `${dueno.nombre} ${dueno.apellido}` : "Dueño no encontrado";
              return (
                <tr
                  key={m.id}
                  className="border-b border-border/60 transition-colors duration-fast ease-out last:border-b-0 hover:bg-cream-50/60"
                >
                  <td className="px-4 py-3 text-sm text-text-primary">{m.id}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-brand-900">{m.nombre}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-text-primary">{m.especie}</td>
                  <td className="px-4 py-3 text-sm text-text-primary">{m.raza ?? "—"}</td>
                  <td className="px-4 py-3">
                    <SexoBadge sexo={m.sexo} />
                  </td>
                  <td className="px-4 py-3 text-sm text-text-secondary">{formatearEdad(m.fechaNacimiento)}</td>
                  {/* BACKEND: documento del cliente titular. Viene resuelto desde el
                      mapa clientePorId (GET /api/clientes/:id/mascotas o JOIN en
                      GET /api/mascotas con la tabla cliente). */}
                  <td className="px-4 py-3 text-sm text-text-primary tabular-nums">
                    {clientePorId[m.clienteId]?.documento ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoMascotaBadge estado={m.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onVer(m)}
                        aria-label={`Ver detalles de ${m.nombre}`}
                        title="Ver detalles"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <Eye className="h-5 w-5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onVerDueno(m)}
                        aria-label={`Ver dueño de ${m.nombre} (${nombreDueno})`}
                        title="Ver dueño"
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                      >
                        <UserRound className="h-5 w-5" aria-hidden="true" />
                      </button>

                      {activa && (
                        <button
                          type="button"
                          onClick={() => onEditar(m)}
                          aria-label={`Editar mascota ${m.nombre}`}
                          title="Editar mascota"
                          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                        >
                          <Edit2 className="h-5 w-5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}