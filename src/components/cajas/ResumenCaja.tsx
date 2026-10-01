import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Coins,
  QrCode,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { type CajaApertura, type MovimientoCaja, esperadoPreview } from "@/data/cajas";
import { cobradoFueraDeCaja } from "@/data/venta-medios-pago";

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
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  iconBg: string;
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
      icon: Coins,
      iconBg: "bg-brand-900/10 text-brand-900",
      valueClass: "text-brand-900",
    },
    {
      label: "Ingresos",
      value: formatMonto(ingresos),
      icon: ArrowUpRight,
      iconBg: "bg-status-success/15 text-status-success-strong",
      valueClass: "text-status-success-strong",
      sign: "+",
    },
    {
      label: "Egresos",
      value: formatMonto(egresos),
      icon: ArrowDownRight,
      iconBg: "bg-status-danger/15 text-status-danger-strong",
      valueClass: "text-status-danger-strong",
      sign: "−",
    },
    {
      label: "Efectivo esperado",
      value: formatMonto(esperado),
      icon: Banknote,
      iconBg: "bg-accent-500/20 text-brand-900",
      valueClass: "text-brand-900",
    },
    {
      label: "Transferencias (Fuera caja)",
      value: formatMonto(fueraDeCaja),
      icon: QrCode,
      iconBg: "bg-sky-100 text-sky-800",
      valueClass: "text-sky-900",
    },
  ];

  return (
    <div className={`flex flex-col gap-4 ${className ?? ""}`}>
      {/* 5 Índices en 1 sola fila horizontal */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="flex items-center gap-3 rounded-md border border-border bg-surface p-4 shadow-card"
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-pill ${s.iconBg}`}>
                <Icon className="h-5 w-5" aria-hidden={true} />
              </span>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary truncate" title={s.label}>
                  {s.label}
                </span>
                <span className={`font-mono text-lg sm:text-xl font-extrabold truncate ${s.valueClass}`}>
                  {s.sign ?? ""}
                  {s.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* La diferencia solo existe cuando la caja está cerrada */}
      {!abierto && diferencia !== null && (
        <div
          className={`rounded-md border bg-surface p-4 shadow-card ${
            diferencia < 0 ? "border-l-4 border-status-danger" : "border-l-4 border-status-success"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
                Diferencia al cierre
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
            {diferencia < 0 ? "Faltante registrado" : diferencia > 0 ? "Sobrante registrado" : "Caja cuadrada"} · Monto
            contado: {formatMonto(apertura.montoContado ?? 0)}
          </p>
        </div>
      )}
    </div>
  );
}