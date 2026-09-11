"use client";

/**
 * HU-PROV-04 — Comprobantes de proveedor.
 *
 * ⚠️ ESTA PANTALLA ERA 100% HARDCODEADA HASTA EL 2026-09-11.
 *
 *    El backend existía desde el commit 4b66582 y nadie lo llamaba: `historial`
 *    arrancaba con un array de tres comprobantes inventados y se quedaba con
 *    ellos. Lo que se veía no tenía nada que ver con la base, y lo que se
 *    cargaba no se guardaba en ningún lado.
 *
 * QUÉ SE CAYÓ AL CONECTARLA
 *
 *    El modo EDICIÓN. `comprobante_proveedor` es INMUTABLE por trigger
 *    (`trg_bloquea_update_comprobante_proveedor`): cualquier UPDATE que no sea
 *    una transición de estado permitida levanta un P0001. Y no es un capricho
 *    de la base, es el criterio de aceptación de la HU:
 *
 *      "este comprobante, como cualquier comprobante fiscal del sistema, no se
 *       modifica una vez emitido, solo se anula mediante un nuevo comprobante
 *       de anulación, preservando el historial"
 *
 *    Un botón "Modificar" que la base rechaza siempre es peor que no tenerlo.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { apiGet, apiGetOpcional, apiSend, mensajeDeError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { AnularComprobanteModal } from "@/components/comprobantes/AnularComprobanteModal";
import { ConfirmarDialog } from "@/components/ui/ConfirmarDialog";
import { ComprobantesTable, type ComprobanteRow } from "@/components/comprobantes/ComprobantesTable";
import { FILTROS_COMPROBANTES_VACIOS } from "@/components/comprobantes/FiltrosComprobantes";
import { DetalleLineasTable, type LineaComprobante } from "@/components/comprobantes/DetalleLineasTable";
import { DropzoneComprobante } from "@/components/comprobantes/DropzoneComprobante";
import type { FiltrosComprobanteValues } from "@/components/comprobantes/FiltrosComprobantes";
import { OcrFieldGroup } from "@/components/comprobantes/OcrFieldGroup";
import { PreviewComprobantePdf } from "@/components/comprobantes/PreviewComprobantePdf";
import { VerComprobanteModal } from "@/components/comprobantes/VerComprobanteModal";

// ─── Catálogos, ahora de la API ──────────────────────────────────────────────
//
// Acá vivían PROVEEDORES, ORDENES_COMPRA y TIPOS_COMPROBANTE como arrays
// inventados. Los reemplazan /api/proveedores, /api/ordenes-compra y
// /api/tipos-comprobante.
//
// El de TIPOS_COMPROBANTE además mezclaba dos cosas en un string: "Factura A"
// es el tipo (`tipo_comprobante.nombre`) MÁS la letra (`comprobante_proveedor.
// letra`), que en la base son columnas distintas. El combo se arma abajo.

type ProveedorOpcion = { id: number; razon_social: string; cuit: string };
type TipoComprobanteOpcion = { id: number; nombre: string; afecta_saldo?: number };
type OrdenOpcion = { id: number; cod_ord: string; estado: string };
type ArticuloOpcion = { id: number; codigo: string; nombre: string };

/** Las letras fiscales que puede llevar un comprobante. */
const LETRAS = ["A", "B", "C"] as const;

const DATOS_OCR = {
  tipoDetectado: "Factura A",
  puntoVentaDetectado: "0003",
  numeroDetectado: "00001278",
  fechaDetectada: "2026-08-25",
  fechaVencimientoDetectada: "2026-09-24",
  cuitDetectado: "30-71234567-8",
  montoTotalDetectado: "321255.00",
  camposNoReconocidos: ["alicuotaIVA linea 2"],
};

/** Convierte un monto numérico al formato plano (sin símbolo) usado por el input readOnly de monto. */
const formatNumeroMoneda = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));


const LINEAS_OCR_INICIAL: LineaComprobante[] = [
  { id: 1, articuloCodigo: "VAC-001", descripcion: "Vacuna Quíntuple Canina", cantidad: 50, precioUnitario: 4200.00, alicuotaIVA: 21, subtotal: 210000.00 },
  { id: 2, articuloCodigo: "ANT-014", descripcion: "Antibiótico Amoxicilina 500mg", cantidad: 30, precioUnitario: 1850.00, alicuotaIVA: null, subtotal: 55500.00 },
];

// ─── Vista — formulario OCR / historial ──────────────────────────────────────

export type TabView = "nuevo" | "historial";

export interface ComprobantesContentHandle {
  /** Abre el flujo "Nuevo comprobante" en el paso 1 (disparado desde el header). */
  irANuevo: () => void;
  /** Vuelve la paginación del historial a la página 1 (al cambiar búsqueda/filtros). */
  resetPaginacion: () => void;
}

interface ComprobantesContentProps {
  /** Vista actual del módulo comprobantes (la controla la pantalla, no este componente). */
  tab: TabView;
  onTabChange: (tab: TabView) => void;
  /** Búsqueda y filtros del historial (la barra vive en el header de la pantalla). */
  busqueda: string;
  filtros: FiltrosComprobanteValues;
  /** Permite limpiar búsqueda/filtros desde el estado vacío de la tabla. */
  onBusquedaChange: (q: string) => void;
  onFiltrosChange: (filtros: FiltrosComprobanteValues) => void;
  /** Redirige al detalle de cta. cte. del proveedor del comprobante (cross-navegación). */
  onVerCtaCte?: (filas: ComprobanteRow) => void;
}

export const ComprobantesContent = forwardRef<ComprobantesContentHandle, ComprobantesContentProps>(
  function ComprobantesContent({ tab, onTabChange, busqueda, filtros, onBusquedaChange, onFiltrosChange, onVerCtaCte }, ref) {
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
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [cuit, setCuit] = useState("");
  const [ocId, setOcId] = useState("");
  const [facturaOriginalId, setFacturaOriginalId] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [lineas, setLineas] = useState<LineaComprobante[]>([]);

  // Errores de formulario
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Historial
  // Arranca vacío y lo llena la API. Antes arrancaba con tres comprobantes
  // inventados que nunca se reemplazaban.
  const [historial, setHistorial] = useState<ComprobanteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [recarga, setRecarga] = useState(0);

  // Catálogos de la API. Van con apiGetOpcional: que falte uno deja su select
  // vacío, pero no tira abajo el historial.
  const [proveedores, setProveedores] = useState<ProveedorOpcion[]>([]);
  const [tiposComprobante, setTiposComprobante] = useState<TipoComprobanteOpcion[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenOpcion[]>([]);
  const [articulos, setArticulos] = useState<ArticuloOpcion[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Modal anulación
  const [anularModal, setAnularModal] = useState<{ open: boolean; id: number; numero: string }>(
    { open: false, id: 0, numero: "" },
  );
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  // Modal de detalle ("Ver" con el ojo) + modo edición de un comprobante del historial
  const [verModal, setVerModal] = useState<{ open: boolean; comprobante: ComprobanteRow | null }>({
    open: false,
    comprobante: null,
  });
  /*
    Acá vivía `editandoId` y toda la función `cargarParaEditar`, que llenaba el
    formulario con un comprobante del historial para "modificarlo".

    Se fueron porque la operación NO EXISTE: `comprobante_proveedor` es
    inmutable por trigger. Cualquier UPDATE que no sea una transición de estado
    permitida levanta un P0001:

      "comprobante_proveedor es inmutable: no se permite UPDATE salvo las
       transiciones de estado permitidas (vigente->anulado, vigente->pagado,
       pagado->anulado)"

    Y la API tampoco tiene PUT. Era un botón que iba a fallar siempre.

    Si un comprobante se cargó mal, el camino es anularlo y emitir uno nuevo —
    que es literalmente el criterio de aceptación de la HU.
  */

  /**
   * Lo que devuelve GET /api/comprobantes-proveedor.
   *
   * El mapper del back emite alias duplicados a propósito (`proveedor` y
   * `proveedorNombre`, `monto` y `montoTotal`) para no romper consumidores
   * viejos. Acá se toma uno de cada par.
   */
  type ComprobanteApi = {
    id: number;
    proveedorId: number;
    proveedorNombre: string;
    proveedorCuit: string;
    tipoComprobanteId: number;
    tipo: string;
    letra: string;
    numeroComprobante: string;
    puntoVenta: string;
    fechaEmision: string;
    fechaVencimiento: string;
    ordenCompraId: number;
    oc: string;
    montoTotal: number;
    estado: "Vigente" | "Anulado" | "Pagado";
    comprobanteCorregidoNumero?: string | null;
    anulaComprobanteNumero?: string | null;
    lineas?: {
      id: number;
      articuloId: number;
      articuloCodigo: string;
      articuloNombre: string;
      cantidad: number;
      precioFacturado: number;
      subtotal: number;
    }[];
  };

  /** La fila de la API con el shape que ya usa la tabla. */
  const aFila = useCallback(
    (c: ComprobanteApi): ComprobanteRow => ({
      id: c.id,
      proveedor: c.proveedorNombre,
      cuit: c.proveedorCuit,
      // La tabla muestra un solo string; en la base son dos columnas.
      tipo: `${c.tipo} ${c.letra}`.trim(),
      numero: `${c.puntoVenta}-${c.numeroComprobante}`,
      oc: c.oc,
      ocId: c.ordenCompraId,
      fecha: (c.fechaEmision ?? "").slice(0, 10),
      fecha_vencimiento: (c.fechaVencimiento ?? "").slice(0, 10),
      monto: c.montoTotal,
      estado: c.estado,
      comprobanteOriginal: c.comprobanteCorregidoNumero ?? undefined,
      comprobanteAnulador: c.anulaComprobanteNumero ?? undefined,
      lineas: (c.lineas ?? []).map((l) => ({
        id: l.id,
        articuloId: l.articuloId,
        articuloCodigo: l.articuloCodigo,
        descripcion: l.articuloNombre,
        cantidad: l.cantidad,
        precioUnitario: l.precioFacturado,
        // La base no guarda alícuota de IVA por línea: no existe la columna.
        alicuotaIVA: null,
        subtotal: l.subtotal,
      })),
    }),
    [],
  );

  /**
   * Carga el historial y los catálogos.
   *
   * El FILTRADO lo hace el servidor: el endpoint ya acepta busqueda, proveedor,
   * fechas y estado, y el repo los aplica en el WHERE. Antes la pantalla
   * filtraba en el navegador — sobre el array inventado.
   */
  useEffect(() => {
    let cancelado = false;

    // Debounce de la búsqueda: sin esto cada tecla dispara un request y las
    // respuestas pueden llegar desordenadas.
    const t = setTimeout(() => {
      if (cancelado) return;
      setLoading(true);

      const params = new URLSearchParams();
      if (busqueda.trim()) params.set("busqueda", busqueda.trim());
      if (filtros.proveedor) params.set("proveedorId", filtros.proveedor);
      if (filtros.estado) params.set("estado", filtros.estado);
      if (filtros.desde) params.set("desde", filtros.desde);
      if (filtros.hasta) params.set("hasta", filtros.hasta);

      Promise.all([
        apiGet<ComprobanteApi[]>(`/api/comprobantes-proveedor?${params}`),
        apiGetOpcional<ProveedorOpcion[]>("/api/proveedores?estado=activo", []),
        apiGetOpcional<TipoComprobanteOpcion[]>("/api/tipos-comprobante", []),
        apiGetOpcional<OrdenOpcion[]>("/api/ordenes-compra", []),
        apiGetOpcional<ArticuloOpcion[]>("/api/articulos?estado=activo", []),
      ])
        .then(([lista, provs, tipos, ocs, arts]) => {
          if (cancelado) return;
          setHistorial(lista.map(aFila));
          setProveedores(provs);
          setTiposComprobante(tipos);
          // Solo las OC que ya recibieron mercadería: HU-PROV-04 exige que el
          // comprobante se vincule a una orden recibida (parcial o total).
          // Facturar una orden que todavía no llegó no tiene sentido.
          setOrdenes(
            ocs.filter(
              (o) => o.estado === "recibida_parcial" || o.estado === "recibida_total",
            ),
          );
          setArticulos(arts);
          setErrorCarga(false);
        })
        .catch(() => {
          if (!cancelado) setErrorCarga(true);
        })
        .finally(() => {
          if (!cancelado) setLoading(false);
        });
    }, busqueda ? 300 : 0);

    return () => {
      cancelado = true;
      clearTimeout(t);
    };
  }, [busqueda, filtros, recarga, aFila]);

  /**
   * Las opciones del select de tipo: cada tipo por cada letra.
   *
   * En la base son dos columnas (`tipo_comprobante_id` y `letra`); la pantalla
   * las muestra juntas como "Factura A". El `value` lleva las dos separadas por
   * `|` para poder desarmarlo al guardar sin volver a parsear el label.
   */
  const opcionesTipo = tiposComprobante.flatMap((t) =>
    LETRAS.map((letra) => ({
      value: `${t.id}|${letra}`,
      label: `${t.nombre} ${letra}`,
    })),
  );

  useImperativeHandle(ref, () => ({
    irANuevo: () => {
      setUploadError("");
      setIsUploading(false);
      setArchivo(null);
      setPaso(1);
      setFormPaso(1);
    },
    /** Abre el flujo de edición en el paso de datos cargando un comprobante del historial. */
    /** Vuelve la paginación del historial a la página 1 (al cambiar búsqueda/filtros). */
    resetPaginacion: () => {
      setPage(1);
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
      setFechaVencimiento(DATOS_OCR.fechaVencimientoDetectada);
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
    if (!fechaVencimiento) errs.fechaVencimiento = "Ingresá la fecha de vencimiento.";
    if (!cuit) errs.cuit = "Seleccioná el proveedor.";
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
  const handleGuardar = async () => {
    const errs = validarCabecera();
    if (lineas.length === 0) errs.lineas = "Agregá al menos una línea de detalle.";
    if (lineas.some((l) => !l.articuloId)) errs.lineas = "Elegí el artículo de cada línea.";
    if (lineas.some((l) => l.cantidad <= 0)) errs.lineas = "La cantidad de cada línea debe ser mayor a cero.";

    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    // `tipo` viaja como "idTipo|letra" (ver opcionesTipo): en la base son dos
    // columnas distintas, y el string "Factura A" que se muestra es la unión de
    // las dos. Se desarma acá en vez de parsear el label.
    const [tipoComprobanteIdRaw, letra] = tipo.split("|");

    const proveedorId = proveedores.find((p) => p.cuit === cuit)?.id;
    if (!proveedorId) {
      setErrores({ cuit: "No se pudo identificar al proveedor por ese CUIT." });
      return;
    }

    const body = {
      proveedorId,
      tipoComprobanteId: Number(tipoComprobanteIdRaw),
      letra,
      puntoVenta,
      numeroComprobante: numero,
      fechaEmision: fecha,
      fechaVencimiento,
      ordenCompraId: Number(ocId),
      comprobanteCorregidoId: facturaOriginalId ? Number(facturaOriginalId) : null,
      // El monto NO se manda calculado desde acá: el back lo recalcula sumando
      // los subtotales. Mandarlo sería una segunda fuente para el mismo número.
      lineas: lineas.map((l) => ({
        articuloId: l.articuloId!,
        cantidad: l.cantidad,
        precioFacturado: l.precioUnitario,
        subtotal: l.subtotal,
      })),
    };

    setGuardando(true);
    try {
      await apiSend("POST", "/api/comprobantes-proveedor", body);
      showToast("success", "Comprobante guardado correctamente.");

      // Recarga en vez de insertar la fila a mano: el comprobante trae el
      // número y las fechas que puso la base, y además el alta puede haber
      // cambiado el estado de la orden de compra.
      setRecarga((n) => n + 1);

      setPaso(1);
      setFormPaso(1);
      setArchivo(null);
      setTipo(""); setPuntoVenta(""); setNumero(""); setFecha(""); setFechaVencimiento(""); setCuit("");
      setOcId(""); setFacturaOriginalId(""); setMontoTotal("");
      setLineas([]);
      setErrores({});
      onTabChange("historial");
    } catch (e) {
      // El error del backend se muestra tal cual: dice cosas que la pantalla no
      // puede saber, como que la OC todavía no está recibida o que ese número
      // de comprobante ya existe para el proveedor.
      showToast("error", mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  };

  // ── Filtrar historial ─────────────────────────────────────────────────────────
  // El filtrado lo hace el SERVIDOR: el endpoint acepta busqueda, proveedorId,
  // estado y el rango de fechas, y el repo los aplica en el WHERE (ver el
  // useEffect de carga). Acá solo quedan los dos filtros que la API todavía no
  // expone como parámetro.
  const historialFiltrado = historial.filter((f) => {
    if (filtros.tipo && f.tipo !== filtros.tipo) return false;
    if (filtros.oc && !f.oc.toLowerCase().includes(filtros.oc.toLowerCase())) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(historialFiltrado.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const historialPagina = historialFiltrado.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageStart = historialFiltrado.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, historialFiltrado.length);

  const hasActiveFilters =
    busqueda.trim() !== "" || Object.values(filtros).some((v) => v !== "");

  const handleClearFilters = () => {
    onBusquedaChange("");
    onFiltrosChange(FILTROS_COMPROBANTES_VACIOS);
  };

  // ── Anular ────────────────────────────────────────────────────────────────────
  const handleAnularConfirm = async (motivo: string) => {
    const { id, numero } = anularModal;

    try {
      await apiSend("POST", `/api/comprobantes-proveedor/${id}/anular`, { motivo });
      setAnularModal({ open: false, id: 0, numero: "" });
      // Recarga: la anulación INSERTA un comprobante nuevo (el de anulación) y
      // un trigger pasa el original a 'anulado'. Marcar la fila a mano mostraría
      // el original bien y escondería el comprobante nuevo.
      setRecarga((n) => n + 1);
      showToast("success", `Comprobante ${numero} anulado. Se generó el comprobante de anulación.`);
    } catch (e) {
      setAnularModal({ open: false, id: 0, numero: "" });
      showToast("error", mensajeDeError(e));
    }
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
              <div className="flex flex-col gap-4">
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setPaso(1); setErrores({}); setArchivo(null); onTabChange("historial"); }}
                    className="self-start px-0 text-text-secondary hover:text-brand-900"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Volver al historial
                  </Button>
                </div>
                <div className="mx-auto w-full max-w-lg">
                  <DropzoneComprobante
                    onFile={handleFile}
                    isUploading={isUploading}
                    error={uploadError}
                  />
                </div>
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
                  <h2 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
                    {"Datos del comprobante"}
                  </h2>

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
                            {/* value = "idTipo|letra": en la base son dos columnas. */}
                            {opcionesTipo.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
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
                        <OcrFieldGroup label="Fecha de vencimiento" requiredMark>
                          <Input
                            id="fecha-vencimiento"
                            type="date"
                            value={fechaVencimiento}
                            onChange={(e) => { setFechaVencimiento(e.target.value); setErrores((p) => ({ ...p, fechaVencimiento: "" })); }}
                            error={errores.fechaVencimiento}
                          />
                        </OcrFieldGroup>
                      </div>

                      <OcrFieldGroup label="Proveedor" confianza={ocrConfianza("cuit")} requiredMark>
                        {/*
                          Era un <Input> de texto libre donde se tecleaba el CUIT.
                          Pasó a select porque la API necesita el `proveedorId`, y
                          resolver un CUIT tecleado contra la base es frágil:
                          "30-71234567-8" y "30712345678" son el mismo proveedor y
                          distinto string. Eligiendo de la lista, el id siempre
                          existe.
                        */}
                        <Select
                          id="cuit-proveedor"
                          value={cuit}
                          onChange={(e) => { setCuit(e.target.value); setErrores((p) => ({ ...p, cuit: "" })); }}
                          error={errores.cuit}
                        >
                          <option value="">Seleccioná el proveedor…</option>
                          {proveedores.map((p) => (
                            <option key={p.id} value={p.cuit}>
                              {p.razon_social} — {p.cuit}
                            </option>
                          ))}
                        </Select>
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
                          {ordenes.map((o) => (
                            <option key={o.id} value={o.id.toString()}>
                              {o.cod_ord} — {o.estado.replace(/_/g, " ")}
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
                            {/*
                              `!== "Anulado"` y no `=== "Vigente"`: emitir una
                              Nota de Crédito contra una factura YA PAGADA es
                              normal (una devolución). Con el filtro anterior,
                              apenas el trigger marcaba la factura como
                              `pagado`, desaparecía de este selector y la NC no
                              se podía emitir contra nada.
                            */}
                            {historial.filter((h) => h.estado !== "Anulado" && !h.tipo.startsWith("Nota de")).map((h) => (
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
                        <DetalleLineasTable lineas={lineas} onChange={setLineas} articulos={articulos} />
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
                          {guardando ? "Guardando…" : "Guardar comprobante"}
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
            {/* Tabla */}
            {/*
              Estados de carga y error, que esta pantalla no tenía porque los
              datos venían de un array en memoria: nunca tardaban ni fallaban.
            */}
            {errorCarga ? (
              <div
                role="alert"
                className="flex flex-col items-center gap-4 rounded-md border border-destructive/40 bg-surface px-6 py-16 text-center"
              >
                <p className="font-display text-lg font-extrabold uppercase text-brand-900">
                  No se pudieron cargar los comprobantes
                </p>
                <Button variant="secondary" onClick={() => setRecarga((n) => n + 1)}>
                  Reintentar
                </Button>
              </div>
            ) : loading ? (
              <p role="status" className="py-16 text-center text-sm text-text-secondary">
                Cargando comprobantes…
              </p>
            ) : (
            <ComprobantesTable
              filas={historialPagina}
              hasActiveFilters={hasActiveFilters}
              onClearFilters={handleClearFilters}
              onVer={(id) => {
                const f = historial.find((h) => h.id === id);
                if (f) setVerModal({ open: true, comprobante: f });
              }}
              onAnular={(id) => {
                const f = historial.find((h) => h.id === id);
                if (f) setAnularModal({ open: true, id, numero: f.numero });
              }}
              onVerCtaCte={onVerCtaCte}
            />
            )}

            {/* Paginación */}
            {historialPagina.length > 0 && (
              <Pagination
                page={safePage}
                totalPages={totalPages}
                totalItems={historialFiltrado.length}
                pageStart={pageStart}
                pageEnd={pageEnd}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                itemLabel="comprobantes"
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

      {/* Modal de detalle ("Ver" con el ojo) → permite modificar reutilizando el flujo de datos */}
      <VerComprobanteModal
        open={verModal.open}
        comprobante={verModal.comprobante}
        onClose={() => setVerModal({ open: false, comprobante: null })}
        /*
          El modal de detalle ya no ofrece "Modificar": un comprobante emitido
          no se modifica. Se conserva el prop para no romper la firma, y no hace
          nada más que cerrar.
        */
        onModificar={() => setVerModal({ open: false, comprobante: null })}
      />

      {/* Confirmación de cancelación */}
      <ConfirmarDialog
        open={confirmarCancelar}
        onClose={() => setConfirmarCancelar(false)}
        title="Cancelar carga del comprobante"
        description="Se descartarán los datos cargados y volverás al historial. Esta acción no se puede deshacer."
        confirmLabel="Descartar cambios"
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