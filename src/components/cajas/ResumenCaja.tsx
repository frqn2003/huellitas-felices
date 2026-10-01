import { Info, Wallet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { type CajaApertura, type MovimientoCaja, esperadoPreview } from "@/data/cajas";
import { cobradoFueraDeCaja } from "@/data/venta-medios-pago";
import { EstadoCajaBadge } from "./EstadoCajaBadge";

interface ResumenCajaProps {
  apertura: CajaApertura;
  movimientos: MovimientoCaja[];
  className?: string;
}

const formatMonto = (n: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

interface StatItem {
  label: string;
  value: string;
  accent: string;
  valueClass: string;
  sign?: string;
}

export function ResumenCaja({ apertura, movimientos, className }: ResumenCajaProps) {
  const abierto = apertura.estado === true;
  const ingresos = movimientos
    .filter((m) => m.cajaAperturaId === apertura.id && m.tipo === "Ingreso")
    .reduce((acc, m) => acc + m.monto, 0);
  const egresos = movimientos
    .filter((m) => m.cajaAperturaId === apertura.id && m.tipo === "Egreso")
    .reduce((acc, m) => acc + m.monto, 0);
  const esperado = esperadoPreview(apertura, movimientos);
  const diferencia = apertura.montoContado !== null && apertura.montoEsperado !== null
    ? apertura.montoContado - apertura.montoEsperado
    : null;

  // Ventana determinista de la apertura (sin hora actual en el render: evitaría
  // hydration mismatch). Caja todavía sin cierre → ventana de 24 h desde apertura.
  const desde = apertura.fechaApertura;
  const hasta =
    apertura.fechaCierre ??
    new Date(new Date(apertura.fechaApertura).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const fueraDeCaja = cobradoFueraDeCaja(apertura.sucursalId, desde, hasta);

  const stats: StatItem[] = [
    {
      label: "Monto inicial",
      value: formatMonto(apertura.montoInicial),
      accent: "border-l-4 border-border",
      valueClass: "text-brand-900",
    },
    {
      label: "Ingresos",
      value: formatMonto(ingresos),
      accent: "border-l-4 border-status-success",
      valueClass: "text-status-success-strong",
      sign: "+",
    },
    {
      label: "Egresos",
      value: formatMonto(egresos),
      accent: "border-l-4 border-status-danger",
      valueClass: "text-status-danger-strong",
      sign: "−",
    },
    {
      label: "Efectivo esperado",
      value: formatMonto(esperado),
      accent: "border-l-4 border-accent-500",
      valueClass: "text-brand-900",
    },
  ];

  return (
    <div className={`grid grid-cols-2 gap-4 md:grid-cols-4 ${className ?? ""}`}>
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-md border border-border bg-surface p-4 shadow-card ${s.accent}`}
        >
          <div className="mb-1 text-xs font-extrabold uppercase tracking-wide text-text-secondary">
            {s.label}
          </div>
          <div className={`text-2xl font-bold tabular-nums ${s.valueClass}`}>
            {s.sign ?? ""}
            {s.value}
          </div>
        </div>
      ))}

      {/* Cobros por transferencia en la ventana de la apertura: no son buenos
          ni malos para la caja (no impactan el efectivo), por eso acento info. */}
      <div className="rounded-md border border-border bg-surface p-4 shadow-card border-l-4 border-status-info md:col-span-4">
        <div className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
          Cobrado fuera de caja
        </div>
        <div className="text-2xl font-bold tabular-nums text-status-info-strong">
          {formatMonto(fueraDeCaja)}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-text-secondary">
          Corresponde a cobros por <strong className="font-bold text-text-primary">transferencia</strong>{" "}
          en la jornada: no ingresan al efectivo de la caja ni modifican el monto esperado, porque
          solo el efectivo genera movimientos de caja.
        </p>
      </div>

      {/* La diferencia solo existe cuando la caja está cerrada: mientras está
          abierta no hay monto contado con qué compararla. */}
      {!abierto && diferencia !== null && (
        <div
          className={`rounded-md border bg-surface p-4 shadow-card md:col-span-4 ${
            diferencia < 0 ? "border-l-4 border-status-danger" : "border-l-4 border-status-success"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Diferencia
              </div>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  diferencia < 0 ? "text-status-danger-strong" : "text-status-success-strong"
                }`}
              >
                {diferencia >= 0 ? "+" : ""}
                {formatMonto(diferencia)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Cierre
              </div>
              <div className="text-sm font-bold text-brand-900">
                {apertura.fechaCierre
                  ? format(new Date(apertura.fechaCierre), "dd/MM/yyyy HH:mm", { locale: es })
                  : "—"}
              </div>
            </div>
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            {diferencia < 0 ? "Faltante" : diferencia > 0 ? "Sobrante" : "Caja cuadrada"} · Monto
            contado: {formatMonto(apertura.montoContado ?? 0)}
          </p>
        </div>
      )}

      {abierto && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-surface p-4 shadow-card md:col-span-4">
          <span className="flex items-center gap-2 text-sm text-text-secondary">
            <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
            La diferencia se calcula al cerrar la caja.
          </span>
          <EstadoCajaBadge abierto />
        </div>
      )}

      {/* Alcance del resumen: los cobros por transferencia ya los cubre el
          bloque "Cobrado fuera de caja", acá no se repiten. */}
      <div className="flex items-start gap-2 rounded-md border border-border bg-cream-50 px-4 py-3 md:col-span-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
        <p className="text-xs leading-relaxed text-text-secondary">
          Este resumen cubre solo el <strong className="font-bold text-text-primary">efectivo</strong>{" "}
          de la jornada: ingresos y egresos sobre el monto inicial declarado y el efectivo
          esperado al cierre.
        </p>
      </div>
    </div>
  );
}