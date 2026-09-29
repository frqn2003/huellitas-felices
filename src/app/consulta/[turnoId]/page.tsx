"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Download,
  Lock,
  MessageSquarePlus,
  PawPrint,
  Pill,
  Plus,
  Thermometer,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, use, useMemo, useState } from "react";
import { motion } from "framer-motion";

import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/Button";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import { EstadoTurnoBadge } from "@/components/turnos/EstadoTurnoBadge";
import { InsumoRow } from "@/components/clinica/InsumoRow";
import { NotaConsultaModal } from "@/components/clinica/NotaConsultaModal";
import { descargarPdfConsulta } from "@/lib/generarPdfConsulta";

import {
  articulosActivos,
  guardarConsulta,
  obtenerConsultaPorTurno,
  CONSULTA_DRAFT_VACIO,
  SIMULAR_ERROR,
  type Consulta,
  type ConsultaDraft,
  type ConsultaInsumo,
  type NotaConsulta,
} from "@/data/consultas";
import { turnosIniciales, profesionalPorFranja, practicaPorId } from "@/data/turnos";
import { clientesIniciales } from "@/data/clientes";
import { mascotasIniciales } from "@/data/mascotas";

// ── Helpers de formato ─────────────────────────────────────────────────────────

function formatFecha(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatHoraMin(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Sub-componentes de UI internos ─────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-surface shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <span className="text-brand-700">{icon}</span>
        <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-brand-900">
          {title}
        </h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function DatoDetalle({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <span className="text-sm font-bold text-brand-900">{valor}</span>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="w-36 shrink-0 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      <span className="text-sm font-semibold text-text-primary">{value || "—"}</span>
    </div>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────────────────

function ConsultaPageContent({ turnoId }: { turnoId: number }) {
  const router = useRouter();
  const { showToast } = useToast();

  // ── Resolver datos del turno ──────────────────────────────────────────────
  const turno = useMemo(
    () => turnosIniciales.find((t) => t.id === turnoId) ?? null,
    [turnoId],
  );

  const cliente = useMemo(
    () => (turno ? clientesIniciales.find((c) => c.id === turno.clienteId) ?? null : null),
    [turno],
  );

  const mascota = useMemo(
    () => (turno ? mascotasIniciales.find((m) => m.id === turno.mascotaId) ?? null : null),
    [turno],
  );

  const profesionalDisplay = useMemo(() => {
    if (!turno) return "—";
    const pf = profesionalPorFranja[turno.agendaProfesionalId];
    return pf ? `${pf.nombre} ${pf.apellido}` : "—";
  }, [turno]);

  const practicaDisplay = useMemo(() => {
    if (!turno) return "—";
    return practicaPorId[turno.practicaId]?.nombre ?? "—";
  }, [turno]);

  // ── Resolver consulta existente ───────────────────────────────────────────
  const [consulta, setConsulta] = useState<Consulta | null>(() =>
    obtenerConsultaPorTurno(turnoId),
  );

  // Si consulta existe y está cerrada: modo lectura.
  const esCerrada = consulta?.estado === "cerrada";

  // ── Estado del formulario (solo modo edición) ─────────────────────────────
  const [draft, setDraft] = useState<ConsultaDraft>({
    ...CONSULTA_DRAFT_VACIO,
    motivoConsulta: consulta?.motivoConsulta ?? "",
    diagnostico: consulta?.diagnostico ?? "",
    tratamiento: consulta?.tratamiento ?? "",
    estadoFisicoGeneral: consulta?.estadoFisicoGeneral ?? "",
    temperatura: consulta?.temperatura != null ? String(consulta.temperatura) : "",
    frecuenciaCardiaca:
      consulta?.frecuenciaCardiaca != null ? String(consulta.frecuenciaCardiaca) : "",
    pesoMomento: consulta?.pesoMomento != null ? String(consulta.pesoMomento) : "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof ConsultaDraft, boolean>>>({});
  const [insumos, setInsumos] = useState<ConsultaInsumo[]>(consulta?.insumos ?? []);

  // ── Estado de añadir insumo ───────────────────────────────────────────────
  const [insumoSeleccionado, setInsumoSeleccionado] = useState("");
  const [insumoCantidad, setInsumoCantidad] = useState("");
  const [insumoError, setInsumoError] = useState("");

  // ── Artículos disponibles (excluye ya agregados) ──────────────────────────
  const articulosDisponibles = useMemo(
    () => articulosActivos.filter((a) => !insumos.some((i) => i.articuloId === a.id)),
    [insumos],
  );

  const articuloOptions: ComboboxOption[] = articulosDisponibles.map((a) => ({
    value: String(a.id),
    label: `${a.nombre} (${a.codigo})`,
  }));

  function handleAgregarInsumo() {
    setInsumoError("");
    const id = Number(insumoSeleccionado);
    const cant = parseFloat(insumoCantidad);
    if (!id) {
      setInsumoError("Seleccioná un artículo.");
      return;
    }
    if (isNaN(cant) || cant <= 0) {
      setInsumoError("La cantidad debe ser mayor a 0.");
      return;
    }
    if (insumos.some((i) => i.articuloId === id)) {
      setInsumoError("Este artículo ya fue agregado.");
      return;
    }
    const art = articulosActivos.find((a) => a.id === id);
    if (!art) return;

    const nuevo: ConsultaInsumo = {
      id: Date.now(), // temp id hasta que el back lo asigne
      consultaId: consulta?.id ?? 0,
      articuloId: art.id,
      codigo: art.codigo,
      nombre: art.nombre,
      unidadMedida: art.unidadMedida,
      cantidad: cant,
    };
    setInsumos((prev) => [...prev, nuevo]);
    setInsumoSeleccionado("");
    setInsumoCantidad("");
  }

  function handleQuitarInsumo(articuloId: number) {
    setInsumos((prev) => prev.filter((i) => i.articuloId !== articuloId));
  }

  // ── Validaciones ──────────────────────────────────────────────────────────
  const errores: Partial<Record<keyof ConsultaDraft, string>> = {};
  if (touched.motivoConsulta && !draft.motivoConsulta.trim())
    errores.motivoConsulta = "El motivo de consulta es obligatorio.";
  if (touched.diagnostico && !draft.diagnostico.trim())
    errores.diagnostico = "El diagnóstico es obligatorio.";

  const puedeGuardar =
    draft.motivoConsulta.trim() !== "" && draft.diagnostico.trim() !== "";

  // ── Confirmación finalizar ────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  // ── Confirmación cancelar con datos ──────────────────────────────────────
  const [cancelarOpen, setCancelarOpen] = useState(false);

  function handleAtras() {
    const tieneDatos =
      draft.motivoConsulta || draft.diagnostico || draft.tratamiento || insumos.length > 0;
    if (!esCerrada && tieneDatos) {
      setCancelarOpen(true);
    } else {
      router.push("/consulta");
    }
  }

  function handleFinalizar() {
    // Marcar todos los obligatorios como tocados
    setTouched({ motivoConsulta: true, diagnostico: true });
    if (!puedeGuardar) return;
    setConfirmOpen(true);
  }

  function handleConfirmarFinalizar() {
    setFinalizando(true);
    // BACKEND: PATCH /api/consultas/:id/cerrar + PATCH /api/mascotas/:id { peso } si aplica
    setTimeout(() => {
      const ahora = new Date().toISOString();
      const nueva: Consulta = {
        id: consulta?.id ?? Date.now(),
        turnoId,
        profesionalId: 3,
        turnoFecha: turno?.fecha ?? "",
        turnoHoraInicio: turno?.horaInicio ?? "",
        turnoHoraFin: turno?.horaFin ?? "",
        clienteId: cliente?.id ?? 0,
        clienteNombre: `${cliente?.nombre ?? ""} ${cliente?.apellido ?? ""}`.trim(),
        clienteDni: cliente?.documento ?? "",
        mascotaId: mascota?.id ?? 0,
        mascotaNombre: mascota?.nombre ?? "",
        mascotaEspecie: mascota?.especie ?? "",
        mascotaRaza: mascota?.raza ?? null,
        mascotaSexo: mascota?.sexo ?? "",
        mascotaPesoAnterior: mascota?.peso ?? null,
        profesionalNombre: profesionalDisplay,
        practicaNombre: practicaDisplay,
        motivoConsulta: draft.motivoConsulta.trim(),
        diagnostico: draft.diagnostico.trim(),
        tratamiento: draft.tratamiento.trim() || null,
        estadoFisicoGeneral: draft.estadoFisicoGeneral.trim() || null,
        temperatura: draft.temperatura ? parseFloat(draft.temperatura) : null,
        frecuenciaCardiaca: draft.frecuenciaCardiaca
          ? parseInt(draft.frecuenciaCardiaca)
          : null,
        pesoMomento: draft.pesoMomento ? parseFloat(draft.pesoMomento) : null,
        estado: "cerrada",
        fechaHoraApertura: ahora,
        fechaHoraCierre: ahora,
        insumos,
        notas: [],
      };
      setConsulta(nueva);
      guardarConsulta(nueva);
      setConfirmOpen(false);
      setFinalizando(false);
      showToast("success", "Consulta registrada. Paciente derivado a mostrador.");
      setTimeout(() => router.push("/consulta"), 1500);
    }, 600);
  }

  // ── Notas aclaratorias ────────────────────────────────────────────────────
  const [notaOpen, setNotaOpen] = useState(false);
  const [notas, setNotas] = useState<NotaConsulta[]>(consulta?.notas ?? []);

  function handleGuardarNota(texto: string) {
    // BACKEND: POST /api/consultas/:id/notas { nota, profesional_id }
    const nueva: NotaConsulta = {
      id: Date.now(),
      consultaId: consulta?.id ?? 0,
      profesionalId: 3,
      profesional: profesionalDisplay,
      nota: texto,
      fechaHora: new Date().toISOString(),
    };
    const listaActualizada = [...notas, nueva];
    setNotas(listaActualizada);
    if (consulta) {
      const conNotas: Consulta = { ...consulta, notas: listaActualizada };
      setConsulta(conNotas);
      guardarConsulta(conNotas);
    }
    setNotaOpen(false);
    showToast("success", "Nota agregada correctamente.");
  }

  // Generación nativa de Historia Clínica en PDF (Pet Bliss Style)
  function handleDescargarPdf() {
    if (!turno) return;
    descargarPdfConsulta({
      turnoId,
      consultaId: consulta?.id,
      fecha: formatFecha(turno.fecha),
      hora: `${turno.horaInicio} – ${turno.horaFin}`,
      estado: esCerrada ? "cerrada" : "abierta",
      profesionalNombre: profesionalDisplay,
      practicaNombre: practicaDisplay,
      clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : "—",
      clienteDni: cliente?.documento,
      clienteTelefono: cliente?.telefono,
      mascotaNombre: mascota?.nombre || "—",
      mascotaEspecie: mascota?.especie || "—",
      mascotaRaza: mascota?.raza,
      mascotaSexo: mascota?.sexo,
      mascotaPesoAnterior: mascota?.peso,
      temperatura: esCerrada
        ? consulta?.temperatura
        : draft.temperatura
          ? parseFloat(draft.temperatura)
          : null,
      frecuenciaCardiaca: esCerrada
        ? consulta?.frecuenciaCardiaca
        : draft.frecuenciaCardiaca
          ? parseInt(draft.frecuenciaCardiaca)
          : null,
      pesoMomento: esCerrada
        ? consulta?.pesoMomento
        : draft.pesoMomento
          ? parseFloat(draft.pesoMomento)
          : null,
      estadoFisicoGeneral: esCerrada
        ? consulta?.estadoFisicoGeneral
        : draft.estadoFisicoGeneral || null,
      motivoConsulta: esCerrada
        ? consulta?.motivoConsulta || "—"
        : draft.motivoConsulta || "Consulta clínica",
      diagnostico: esCerrada
        ? consulta?.diagnostico || "—"
        : draft.diagnostico || "En evaluación",
      tratamiento: esCerrada ? consulta?.tratamiento : draft.tratamiento,
      insumos: (esCerrada ? (consulta?.insumos ?? []) : insumos).map((i) => ({
        codigo: i.codigo,
        nombre: i.nombre,
        unidad: i.unidadMedida,
        cantidad: i.cantidad,
      })),
      notas: (esCerrada ? notas : []).map((n) => ({
        profesional: n.profesional,
        fechaHora: formatHoraMin(n.fechaHora),
        nota: n.nota,
      })),
    });
  }

  // ── Estados de pantalla ───────────────────────────────────────────────────
  if (SIMULAR_ERROR) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-50">
        <div className="rounded-md border border-border bg-surface p-8 text-center shadow-card">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" aria-hidden="true" />
          <p className="text-sm font-semibold text-text-primary">
            Error al cargar la consulta. Intentá nuevamente.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push("/consulta")}
          >
            Volver a Clínica
          </Button>
        </div>
      </div>
    );
  }

  if (!turno) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream-50">
        <div className="rounded-md border border-border bg-surface p-8 text-center shadow-card">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-text-secondary" aria-hidden="true" />
          <p className="text-sm font-semibold text-text-primary">
            No se encontró el turno #{turnoId}.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push("/consulta")}
          >
            Volver a Clínica
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-cream-50">
      <style>{`
        @media print {
          @page {
            margin-top: 5.5mm;
            margin-bottom: 5.5mm;
          }
        }
      `}</style>
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-10 lg:py-8 print:p-0 print:py-[5.5mm] print:overflow-visible" id="main-content">
        {/* ── Encabezado para impresión (solo visible en @media print) ── */}
        <div className="hidden items-center justify-between border-b-2 border-brand-900 pb-4 mb-6 print:flex">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-900 text-cream-50">
              <PawPrint className="h-6 w-6 text-cream-50" aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900">
                Huellitas Felices
              </h1>
              <p className="text-xs font-semibold text-text-secondary">Sistema de Gestión Veterinaria · Ficha Médica</p>
            </div>
          </div>
          <div className="text-right text-xs text-text-secondary">
            <p className="font-bold text-sm text-text-primary">Registro de Consulta Médica</p>
            <p>Turno #{turno.id} · {formatFecha(turno.fecha)} · {turno.horaInicio} hs</p>
            <p className="mt-0.5 font-bold text-brand-900">
              {esCerrada ? "Estado: Consulta Cerrada" : "Estado: En Progreso"}
            </p>
          </div>
        </div>

        {/* ── Encabezado ─── */}
        <div className="mb-6 flex flex-col gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAtras}
              className="inline-flex h-10 items-center gap-2 rounded-pill border border-border bg-surface px-4 text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors duration-fast ease-out hover:border-brand-900 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver a Clínica
            </button>
            <span className="text-xs font-bold text-text-secondary">/</span>
            <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Atención Clínica
            </span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-brand-900">
                Registro de Consulta Médica
              </h1>
              <p className="text-sm text-text-secondary">
                Turno #{turno.id} · {formatFecha(turno.fecha)} · {turno.horaInicio} – {turno.horaFin}
              </p>
            </div>

            {/* Botones de acción en la cabecera */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {esCerrada && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(`/turnos/${turnoId}/pago`)}
                  className="shadow-xs font-bold"
                >
                  <CircleDollarSign className="h-4 w-4 mr-1.5" aria-hidden="true" />
                  Cobrar en mostrador
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDescargarPdf}
                className="bg-surface shadow-xs hover:bg-cream-100"
              >
                <Download className="h-4 w-4 text-brand-900" aria-hidden="true" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Banner "cerrada" con acceso a mostrador (HU-VTA-01) */}
        {esCerrada && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex flex-col gap-3 rounded-md border border-status-warning bg-status-warning/10 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 shrink-0 text-status-warning-strong" aria-hidden="true" />
              <p className="text-sm font-semibold text-status-warning-strong">
                Esta consulta está cerrada. Paciente derivado a mostrador para liquidación y cobro.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push(`/turnos/${turnoId}/pago`)}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-pill bg-status-warning-strong px-4 py-2 text-xs font-extrabold text-white transition-opacity hover:opacity-90 self-start sm:self-auto"
            >
              <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
              Liquidar y Cobrar Turno
            </button>
          </motion.div>
        )}

        <div className="flex flex-col gap-5 pb-8">
          {/* ── DATOS DEL TURNO ─── */}
          <SectionCard
            title="Datos del turno"
            icon={<Calendar className="h-4 w-4" aria-hidden="true" />}
          >
            <div className="grid grid-cols-1 gap-4 rounded-sm border border-border bg-cream-50 p-4 sm:grid-cols-2">
              <DatoDetalle
                label="Cliente"
                valor={cliente ? `${cliente.nombre} ${cliente.apellido}` : "—"}
              />
              <DatoDetalle label="DNI" valor={cliente?.documento ?? "—"} />
              <DatoDetalle
                label="Mascota"
                valor={
                  mascota
                    ? `${mascota.nombre} · ${mascota.especie}${mascota.raza ? ` · ${mascota.raza}` : ""}${mascota.sexo ? `, ${mascota.sexo}` : ""}${mascota.peso ? `, ${mascota.peso} kg` : ""}`
                    : "—"
                }
              />
              <DatoDetalle
                label="Fecha y hora"
                valor={`${formatFecha(turno.fecha)} · ${turno.horaInicio} – ${turno.horaFin}`}
              />
              <DatoDetalle label="Profesional" valor={profesionalDisplay} />
              <DatoDetalle label="Práctica" valor={practicaDisplay} />
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-wide text-text-secondary">
                  Estado
                </span>
                <div>
                  <EstadoTurnoBadge estadoId={turno.estadoId} />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── SIGNOS VITALES ─── */}
          <SectionCard
            title="Signos vitales"
            icon={<Thermometer className="h-4 w-4" aria-hidden="true" />}
          >
            {esCerrada ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-0 sm:grid-cols-4">
                <DataRow
                  label="Temperatura"
                  value={consulta?.temperatura != null ? `${consulta.temperatura} °C` : "—"}
                />
                <DataRow
                  label="Frec. cardíaca"
                  value={consulta?.frecuenciaCardiaca != null ? `${consulta.frecuenciaCardiaca} lpm` : "—"}
                />
                <DataRow
                  label="Peso al momento"
                  value={consulta?.pesoMomento != null ? `${consulta.pesoMomento} kg` : "—"}
                />
                <DataRow label="Est. físico general" value={consulta?.estadoFisicoGeneral ?? "—"} />
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Input
                    id="temperatura"
                    label="Temperatura (°C)"
                    type="number"
                    step="0.1"
                    min="30"
                    max="44"
                    placeholder="ej. 38.5"
                    value={draft.temperatura}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, temperatura: e.target.value }))
                    }
                    hint={
                      draft.temperatura &&
                      (parseFloat(draft.temperatura) < 37 ||
                        parseFloat(draft.temperatura) > 41)
                        ? "Fuera del rango normal (37–41 °C)"
                        : undefined
                    }
                  />
                  <Input
                    id="frecuencia-cardiaca"
                    label="Frec. cardíaca (lpm)"
                    type="number"
                    step="1"
                    min="20"
                    max="300"
                    placeholder="ej. 90"
                    value={draft.frecuenciaCardiaca}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, frecuenciaCardiaca: e.target.value }))
                    }
                  />
                  <div>
                    <Input
                      id="peso-momento"
                      label="Peso (kg)"
                      type="number"
                      step="0.1"
                      min="0.1"
                      placeholder="ej. 28.5"
                      value={draft.pesoMomento}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, pesoMomento: e.target.value }))
                      }
                      hint={
                        mascota?.peso
                          ? `Peso anterior: ${mascota.peso} kg`
                          : undefined
                      }
                    />
                  </div>
                </div>
                <Textarea
                  id="estado-fisico-general"
                  label="Estado físico general"
                  placeholder="Describí el estado físico general del animal…"
                  value={draft.estadoFisicoGeneral}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, estadoFisicoGeneral: e.target.value }))
                  }
                  rows={2}
                />
              </div>
            )}
          </SectionCard>

          {/* ── ANAMNESIS Y DIAGNÓSTICO ─── */}
          <SectionCard
            title="Anamnesis y diagnóstico"
            icon={<ClipboardList className="h-4 w-4" aria-hidden="true" />}
          >
            {esCerrada ? (
              <div className="flex flex-col gap-0">
                <DataRow label="Motivo de consulta" value={consulta?.motivoConsulta ?? "—"} />
                <DataRow label="Diagnóstico" value={consulta?.diagnostico ?? "—"} />
                <DataRow label="Tratamiento" value={consulta?.tratamiento ?? "—"} />
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Textarea
                  id="motivo-consulta"
                  label="Motivo de consulta"
                  requiredMark
                  placeholder="¿Por qué trae al paciente?"
                  value={draft.motivoConsulta}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, motivoConsulta: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, motivoConsulta: true }))}
                  error={errores.motivoConsulta}
                  rows={2}
                />
                <Textarea
                  id="diagnostico"
                  label="Diagnóstico"
                  requiredMark
                  placeholder="Diagnóstico principal y secundario si aplica…"
                  value={draft.diagnostico}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, diagnostico: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, diagnostico: true }))}
                  error={errores.diagnostico}
                  rows={2}
                />
                <Textarea
                  id="tratamiento"
                  label="Tratamiento indicado"
                  placeholder="Indicaciones y medicación post-consulta…"
                  value={draft.tratamiento}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, tratamiento: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            )}
          </SectionCard>

          {/* ── MEDICACIÓN / INSUMOS APLICADOS ─── */}
          <SectionCard
            title="Medicación e insumos aplicados"
            icon={<Pill className="h-4 w-4" aria-hidden="true" />}
          >
            <div className="flex flex-col gap-3">
              {insumos.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  {esCerrada ? "Sin insumos registrados." : "Sin insumos agregados aún."}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {insumos.map((ins) => (
                    <InsumoRow
                      key={ins.articuloId}
                      insumo={ins}
                      onRemove={handleQuitarInsumo}
                      readOnly={esCerrada}
                    />
                  ))}
                </div>
              )}

              {!esCerrada && (
                <div className="mt-1 rounded-md border border-border bg-cream-100 px-4 py-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-text-secondary">
                    Agregar insumo
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[260px] flex-1">
                      <Combobox
                        id="insumo-articulo"
                        placeholder="Buscar artículo por nombre o código…"
                        options={articuloOptions}
                        value={insumoSeleccionado}
                        onChange={(v) => {
                          setInsumoSeleccionado(v);
                          setInsumoError("");
                        }}
                        noResultsText="Sin artículos disponibles"
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        id="insumo-cantidad"
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="Cant."
                        value={insumoCantidad}
                        onChange={(e) => {
                          setInsumoCantidad(e.target.value);
                          setInsumoError("");
                        }}
                        aria-label="Cantidad del insumo"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={handleAgregarInsumo}
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      Agregar
                    </Button>
                  </div>
                  {insumoError && (
                    <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
                      {insumoError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── NOTAS ACLARATORIAS (solo visible si cerrada) ─── */}
          {esCerrada && (
            <SectionCard
              title="Notas aclaratorias"
              icon={<MessageSquarePlus className="h-4 w-4" aria-hidden="true" />}
            >
              <div className="flex flex-col gap-3">
                {notas.length === 0 ? (
                  <p className="text-sm text-text-secondary">Sin notas aclaratorias.</p>
                ) : (
                  notas.map((nota) => (
                    <div
                      key={nota.id}
                      className="rounded-md border border-border bg-cream-100 px-4 py-3"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-bold text-brand-900">
                          {nota.profesional}
                        </span>
                        <span className="text-xs text-text-secondary">
                          · {formatHoraMin(nota.fechaHora)}
                        </span>
                      </div>
                      <p className="text-sm text-text-primary">{nota.nota}</p>
                    </div>
                  ))
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNotaOpen(true)}
                  className="self-start"
                >
                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                  Agregar nota
                </Button>
              </div>
            </SectionCard>
          )}

          {/* ── Acciones ─── */}
          {!esCerrada && (
            <div className="flex items-center justify-end gap-3 border-t border-border pt-4 print:hidden">
              <Button type="button" variant="outline" onClick={handleAtras}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleFinalizar}
                disabled={!puedeGuardar}
                className="min-w-[180px]"
                title={
                  !puedeGuardar
                    ? "Completá el motivo de consulta y el diagnóstico para continuar."
                    : undefined
                }
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Finalizar consulta
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* ── Modales ─── */}
      <ConfirmarDialog
        open={confirmOpen}
        tone="success"
        title="¿Finalizar la consulta?"
        description="Al confirmar, la consulta quedará cerrada y el turno habilitado para cobro en mostrador. Esta acción no se puede deshacer."
        confirmLabel={finalizando ? "Finalizando…" : "Confirmar y finalizar"}
        cancelLabel="Volver"
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmarFinalizar}
      />

      <ConfirmarDialog
        open={cancelarOpen}
        tone="neutral"
        title="¿Salir sin guardar?"
        description="Tenés información ingresada que se perderá si salís ahora."
        confirmLabel="Salir sin guardar"
        cancelLabel="Continuar editando"
        onClose={() => setCancelarOpen(false)}
        onConfirm={() => {
          setCancelarOpen(false);
          router.push("/consulta");
        }}
      />

      <NotaConsultaModal
        open={notaOpen}
        profesional={profesionalDisplay}
        onClose={() => setNotaOpen(false)}
        onGuardar={handleGuardarNota}
      />
    </div>
  );
}

// ── Export con Suspense (patrón Next.js 16: params es una Promise) ────────────

export default function ConsultaPage({
  params,
}: {
  params: Promise<{ turnoId: string }>;
}) {
  const { turnoId: turnoIdStr } = use(params);
  const turnoId = parseInt(turnoIdStr, 10);

  return (
    <ToastProvider>
      <Suspense fallback={null}>
        <ConsultaPageContent turnoId={turnoId} />
      </Suspense>
    </ToastProvider>
  );
}
