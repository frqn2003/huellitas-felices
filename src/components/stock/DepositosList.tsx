"use client";

import { Building2, MapPin, Pencil, Warehouse } from "lucide-react";
import type { Deposito, SucursalOpcion } from "@/data/stock";

interface DepositosListProps {
  depositos: Deposito[];
  /** Catálogo real: GET /api/sucursales. Agrupa la lista. */
  sucursales: SucursalOpcion[];
  loading: boolean;
  onEdit: (deposito: Deposito) => void;
  onNew: () => void;
}

export function DepositosList({ depositos, sucursales, loading, onEdit, onNew }: DepositosListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-6" aria-hidden="true">
        {Array.from({ length: 2 }).map((_, s) => (
          <div key={s} className="flex flex-col gap-3">
            <div className="h-5 w-40 animate-pulse rounded bg-cream-100" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, c) => (
                <div
                  key={c}
                  className="flex items-center gap-4 rounded-md border border-border bg-surface p-5 shadow-card"
                >
                  <div className="h-11 w-11 animate-pulse rounded-md bg-cream-100" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-cream-100" />
                    <div className="h-3 w-40 animate-pulse rounded bg-cream-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (depositos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-border bg-surface px-6 py-16 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-md bg-brand-900/10">
          <Building2 className="h-7 w-7 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-brand-900">
            No hay depósitos cargados
          </h3>
          <p className="max-w-sm text-sm text-text-secondary">
            Creá el primer depósito para empezar a organizar el inventario por sucursal.
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="h-11 cursor-pointer rounded-pill border border-brand-900 px-5 text-sm font-bold text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
        >
          Nuevo depósito
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {sucursales.map((sucursal) => {
        const deSucursal = depositos.filter((d) => d.sucursalId === sucursal.id);
        if (deSucursal.length === 0) return null;
        return (
          <section key={sucursal.id} aria-label={`Depósitos de ${sucursal.nombre}`}>
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-900" aria-hidden="true" />
              <h3 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
                Sucursal {sucursal.nombre}
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {deSucursal.map((deposito) => (
                <article
                  key={deposito.id}
                  className="flex items-center gap-4 rounded-md border border-border bg-surface p-5 shadow-card"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-brand-900/10">
                    <Warehouse className="h-5 w-5 text-brand-900" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-bold text-text-primary">{deposito.nombre}</h4>
                    <p className="truncate text-xs text-text-secondary">{deposito.ubicacion}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEdit(deposito)}
                    aria-label={`Editar depósito ${deposito.nombre}`}
                    title="Editar depósito"
                    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-brand-900/10 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
                  >
                    <Pencil className="h-5 w-5" aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}