"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarPlus, Check, ClipboardList, PawPrint, UserCheck } from "lucide-react";
import { useState } from "react";
import type { Cliente } from "@/data/clientes";
import type { Mascota } from "@/data/mascotas";
import {
  formatearFecha,
  generarSlots,
  haySuperposicion,
  horasOcupadas,
  practicas,
  profesionales,
  proximosDiasLaborables,
  sumarMinutos,
  diaSemanaDeFecha,
  RECEPCIONISTA_ID,
  type Turno,
} from "@/data/turnos";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type Paso = 1 | 2 | 3;

const PASOS: { id: Paso; label: string }[] = [
  { id: 1, label: "Cliente y Mascota" },
  { id: 2, label: "Profesional y horario" },
  { id: 3, label: "Resumen" },
];

// Bloqueo de caracteres al tipear (misma clase de bloqueo que el campo nombre
// del formulario de cliente): los caracteres no permitidos se descartan on type.
// Cliente: solo letras y números (se busca por DNI y nombre). Profesional: solo
// letras. En ambos se permite espacio por los nombres compuestos y apellidos.
const SOLO_LETRAS_Y_NUMEROS = /[^a-zA-Z0-9áéíóúüÁÉÍÓÚÜñÑ ]/g;
const SOLO_LETRAS = /[^a-zA-ZáéíóúüÁÉÍÓÚÜñÑ ]/g;
const soloLetrasYNumeros = (v: string) => v.replace(SOLO_LETRAS_Y_NUMEROS, "");
const soloLetras = (v: string) => v.replace(SOLO_LETRAS, "");

interface NuevoTurnoModalProps {
  open: boolean;
  onClose: () => void;
  /** Directorio completo de clientes (Combobox de Paso 1, solo activos). */
  clientes: Cliente[];
  /** Fichas para listar las mascotas activas del cliente (Paso 2). */
  mascotas: Mascota[];
  /** Turnos existentes de la sucursal (para validar disponibilidad). */
  turnos: Turno[];
  /** Se dispara tras el POST simulado con el turno pendiente creado. */
  onCreado: (turno: Turno) => void;
  /** Atajo del empty state de Paso 2: cierra el wizard y lleva a la tab Mascotas. */
  onRegistrarMascota: () => void;
}

function StepperTurnos({ actual }: { actual: Paso }) {
  return (
    <ol
      className="flex items-start gap-2.5"
      aria-label={`Paso ${actual} de ${PASOS.length}: ${PASOS[actual - 1].label}`}
    >
      {PASOS.map((p, i) => {
        const done = p.id < actual;
        const active = p.id === actual;
        return (
          <li key={p.id} className="flex flex-1 items-center gap-2.5 last:flex-none">
            <span
              aria-current={active ? "step" : undefined}
              className={`flex h-9 min-w-9 items-center justify-center rounded-pill text-sm font-extrabold ${
                done
                  ? "bg-brand-900 text-cream-50"
                  : active
                    ? "bg-accent-500 text-brand-900"
                    : "border border-border bg-surface text-text-secondary"
              }`}
            >
              {done ? <Check className="h-5 w-5" aria-hidden="true" /> : p.id}
            </span>
            <span
              className={`text-sm font-bold leading-tight ${
                active ? "text-brand-900" : "text-text-secondary"
              }${i === PASOS.length - 1 ? " hidden sm:inline" : ""}`}
            >
              {p.label}
            </span>
            {i < PASOS.length - 1 && (
              <span className="h-0.5 min-w-4 flex-1 bg-border" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function chipStyle(selected: boolean, disabled = false) {
  const base =
    "h-11 cursor-pointer rounded-pill border px-4 text-sm font-bold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-45";
  const look = selected
    ? "border-brand-900 bg-brand-900 text-cream-50"
    : "border-border bg-surface text-text-primary hover:bg-brand-900/5";
  return `${base} ${disabled ? "" : look}`;
}

export function NuevoTurnoModal({
  open,
  onClose,
  clientes,
  mascotas,
  turnos,
  onCreado,
  onRegistrarMascota,
}: NuevoTurnoModalProps) {
  const reduceMotion = useReducedMotion();

  const [paso, setPaso] = useState<Paso>(1);
  const [clienteId, setClienteId] = useState("");
  const [mascotaId, setMascotaId] = useState<number | null>(null);
  const [profesionalId, setProfesionalId] = useState<number | null>(null);
  const [practicaId, setPracticaId] = useState("");
  const [fecha, setFecha] = useState("");
  const [franjaId, setFranjaId] = useState<number | null>(null);
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [errorDisponibilidad, setErrorDisponibilidad] = useState("");

  const clienteSeleccionado = clientes.find((c) => c.id === Number(clienteId));
  const mascotasDelCliente = mascotas.filter(
    (m) => m.clienteId === Number(clienteId) && m.estado === "activo",
  );
  const mascotaSeleccionada = mascotasDelCliente.find((m) => m.id === mascotaId) ?? null;
  const profesional = profesionales.find((p) => p.id === profesionalId) ?? null;
  const practica = practicas.find((p) => p.id === Number(practicaId)) ?? null;
  // Todos los profesionales realizan todas las prácticas (sin restricción por
  // profesional). BACKEND: poblar desde GET /api/practicas.
  const practicasDisponibles = practicas;

  // Próximos días (desde mañana) en los que el profesional toma turnos.
  // Cálculo directo: las franjas son listas chicas y `profesional` se deriva
  // de un find (el React Compiler descarta memo manual sobre ese objeto).
  const fechasLaborables = profesional ? proximosDiasLaborables(profesional.franjas) : [];

  const franjasDelDia = profesional && fecha
    ? profesional.franjas.filter((f) => f.diaSemana === diaSemanaDeFecha(fecha))
    : [];

  const franja = profesional?.franjas.find((f) => f.id === franjaId) ?? null;

  // Horarios de inicio discretos cada 15 min, recortados por la duración de la
  // práctica; los ocupados (turnos no cancelados del profesional en la fecha)
  // quedan deshabilitados (anti-solapamiento). Cálculo directo por render:
  // `franja`/`practica` se derivan de find (el React Compiler descarta el memo).
  const slots =
    franja && practica
      ? generarSlots(franja, practica.duracionMinutos, horasOcupadas(turnos, franja.id, fecha))
      : [];

  // Opciones del buscador: label compuesto para filtrar por substring (Combobox
  // de ui/ matchea DNI y nombre).
  const clienteOptions = clientes
    .filter((c) => c.estado === "activo")
    .map((c) => ({ value: String(c.id), label: `${c.documento} · ${c.nombre} ${c.apellido}` }));
  const profesionalOptions = profesionales.map((p) => ({
    value: String(p.id),
    label: `${p.nombre} ${p.apellido}`,
  }));

  const puedeContinuar =
    (paso === 1 && clienteId !== "" && mascotaId !== null) ||
    (paso === 2 &&
      Boolean(profesionalId && practicaId !== "" && fecha && franjaId !== null && hora));

  const elegirCliente = (value: string) => {
    setClienteId(value);
    setMascotaId(null);
  };

  const continuar = () => {
    if (!puedeContinuar) return;
    setPaso((p) => (p + 1) as Paso);
  };

  const elegirProfesional = (id: number | null) => {
    setProfesionalId(id);
    setPracticaId("");
    setFecha("");
    setFranjaId(null);
    setHora("");
    setErrorDisponibilidad("");
  };

  const elegirPractica = (value: string) => {
    setPracticaId(value);
    setFranjaId(null);
    setHora("");
    setErrorDisponibilidad("");
  };

  const elegirFecha = (iso: string) => {
    setFecha(iso);
    setFranjaId(null);
    setHora("");
    setErrorDisponibilidad("");
  };

  const elegirFranja = (id: number) => {
    setFranjaId(id);
    setHora("");
    setErrorDisponibilidad("");
  };

  const crear = () => {
    if (!franja || !practica || !mascotaSeleccionada) return;
    const nuevo: Turno = {
      id: 0, // ← el id real lo genera la base en el POST
      clienteId: Number(clienteId),
      mascotaId: mascotaSeleccionada.id,
      sucursalId: 1, // la deriva el backend desde agenda_profesional
      agendaProfesionalId: franja.id,
      practicaId: practica.id,
      estadoId: 1, // pendiente (requiere confirmación del profesional, HU futura)
      fecha,
      horaInicio: hora,
      horaFin: sumarMinutos(hora, practica.duracionMinutos),
      notas: notas.trim() || null,
      usuarioId: RECEPCIONISTA_ID,
      fechaCreacion: new Date().toISOString(),
    };
    // BACKEND: POST /turnos con el draft { cliente_id, mascota_id,
    // agenda_profesional_id, practica_id, fecha, hora_inicio, hora_fin, notas };
    // el backend deriva sucursal_id y estado_id (pendiente) y registra el INSERT
    // en auditoria (tabla='turno', operacion='INSERT', usuario_id, valores_nuevos).
    if (haySuperposicion(nuevo, turnos)) {
      setConfirmando(false);
      setGuardando(false);
      setErrorDisponibilidad(
        "El profesional ya tiene un turno en ese horario. Elegí otra hora o franja.",
      );
      setPaso(2);
      return;
    }
    setGuardando(false);
    onCreado(nuevo);
  };

  const pasoComponentes = (
    <>
      {paso === 1 && (
        <div className="flex flex-col gap-4">
          {/* BACKEND: GET /api/clientes (clientes activos para titular). */}
          <Combobox
            id="tur-cliente"
            label="Cliente"
            requiredMark
            value={clienteId}
            options={clienteOptions}
            onChange={elegirCliente}
            placeholder="Buscar por DNI o nombre"
            noResultsText="Sin clientes que coincidan"
            maxResults={20}
            sanitize={soloLetrasYNumeros}
          />
          {clienteSeleccionado && (
            <p className="rounded-sm bg-cream-50 px-4 py-3 text-sm font-medium text-text-secondary">
              <span className="font-bold text-brand-900">
                {`${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`}
              </span>{" "}
              · DNI {clienteSeleccionado.documento}
            </p>
          )}

          {clienteSeleccionado &&
            (mascotasDelCliente.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-sm border border-border bg-surface px-6 py-10 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-md bg-brand-900/10">
                  <PawPrint className="h-6 w-6 text-brand-900" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-base font-extrabold uppercase tracking-tight text-brand-900">
                    Este cliente no tiene mascotas activas
                  </h3>
                  <p className="max-w-sm text-sm text-text-secondary">
                    Registrá la mascota en la tab Mascotas y volvé a crear el turno.
                  </p>
                </div>
                <Button variant="secondary" onClick={onRegistrarMascota}>
                  Registrar mascota
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-text-primary">
                  Mascota<span className="text-destructive"> *</span>
                </p>
                <ul className="flex flex-col gap-2" aria-label="Mascotas del cliente">
                  {mascotasDelCliente.map((m) => {
                    const selected = m.id === mascotaId;
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => setMascotaId(m.id)}
                          aria-pressed={selected}
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 ${
                            selected
                              ? "border-brand-900 bg-brand-900/5"
                              : "border-border bg-surface hover:bg-cream-50/60"
                          }`}
                        >
                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2 ${
                              selected ? "border-brand-900 bg-brand-900" : "border-border"
                            }`}
                            aria-hidden="true"
                          >
                            {selected && <Check className="h-3 w-3 text-cream-50" />}
                          </span>
                          <span className="flex flex-col gap-0.5">
                            <span className="text-sm font-bold text-brand-900">{m.nombre}</span>
                            <span className="text-xs font-medium text-text-secondary">
                              {m.especie}
                              {m.raza ? ` · ${m.raza}` : ""}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ))}
        </div>
      )}

      {paso === 2 && (
        <div className="flex flex-col gap-4">
          {/* BACKEND: GET /api/profesionales. */}
          <Combobox
            id="tur-profesional"
            label="Profesional"
            requiredMark
            value={profesionalId ? String(profesionalId) : ""}
            options={profesionalOptions}
            onChange={(v) => elegirProfesional(v ? Number(v) : null)}
            placeholder="Buscar por nombre"
            noResultsText="Sin profesionales que coincidan"
            maxResults={20}
            sanitize={soloLetras}
          />

          <Select
            id="tur-practica"
            label="Práctica"
            requiredMark
            value={practicaId}
            onChange={(e) => elegirPractica(e.target.value)}
            disabled={!profesional}
            hint={
              profesional
                ? `Según ${profesional.nombre} ${profesional.apellido}`
                : "Elegí primero el profesional"
            }
          >
            {/* BACKEND: poblar desde GET /api/practicas. */}
            <option value="" disabled>
              Seleccionar práctica
            </option>
            {practicasDisponibles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.duracionMinutos} min)
              </option>
            ))}
          </Select>

          {profesional && practica && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-text-primary">Fecha</p>
              <ul className="flex flex-col gap-2" aria-label="Fechas disponibles">
                {fechasLaborables.map((d) => {
                  const selected = d.fecha === fecha;
                  const franjasDia = profesional.franjas.filter(
                    (f) => f.diaSemana === diaSemanaDeFecha(d.fecha),
                  );
                  return (
                    <li key={d.fecha}>
                      <button
                        type="button"
                        onClick={() => elegirFecha(d.fecha)}
                        aria-pressed={selected}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-md border px-4 py-3 text-left transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 ${
                          selected
                            ? "border-brand-900 bg-brand-900/5"
                            : "border-border bg-surface hover:bg-cream-50/60"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border-2 ${
                            selected ? "border-brand-900 bg-brand-900" : "border-border"
                          }`}
                          aria-hidden="true"
                        >
                          {selected && <Check className="h-3 w-3 text-cream-50" />}
                        </span>
                        <span className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-brand-900">
                            {d.label.charAt(0).toUpperCase() + d.label.slice(1)}
                          </span>
                          <span className="text-xs font-medium text-text-secondary">
                            {franjasDia.map((f) => `${f.horaInicio}–${f.horaFin}`).join(" · ")}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {fecha && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-text-primary">Franja del profesional</p>
              {franjasDelDia.length === 0 ? (
                <p className="text-sm font-medium text-text-secondary">
                  El profesional no atiende ese día.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2" aria-label="Franjas disponibles">
                  {franjasDelDia.map((f) => {
                    const selected = f.id === franjaId;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => elegirFranja(f.id)}
                        aria-pressed={selected}
                        className={chipStyle(selected)}
                      >
                        {f.horaInicio} – {f.horaFin}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {franja && practica && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-text-primary">
                Hora de inicio
                <span className="ml-2 font-medium text-text-secondary">
                  (práctica de {practica.duracionMinutos} min)
                </span>
              </p>
              {slots.length === 0 ? (
                <p className="rounded-sm border border-status-warning/40 bg-status-warning/10 px-4 py-3 text-sm font-semibold text-status-warning-strong">
                  La franja {franja.horaInicio}–{franja.horaFin} no admite una práctica de{" "}
                  {practica.duracionMinutos} min. Elegí otra franja o práctica.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2" aria-label="Horarios disponibles">
                  {slots.map((s) => (
                    <button
                      key={s.hora}
                      type="button"
                      onClick={() => {
                        if (s.ocupado) return;
                        setHora(s.hora);
                        setErrorDisponibilidad("");
                      }}
                      aria-pressed={s.hora === hora}
                      disabled={s.ocupado}
                      className={chipStyle(s.hora === hora, s.ocupado)}
                      title={s.ocupado ? "Ocupado" : `Iniciar a las ${s.hora}`}
                    >
                      {s.hora}
                      {s.ocupado ? " · Ocupado" : ""}
                    </button>
                  ))}
                </div>
              )}
              {errorDisponibilidad && (
                <p role="alert" className="text-sm font-semibold text-destructive">
                  {errorDisponibilidad}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {paso === 3 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-sm border border-border bg-cream-50 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                  Cliente
                </span>
                <span className="text-sm font-bold text-brand-900">
                  {clienteSeleccionado
                    ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}`
                    : ""}
                </span>
                <span className="text-xs text-text-secondary">
                  DNI {clienteSeleccionado?.documento}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                  Mascota
                </span>
                <span className="text-sm font-bold text-brand-900">
                  {mascotaSeleccionada?.nombre}
                </span>
                <span className="text-xs text-text-secondary">
                  {mascotaSeleccionada?.especie}
                  {mascotaSeleccionada?.raza ? ` · ${mascotaSeleccionada.raza}` : ""}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                  Profesional
                </span>
                <span className="text-sm font-bold text-brand-900">
                  {profesional ? `${profesional.nombre} ${profesional.apellido}` : ""}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                  Fecha y hora
                </span>
                <span className="text-sm font-bold text-brand-900">
                  {fecha ? formatearFecha(fecha) : ""}
                </span>
                <span className="text-xs text-text-secondary">
                  {hora && practica
                    ? `${hora} – ${sumarMinutos(hora, practica.duracionMinutos)} · ${practica.nombre} (${practica.duracionMinutos} min)`
                    : ""}
                </span>
              </div>
            </div>
          </div>

          <Textarea
            id="tur-notas"
            label="Notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            hint="Opcional"
            placeholder="Control anual, recordatorios, anotaciones..."
          />

          <p className="rounded-sm bg-status-info/10 px-4 py-3 text-sm font-medium text-status-info-strong">
            El turno se crea en estado <span className="font-bold">pendiente</span> y queda
            visible de inmediato en la agenda del profesional.
          </p>
        </div>
      )}
    </>
  );

  const iconoPaso =
    paso === 1 ? (
      <UserCheck className="h-5 w-5 text-brand-900" aria-hidden="true" />
    ) : paso === 2 ? (
      <CalendarPlus className="h-5 w-5 text-brand-900" aria-hidden="true" />
    ) : (
      <ClipboardList className="h-5 w-5 text-brand-900" aria-hidden="true" />
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo turno"
      icon={iconoPaso}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          {paso > 1 && (
            <Button
              variant="ghost"
              onClick={() => setPaso((p) => (p - 1) as Paso)}
              disabled={guardando}
            >
              Atrás
            </Button>
          )}
          {paso < 3 ? (
            <Button type="button" onClick={continuar} disabled={!puedeContinuar || guardando}>
              Continuar
            </Button>
          ) : (
            <Button type="button" onClick={() => setConfirmando(true)} disabled={guardando}>
              Crear turno
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <StepperTurnos actual={paso} />
        <AnimatePresence mode="wait">
          <motion.div
            key={paso}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
            className="flex min-h-[460px] flex-col gap-4"
          >
            {pasoComponentes}
          </motion.div>
        </AnimatePresence>
      </div>

      <ConfirmarDialog
        open={confirmando}
        title="Confirmar turno"
        description={`¿Desea confirmar la creación del turno para ${mascotaSeleccionada?.nombre ?? "la mascota"} el ${
          fecha ? formatearFecha(fecha) : ""
        } a las ${hora}?`}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onClose={() => setConfirmando(false)}
        onConfirm={() => {
          setConfirmando(false);
          setGuardando(true);
          void crear();
        }}
      />
    </Modal>
  );
}