"use client";

import { Eye } from "lucide-react";
import { useState } from "react";
import {
  formatearFecha,
  nombreEstado,
  transicionesEstado,
} from "@/data/turnos";
import { Button } from "@/components/ui/Button";
import { ConfirmarDialog, type ConfirmarTone } from "@/components/ui/ConfirmarDialog";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { TurnoRow } from "./TurnosTable";
import { EstadoTurnoBadge } from "./EstadoTurnoBadge";

const RECEPCIONISTA = "Ana Martínez";

interface TurnoDetalleModalProps {
  open: boolean;
  turno: TurnoRow | null;
  onClose: () => void;
  /** HU-TUR-02: callback del cambio de estado (PATCH). Si devuelve false, el
      modal no se cierra (el error ya se mostró como toast por el padre). */
  /**
   * Manda el cambio de estado al backend (PATCH /api/turnos/:id/estado).
   *
   * Devuelve el mensaje de error si el servidor lo rechazó, o `null` si salió
   * bien. Se resuelve así y no con un `throw` para que el modal muestre el
   * motivo —"el turno está Atendido y ese estado es final"— sin cerrarse.
   */
  onCambiarEstado?: (turnoId: number, estadoId: number) => Promise<string | null>;
}

function DatoDetalle({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <span className="text-sm font-bold text-brand-900">{valor}</span>
    </div>
  );
}

function DatoEstado({ estadoId }: { estadoId: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
        Estado
      </span>
      <EstadoTurnoBadge estadoId={estadoId} />
    </div>
  );
}

// Tono del dialog según el nuevo estado: cancelado destruye la reserva
// (danger), confirmar lo avanza (success), el resto es neutro.
function tonoDelEstado(estadoId: number): ConfirmarTone {
  if (estadoId === 3) return "danger";
  if (estadoId === 2) return "success";
  return "neutral";
}

function descripcionDeCambio(turno: TurnoRow, nuevoEstadoId: number): string {
  const base = `¿Desea confirmar el cambio de estado del turno #${String(turno.id).padStart(5, "0")} de ${nombreEstado[turno.estadoId] ?? "desconocido"} a ${nombreEstado[nuevoEstadoId]}?`;
  if (nuevoEstadoId === 3) {
    return `${base} El horario quedará disponible para nuevas reservas.`;
  }
  if (nuevoEstadoId === 5) {
    return `${base} Queda registrado en el historial del cliente para seguimiento.`;
  }
  return base;
}

export function TurnoDetalleModal({
  open,
  turno,
  onClose,
  onCambiarEstado,
}: TurnoDetalleModalProps) {
  const [nuevoEstadoId, setNuevoEstadoId] = useState<string>("");
  const [confirmando, setConfirmando] = useState(false);

  // Reset del select cuando cambia el turno abierto (remount desde el padre con
  // key={detalle?.id} en la agenda, o al reabrir con otro turno en la tabla).
  // Patrón de "ajustar estado al cambiar props" (evita sync en effect).
  const [prevTurnoId, setPrevTurnoId] = useState<number | null>(null);
  if (turno && turno.id !== prevTurnoId) {
    setNuevoEstadoId("");
    setPrevTurnoId(turno.id);
  }

  const transiciones = turno ? transicionesEstado[turno.estadoId] ?? [] : [];
  const esFinal = turno !== null && transiciones.length === 0;
  const puedeGuardar = turno !== null && nuevoEstadoId !== "" && Number(nuevoEstadoId) !== turno.estadoId;

  const [guardando, setGuardando] = useState(false);
  const [errorCambio, setErrorCambio] = useState("");

  const guardarCambio = () => {
    setErrorCambio("");
    if (!turno || !puedeGuardar) return;
    setConfirmando(true);
  };

  const confirmarCambio = async () => {
    if (!turno || !puedeGuardar) return;
    setGuardando(true);
    const error = (await onCambiarEstado?.(turno.id, Number(nuevoEstadoId))) ?? null;
    setGuardando(false);
    setConfirmando(false);

    // Solo se cierra si salió bien: con error, el modal queda abierto con el
    // estado elegido para que la persona vea qué pasó y pueda corregir.
    if (error) setErrorCambio(error);
    else onClose();
  };

  return (
    <Modal
      open={open && turno !== null}
      onClose={onClose}
      title="Detalle del turno"
      icon={<Eye className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-xl"
      footer={
        onCambiarEstado ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Volver
            </Button>
            {!esFinal && (
              <Button
                type="button"
                onClick={guardarCambio}
                disabled={!puedeGuardar || guardando}
              >
                {guardando ? "Guardando…" : "Guardar cambio"}
              </Button>
            )}
          </>
        ) : (
          <Button variant="outline" onClick={onClose}>
            Volver
          </Button>
        )
      }
    >
      {turno && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 rounded-sm border border-border bg-cream-50 p-4 sm:grid-cols-2">
            <DatoDetalle label="Cliente" valor={turno.clienteNombre} />
            <DatoDetalle label="DNI" valor={turno.dni} />
            <DatoDetalle label="Mascota" valor={`${turno.mascotaNombre} · ${turno.especie}`} />
            <DatoDetalle
              label="Fecha y hora"
              valor={`${formatearFecha(turno.fecha)} · ${turno.horaInicio} – ${turno.horaFin}`}
            />
            <DatoDetalle label="Profesional" valor={turno.profesionalNombre} />
            <DatoDetalle
              label="Práctica"
              valor={turno.practicaNombre}
            />
            <DatoEstado estadoId={turno.estadoId} />
          </div>

          {onCambiarEstado && (
            <div className="flex flex-col gap-4 rounded-sm border border-border bg-cream-50 p-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                  Cambiar estado del turno
                </span>
                <p className="text-sm text-text-secondary">
                  Solo se ofrecen las transiciones permitidas por la regla
                  (pendiente → confirmado → atendido | cancelado | no asistió).
                </p>
              </div>

              {errorCambio && (
                <p role="alert" className="text-sm font-semibold text-destructive">
                  {errorCambio}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                    Estado actual
                  </span>
                  <EstadoTurnoBadge estadoId={turno.estadoId} />
                </div>

                {esFinal ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                      Cambiar a
                    </span>
                    <DatoDetalle label="Sin cambios permitidos" valor="Estado final" />
                  </div>
                ) : (
                  <Select
                    label="Cambiar a"
                    value={nuevoEstadoId}
                    onChange={(e) => setNuevoEstadoId(e.target.value)}
                  >
                    <option value="">Seleccionar estado...</option>
                    {transiciones.map((id) => (
                      <option key={id} value={id}>
                        {nombreEstado[id]}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              {/* BACKEND: PATCH /turnos/:id { estado_id } — el backend valida la
                  transición permitida, registra auditoria (UPDATE, tabla='turno',
                  valores_anteriores/nuevos) y refresca la agenda. */}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Creado por
            </span>
            <span className="text-sm font-medium text-text-primary">
              {RECEPCIONISTA} (Recepcionista)
            </span>
            {/* BACKEND: expone turno.fecha_creacion + usuario (quien cargó). */}
            <span className="text-xs text-text-secondary">
              {turno.fechaCreacionHora}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
              Notas
            </span>
            <p className="text-sm text-text-primary">
              {turno.notas || <span className="text-text-secondary">Sin notas</span>}
            </p>
          </div>
        </div>
      )}

      {turno && onCambiarEstado && (
        <ConfirmarDialog
          open={confirmando}
          title="Confirmar nuevo estado"
          description={descripcionDeCambio(turno, Number(nuevoEstadoId))}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
          tone={tonoDelEstado(Number(nuevoEstadoId))}
          onClose={() => setConfirmando(false)}
          onConfirm={() => void confirmarCambio()}
        />
      )}
    </Modal>
  );
}