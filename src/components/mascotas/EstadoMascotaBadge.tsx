"use client";

import type { EstadoCliente } from "@/data/clientes";
import { EstadoClienteBadge } from "@/components/clientes/EstadoClienteBadge";

interface EstadoMascotaBadgeProps {
  estado: EstadoCliente;
}

/**
 * Badge de estado de una mascota (HU-MAS-01). El enum activo/inactivo es el
 * mismo de clientes, así que delega en `EstadoClienteBadge` (mapping único:
 * success=Activo, neutral=Inactivo) — StatusBadge es el único punto de verdad.
 */
export function EstadoMascotaBadge({ estado }: EstadoMascotaBadgeProps) {
  return <EstadoClienteBadge estado={estado} />;
}