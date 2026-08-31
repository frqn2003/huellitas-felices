"use client";

// BACKEND: Este componente es hardcodeado para el equipo de diseño UI/UX.
// Al integrar con backend, reemplazar los datos hardcodeados por llamadas a la API.

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Search,
} from "lucide-react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { AnularComprobanteModal } from "@/components/comprobantes/AnularComprobanteModal";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { ComprobantesTable, type ComprobanteRow } from "@/components/comprobantes/ComprobantesTable";
import { DetalleLineasTable, type LineaComprobante } from "@/components/comprobantes/DetalleLineasTable";
import { DropzoneComprobante } from "@/components/comprobantes/DropzoneComprobante";
import {
  FiltrosComprobantes,
  FiltrosComprobantesChips,
  FILTROS_COMPROBANTES_VACIOS,
  type FiltrosComprobanteValues,
} from "@/components/comprobantes/FiltrosComprobantes";
import { OcrFieldGroup } from "@/components/comprobantes/OcrFieldGroup";
import { PreviewComprobantePdf } from "@/components/comprobantes/PreviewComprobantePdf";

// ─── Datos hardcodeados ───────────────────────────────────────────────────────

const PROVEEDORES = [
  { id: 1, razonSocial: "Distribuidora Vet SA", cuit: "30-71234567-8", condicionIVA: "Responsable Inscripto" },
  { id: 2, razonSocial: "Insumos Veterinarios del Norte SRL", cuit: "30-70987654-3", condicionIVA: "Responsable Inscripto" },
  { id: 3, razonSocial: "Juan Pérez Alimentos Balanceados", cuit: "20-25874196-5", condicionIVA: "Monotributista" },
];

const ORDENES_COMPRA = [
  { id: 1, numero: "OC-2026-0045", proveedorId: 1, estado: "Recibida total" },
  { id: 2, numero: "OC-2026-0046", proveedorId: 1, estado: "Recibida parcial" },
];
// BACKEND: reemplazar por GET /api/ordenes-compra?estado=recibida-parcial,recibida-total

const TIPOS_COMPROBANTE = [
  "Factura A", "Factura B", "Factura C",
  "Nota de Crédito A", "Nota de Crédito B",
  "Nota de Débito A", "Nota de Débito B",
];

const DATOS_OCR = {
  tipoDetectado: "Factura A",
  puntoVentaDetectado: "0003",
  numeroDetectado: "00001278",
  fechaDetectada: "2026-08-25",
  cuitDetectado: "30-71234567-8",
  montoTotalDetectado: "321255.00",
  camposNoReconocidos: ["alicuotaIVA linea 2"],
};

const HISTORIAL_INICIAL: ComprobanteRow[] = [
  { id: 101, proveedor: "Distribuidora Vet SA", tipo: "Factura A", numero: "0003-00001278", oc: "OC-2026-0045", fecha: "2026-08-25", monto: 321255.00, estado: "Vigente" },
  { id: 98, proveedor: "Insumos Veterinarios del Norte SRL", tipo: "Factura B", numero: "0001-00000542", oc: "OC-2026-0031", fecha: "2026-08-12", monto: 87400.00, estado: "Vigente" },
  { id: 95, proveedor: "Distribuidora Vet SA", tipo: "Nota de Crédito A", numero: "0003-00000034", oc: "OC-2026-0040", fecha: "2026-08-05", monto: -15000.00, estado: "Vigente", comprobanteOriginal: "0003-00001250" },
  { id: 90, proveedor: "Juan Pérez Alimentos Balanceados", tipo: "Factura C", numero: "0001-00000112", oc: "OC-2026-0028", fecha: "2026-07-30", monto: 42000.00, estado: "Anulado", comprobanteAnulador: "0001-00000113" },
];

const LINEAS_OCR_INICIAL: LineaComprobante[] = [
  { id: 1, articuloCodigo: "VAC-001", descripcion: "Vacuna Quíntuple Canina", cantidad: 50, precioUnitario: 4200.00, alicuotaIVA: 21, subtotal: 210000.00 },
  { id: 2, articuloCodigo: "ANT-014", descripcion: "Antibiótico Amoxicilina 500mg", cantidad: 30, precioUnitario: 1850.00, alicuotaIVA: null, subtotal: 55500.00 },
];

// ─── Vista — formulario OCR / historial ──────────────────────────────────────

export type TabView = "nuevo" | "historial";

export interface ComprobantesContentHandle {
  /** Abre el flujo "Nuevo comprobante" en el paso 1 (disparado desde el header). */
  irANuevo: () => void;
}

interface ComprobantesContentProps {
  /** Vista actual del módulo comprobantes (la controla la pantalla, no este componente). */
  tab: TabView;
  onTabChange: (tab: TabView) => void;
}

export const ComprobantesContent = forwardRef<ComprobantesContentHandle, ComprobantesContentProps>(
  function ComprobantesContent({ tab, onTabChange }, ref) {
  const { showToast } = useToast();
  const reduceMotion = useReducedMotion();

  // Nuevo comprobante — estado de pasos
  const [paso, setPaso] = useState<1 | 2>(1);
  const [formPaso, setFormPaso] = useState<1 | 2>(1);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Formulario comprobante
  const [tipo, setTipo] = useState("");
  const [puntoVenta, setPuntoVenta] = useState("");
  const [numero, setNumero] = useState("");
  const [fecha, setFecha] = useState("");
  const [cuit, setCuit] = useState("");
  const [ocId, setOcId] = useState("");
  const [facturaOriginalId, setFacturaOriginalId] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [lineas, setLineas] = useState<LineaComprobante[]>(LINEAS_OCR_INICIAL);

  // Errores de formulario
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Historial
  const [historial, setHistorial] = useState<ComprobanteRow[]>(HISTORIAL_INICIAL);
  const [filtros, setFiltros] = useState<FiltrosComprobanteValues>(FILTROS_COMPROBANTES_VACIOS);
  const [busqueda, setBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Modal anulación
  const [anularModal, setAnularModal] = useState<{ open: boolean; id: number; numero: string }>(
    { open: false, id: 0, numero: "" },
  );
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  // El botón "Nuevo comprobante" vive en el header de la pantalla; acá
  // exponemos un handler para que abra el flujo en el paso 1.
  useImperativeHandle(ref, () => ({
    irANuevo: () => {
      setUploadError("");
      setIsUploading(false);
      setArchivo(null);
      setPaso(1);
      setFormPaso(1);
    },
  }));

  // ── Confianza OCR ────────────────────────────────────────────────────────────
  const ocrConfianza = (campo: string) =>
    DATOS_OCR.camposNoReconocidos.includes(campo) ? ("no reconocido" as const) : ("alta" as const);

  // ── Subir archivo (simula OCR) ────────────────────────────────────────────────
  const handleFile = (file: File) => {
    setUploadError("");
    setIsUploading(true);
    setArchivo(file);
    // BACKEND: reemplazar por POST /api/comprobantes/ocr con el file como FormData
    setTimeout(() => {
      setIsUploading(false);
      // Pre-completar con datos OCR simulados
      setTipo(DATOS_OCR.tipoDetectado);
      setPuntoVenta(DATOS_OCR.puntoVentaDetectado);
      setNumero(DATOS_OCR.numeroDetectado);
      setFecha(DATOS_OCR.fechaDetectada);
      setCuit(DATOS_OCR.cuitDetectado);
      setMontoTotal(DATOS_OCR.montoTotalDetectado);
      setLineas(LINEAS_OCR_INICIAL);
      setPaso(2);
    }, 1800);
  };

  // ── Es NC/ND ──────────────────────────────────────────────────────────────────
  const esNcNd = tipo.startsWith("Nota de");

  // ── Validación del paso 1 del formulario (cabecera) ──────────────────────────
  const validarCabecera = () => {
    const errs: Record<string, string> = {};
    if (!tipo) errs.tipo = "Seleccioná el tipo de comprobante.";
    if (!puntoVenta) errs.puntoVenta = "Ingresá el punto de venta.";
    if (!numero) errs.numero = "Ingresá el número de comprobante.";
    if (!fecha) errs.fecha = "Ingresá la fecha de emisión.";
    if (!cuit) errs.cuit = "Ingresá el CUIT del proveedor.";
    if (!ocId) errs.ocId = "Seleccioná la OC vinculada.";
    if (esNcNd && !facturaOriginalId) errs.facturaOriginalId = "Seleccioná la factura original que corrige.";
    return errs;
  };

  const handleSiguiente = () => {
    const errs = validarCabecera();
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;
    setFormPaso(2);
  };

  // ── Validar y guardar ─────────────────────────────────────────────────────────
  const handleGuardar = () => {
    const errs = validarCabecera();
    if (lineas.length === 0) errs.lineas = "Agregá al menos una línea de detalle.";
    if (lineas.some((l) => !l.articuloCodigo || !l.descripcion)) errs.lineas = "Completá todos los campos de las líneas.";

    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    // BACKEND: reemplazar por POST /api/comprobantes con { tipo, puntoVenta, numero, fecha, cuit, ocId, facturaOriginalId, lineas }
    const nuevo: ComprobanteRow = {
      id: Math.max(0, ...historial.map((h) => h.id)) + 1,
      proveedor: PROVEEDORES.find((p) => p.cuit === cuit)?.razonSocial ?? "Proveedor desconocido",
      tipo,
      numero: `${puntoVenta.padStart(4, "0")}-${numero.padStart(8, "0")}`,
      oc: ORDENES_COMPRA.find((o) => o.id.toString() === ocId)?.numero ?? ocId,
      fecha,
      monto: lineas.reduce((s, l) => s + l.subtotal, 0),
      estado: "Vigente",
    };
    setHistorial((prev) => [nuevo, ...prev]);
    showToast("success", "Comprobante guardado correctamente.");
    // Reiniciar formulario
    setPaso(1);
    setFormPaso(1);
    setArchivo(null);
    setTipo(""); setPuntoVenta(""); setNumero(""); setFecha(""); setCuit("");
    setOcId(""); setFacturaOriginalId(""); setMontoTotal("");
    setLineas([]);
    setErrores({});
    onTabChange("historial");
  };

  // ── Filtrar historial ─────────────────────────────────────────────────────────
  const historialFiltrado = historial.filter((f) => {
    const q = busqueda.trim().toLowerCase();
    const matchBusqueda =
      !q ||
      f.numero.toLowerCase().includes(q) ||
      f.proveedor.toLowerCase().includes(q) ||
      f.oc.toLowerCase().includes(q);
    if (!matchBusqueda) return false;
    if (filtros.proveedor && !f.proveedor.toLowerCase().includes(
      PROVEEDORES.find((p) => p.id.toString() === filtros.proveedor)?.razonSocial.toLowerCase() ?? ""
    )) return false;
    if (filtros.tipo && f.tipo !== filtros.tipo) return false;
    if (filtros.oc && !f.oc.toLowerCase().includes(filtros.oc.toLowerCase())) return false;
    if (filtros.estado && f.estado !== filtros.estado) return false;
    if (filtros.desde && f.fecha < filtros.desde) return false;
    if (filtros.hasta && f.fecha > filtros.hasta) return false;
    return true;
  });

  const handleBusqueda = (value: string) => {
    setBusqueda(value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(historialFiltrado.length / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(page * PAGE_SIZE, historialFiltrado.length);
  const historialPagina = historialFiltrado.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Anular ────────────────────────────────────────────────────────────────────
  const handleAnularConfirm = (motivo: string) => {
    // BACKEND: reemplazar por POST /api/comprobantes/{id}/anular con { motivo }
    setHistorial((prev) =>
      prev.map((f) =>
        f.id === anularModal.id ? { ...f, estado: "Anulado" as const } : f,
      ),
    );
    setAnularModal({ open: false, id: 0, numero: "" });
    showToast("success", `Comprobante ${anularModal.numero} anulado. Se generó el comprobante de anulación.`);
  };

  return (
    <div className="flex flex-col gap-6">
      <AnimatePresence mode="wait">
        {tab === "nuevo" ? (
          <motion.div
            key="nuevo"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            {paso === 1 ? (
              /* Paso 1 — Dropzone */
              <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
                <DropzoneComprobante
                  onFile={handleFile}
                  isUploading={isUploading}
                  error={uploadError}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => { setPaso(1); setErrores({}); setArchivo(null); onTabChange("historial"); }}
                  className="self-start"
                >
                  Volver al historial
                </Button>
              </div>
            ) : (
              /* Paso 2 — Preview + Formulario */
              <div className="flex flex-col gap-6 lg:flex-row">
                {/* Panel preview */}
                <div className="flex flex-col gap-3 lg:w-[55%]">
                  {/* Visor del documento subido (PDF nativo o imagen) */}
                  <PreviewComprobantePdf file={archivo} />
                </div>

                {/* Panel formulario */}
                <div className="flex flex-col gap-5 lg:w-[45%]">
                  <h2 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">Datos del comprobante</h2>

                  {formPaso === 1 ? (
                    <>
                      {/* Cabecera */}
                      <div className="grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)] items-start gap-3">
                        <OcrFieldGroup label="Tipo de comprobante" confianza={ocrConfianza("tipo")} requiredMark>
                          <Select
                            id="tipo-comprobante"
                            value={tipo}
                            onChange={(e) => { setTipo(e.target.value); setErrores((p) => ({ ...p, tipo: "" })); }}
                            error={errores.tipo}
                          >
                            <option value="">Seleccioná el tipo…</option>
                            {TIPOS_COMPROBANTE.map((t) => <option key={t} value={t}>{t}</option>)}
                          </Select>
                        </OcrFieldGroup>
                        <OcrFieldGroup label="Punto de venta" confianza={ocrConfianza("puntoVenta")} requiredMark>
                          <Input
                            id="punto-venta"
                            value={puntoVenta}
                            onChange={(e) => { setPuntoVenta(e.target.value); setErrores((p) => ({ ...p, puntoVenta: "" })); }}
                            placeholder="0003"
                            error={errores.puntoVenta}
                            maxLength={4}
                            className="w-full"
                          />
                        </OcrFieldGroup>
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9.5rem)] items-start gap-3">
                        <OcrFieldGroup label="Número" confianza={ocrConfianza("numero")} requiredMark>
                          <Input
                            id="numero-comprobante"
                            value={numero}
                            onChange={(e) => { setNumero(e.target.value); setErrores((p) => ({ ...p, numero: "" })); }}
                            placeholder="00001278"
                            error={errores.numero}
                            maxLength={8}
                          />
                        </OcrFieldGroup>
                        <OcrFieldGroup label="Fecha de emisión" confianza={ocrConfianza("fecha")} requiredMark>
                          <Input
                            id="fecha-emision"
                            type="date"
                            value={fecha}
                            onChange={(e) => { setFecha(e.target.value); setErrores((p) => ({ ...p, fecha: "" })); }}
                            error={errores.fecha}
                          />
                        </OcrFieldGroup>
                      </div>

                      <OcrFieldGroup label="CUIT del proveedor" confianza={ocrConfianza("cuit")} requiredMark>
                        <Input
                          id="cuit-proveedor"
                          value={cuit}
                          onChange={(e) => { setCuit(e.target.value); setErrores((p) => ({ ...p, cuit: "" })); }}
                          placeholder="30-71234567-8"
                          error={errores.cuit}
                        />
                      </OcrFieldGroup>

                      <OcrFieldGroup label="OC vinculada" confianza={ocrConfianza("oc")} requiredMark>
                        <Select
                          id="oc-vinculada"
                          value={ocId}
                          onChange={(e) => { setOcId(e.target.value); setErrores((p) => ({ ...p, ocId: "" })); }}
                          error={errores.ocId}
                          hint="Solo se muestran OC en estado \&quot;Recibida parcial\&quot; o \&quot;Recibida total\&quot;"
                        >
                          <option value="">Seleccioná la OC…</option>
                          {ORDENES_COMPRA.map((o) => (
                            <option key={o.id} value={o.id.toString()}>
                              {o.numero} — {o.estado}
                            </option>
                          ))}
                        </Select>
                      </OcrFieldGroup>

                      {esNcNd && (
                        <OcrFieldGroup label="Factura original que corrige" confianza="alta" requiredMark>
                          <Select
                            id="factura-original"
                            value={facturaOriginalId}
                            onChange={(e) => { setFacturaOriginalId(e.target.value); setErrores((p) => ({ ...p, facturaOriginalId: "" })); }}
                            error={errores.facturaOriginalId}
                          >
                            <option value="">Seleccioná la factura original…</option>
                            {historial.filter((h) => h.estado === "Vigente" && !h.tipo.startsWith("Nota de")).map((h) => (
                              <option key={h.id} value={h.id.toString()}>{h.numero} — {h.tipo}</option>
                            ))}
                          </Select>
                        </OcrFieldGroup>
                      )}

                      {/* Acciones */}
                      <div className="flex items-center justify-end border-t border-border pt-4">
                        <Button type="button" variant="primary" onClick={handleSiguiente}>
                          Siguiente
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Monto y detalle */}
                      {/* Detalle de líneas */}
                      <div className="flex flex-col gap-2">
                        <h3 className="font-display text-xs font-extrabold uppercase tracking-tight text-brand-900">Detalle de líneas</h3>
                        {errores.lineas && (
                          <p role="alert" className="text-sm font-semibold text-destructive">{errores.lineas}</p>
                        )}
                        <DetalleLineasTable lineas={lineas} onChange={setLineas} />
                      </div>

                      <OcrFieldGroup label="Monto total" confianza={ocrConfianza("montoTotal")}>
                        <Input
                          id="monto-total"
                          value={montoTotal}
                          onChange={(e) => setMontoTotal(e.target.value)}
                          placeholder="321.255,00"
                          readOnly
                          className="bg-background"
                          aria-readonly="true"
                        />
                      </OcrFieldGroup>

                      {/* Acciones */}
                      <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                        <Button type="button" variant="outline" onClick={() => setFormPaso(1)}>
                          Volver
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfirmarCancelar(true)}
                        >
                          Cancelar
                        </Button>
                        <Button type="button" variant="primary" onClick={handleGuardar}>
                          Guardar comprobante
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* Vista Historial */
          <motion.div
            key="historial"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
            className="flex flex-col gap-5"
          >
            {/* Filtros */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => handleBusqueda(e.target.value)}
                    placeholder="Buscar por nro. de comprobante, OC o proveedor..."
                    aria-label="Buscar por número de comprobante, OC o proveedor"
                    className="h-11 w-full cursor-text rounded-pill border border-border bg-surface pl-12 pr-4 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </div>
                <FiltrosComprobantes
                  values={filtros}
                  onChange={(v) => { setFiltros(v); setPage(1); }}
                  hideChips
                />
              </div>
              <div className="flex flex-wrap items-center">
                <FiltrosComprobantesChips
                  filtros={filtros}
                  onChange={(v) => { setFiltros(v); setPage(1); }}
                />
              </div>
            </div>

            {/* Tabla */}
            <ComprobantesTable
              filas={historialPagina}
              onVer={(_id) => { /* BACKEND: redirigir a detalle o abrir modal de vista */ }}
              onAnular={(id) => {
                const f = historial.find((h) => h.id === id);
                if (f) setAnularModal({ open: true, id, numero: f.numero });
              }}
            />

            {/* Paginación */}
            {historialFiltrado.length > PAGE_SIZE && (
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={historialFiltrado.length}
                pageStart={pageStart}
                pageEnd={pageEnd}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                onPageSizeChange={() => {}}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal anulación */}
      <AnularComprobanteModal
        open={anularModal.open}
        onClose={() => setAnularModal({ open: false, id: 0, numero: "" })}
        numeroComprobante={anularModal.numero}
        onConfirm={handleAnularConfirm}
      />

      {/* Confirmación de cancelación */}
      <ConfirmarDialog
        open={confirmarCancelar}
        onClose={() => setConfirmarCancelar(false)}
        title="Cancelar carga del comprobante"
        description="Se descartarán los datos cargados y volverás al historial. Esta acción no se puede deshacer."
        confirmLabel="Descartar comprobante"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setConfirmarCancelar(false);
          setPaso(1);
          setFormPaso(1);
          setErrores({});
          setArchivo(null);
          onTabChange("historial");
        }}
      />
    </div>
  );
  },
);