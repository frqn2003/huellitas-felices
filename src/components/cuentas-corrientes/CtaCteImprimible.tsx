"use client";

import {
  formatARS,
  formatFecha,
  type ComprobantePendiente,
  type CuentaCorriente,
  type Pago,
} from "@/data/cuentas-corrientes";

/**
 * HU-FIN-02 — el detalle de cuenta corriente, tal como sale impreso.
 *
 * CÓMO SE GENERA EL PDF
 *   No hay librería. Este bloque está siempre montado con `hidden print:block`,
 *   el resto de la pantalla lleva `print:hidden`, y el botón llama a
 *   `window.print()`. El navegador ofrece "Guardar como PDF" y sale un PDF de
 *   verdad, con su paginación resuelta por el motor de render.
 *
 *   La alternativa era jsPDF + autotable: ~350 KB de bundle para replicar a mano
 *   un layout que el navegador ya sabe paginar, romper líneas y numerar.
 *
 * POR QUÉ SIEMPRE MONTADO Y NO CONDICIONAL
 *   Si se renderizara al hacer clic, `window.print()` podría dispararse antes
 *   del paint y salir una hoja en blanco. Montado desde el vamos no hay carrera
 *   y no hace falta un `requestAnimationFrame`.
 *
 * ⚠️ EL ESTADO VA COMO TEXTO, NO COMO COLOR. LEER ESTO ANTES DE "MEJORARLO".
 *
 *   Los navegadores DESCARTAN los fondos al imprimir (salvo que el usuario
 *   tilde "gráficos de fondo", y nadie lo hace). Si la alerta de vencimiento
 *   fuera un badge de color como en pantalla, en el papel desaparecería — y con
 *   ella el criterio de aceptación "alerta visualmente sobre comprobantes
 *   próximos a vencer o vencidos".
 *
 *   Por eso la columna Estado dice "VENCIDO" / "Vence en 3 días" con todas las
 *   letras. El color, si el usuario lo habilita, es refuerzo. Es la misma regla
 *   que pide accesibilidad: nunca comunicar solo con color.
 *
 * Se imprime el detalle COMPLETO, no la página que está a la vista: la
 * paginación de la interfaz no tiene nada que ver con la del papel.
 */

interface CtaCteImprimibleProps {
  cuenta: CuentaCorriente;
  comprobantes: ComprobantePendiente[];
  pagos: Pago[];
}

/**
 * El estado en palabras.
 *
 * `diasParaVencer` lo calcula la vista en hora argentina (corrección 17); acá
 * no se resta ninguna fecha, que es donde el front tenía su propia definición
 * de "vencido" con el reloj de la máquina del usuario.
 */
function estadoEnTexto(c: ComprobantePendiente): string {
  switch (c.estadoCta) {
    case "Vencido":
      return `VENCIDO hace ${Math.abs(c.diasParaVencer)} ${Math.abs(c.diasParaVencer) === 1 ? "día" : "días"}`;
    case "ProximoAVencer":
      return c.diasParaVencer === 0
        ? "VENCE HOY"
        : `Vence en ${c.diasParaVencer} ${c.diasParaVencer === 1 ? "día" : "días"}`;
    case "Credito":
      return "Crédito a favor";
    case "Saldado":
      return "Saldado";
    default:
      return "Pendiente";
  }
}

export function CtaCteImprimible({ cuenta, comprobantes, pagos }: CtaCteImprimibleProps) {
  const emitido = new Date().toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <section className="hidden print:block" aria-hidden="true">
      <header className="mb-6 border-b-2 border-black pb-3">
        <h1 className="text-xl font-bold">Cuenta corriente de proveedor</h1>
        <p className="mt-1 text-lg font-bold">{cuenta.nombre}</p>
        <p className="text-sm">CUIT {cuenta.documento}</p>
        <p className="mt-2 text-sm">
          <strong>Saldo actual:</strong> {formatARS(cuenta.saldoActual)}
          {cuenta.saldoActual < 0 && " (crédito a favor)"}
        </p>
        <p className="mt-1 text-xs">Emitido el {emitido} · Huellitas Felices</p>
      </header>

      <h2 className="mb-2 text-base font-bold">Comprobantes</h2>
      {comprobantes.length === 0 ? (
        <p className="mb-6 text-sm">Sin comprobantes registrados.</p>
      ) : (
        <table className="mb-6 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 text-left">Comprobante</th>
              <th className="py-1 text-left">Tipo</th>
              <th className="py-1 text-left">Emisión</th>
              <th className="py-1 text-left">Vencimiento</th>
              <th className="py-1 text-right">Total</th>
              <th className="py-1 text-right">Pagado</th>
              <th className="py-1 text-right">Saldo</th>
              <th className="py-1 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {comprobantes.map((c) => (
              <tr key={c.id} className="border-b border-gray-300">
                <td className="py-1">{c.numero}</td>
                <td className="py-1">{c.tipo}</td>
                <td className="py-1">{formatFecha(c.fechaEmision)}</td>
                <td className="py-1">{formatFecha(c.fechaVencimiento)}</td>
                <td className="py-1 text-right">{formatARS(c.montoTotal)}</td>
                <td className="py-1 text-right">{formatARS(c.montoPagado)}</td>
                <td className="py-1 text-right font-bold">{formatARS(c.saldoPendiente)}</td>
                {/* Texto, no color: ver el comentario del encabezado. */}
                <td className="py-1">{estadoEnTexto(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="mb-2 text-base font-bold">Pagos registrados</h2>
      {pagos.length === 0 ? (
        <p className="text-sm">Sin pagos registrados.</p>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black">
              <th className="py-1 text-left">N° comprobante</th>
              <th className="py-1 text-left">Fecha</th>
              <th className="py-1 text-left">Forma de pago</th>
              <th className="py-1 text-right">Importe</th>
              <th className="py-1 text-left">Imputado a</th>
              <th className="py-1 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b border-gray-300">
                <td className="py-1">{p.numero_comprobante}</td>
                <td className="py-1">{formatFecha(p.fecha)}</td>
                <td className="py-1">{p.formaPagoNombre ?? "—"}</td>
                <td className="py-1 text-right">{formatARS(p.monto)}</td>
                <td className="py-1">
                  {p.imputaciones
                    .map((i) => `${i.numero} (${formatARS(i.monto)})`)
                    .join(" · ") || "—"}
                </td>
                <td className="py-1">{p.estado ?? "Vigente"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="mt-8 border-t border-gray-400 pt-2 text-[10px]">
        Documento generado por el sistema. Refleja el estado de la cuenta al momento de la
        emisión.
      </footer>
    </section>
  );
}
