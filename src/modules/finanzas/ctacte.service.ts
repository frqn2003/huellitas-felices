import type { PoolClient } from "pg";
import type { ComprobantePendiente, CuentaCorriente, Pago } from "@/data/cuentas-corrientes";
import { NotFoundError } from "@/lib/http/errors";
import * as repo from "./ctacte.repo";
import * as mapper from "./ctacte.mapper";
import type { FiltrosCtaCte, ListadoCtaCte } from "./ctacte.types";

/**
 * HU-FIN-02 — Cuenta Corriente de Proveedores (lectura).
 *
 * Este service casi no tiene reglas, y es correcto que así sea: la cuenta
 * corriente es una CONSULTA. El saldo, el estado de cada comprobante y el
 * descuento de los pagos los resuelve `vista_cuenta_corriente_proveedor`, que es
 * la única que ve el saldo y el vencimiento al mismo tiempo.
 *
 * Lo que sí pasa acá es el saneo de la paginación y el armado del detalle.
 */

/**
 * Página y tamaño de página, saneados.
 *
 * `leerEntero()` deja pasar cualquier entero, incluidos 0 y negativos, y eso
 * llegaría al SQL como `LIMIT -10` (error de Postgres) o `LIMIT 0` (lista vacía
 * sin explicación).
 */
function sanearPaginacion(f: FiltrosCtaCte): { pagina: number; porPagina: number } {
  const pagina = Math.max(1, Math.trunc(f.pagina ?? 1));
  const porPagina = Math.min(200, Math.max(1, Math.trunc(f.porPagina ?? 50)));
  return { pagina, porPagina };
}

/** Pantalla A — el resumen por proveedor. */
export async function listarResumen(
  filtros: FiltrosCtaCte = {},
): Promise<ListadoCtaCte<CuentaCorriente>> {
  const { pagina, porPagina } = sanearPaginacion(filtros);

  const rows = await repo.findResumen({ ...filtros, pagina, porPagina });

  return {
    items: rows.map(mapper.resumenToApi),
    total: await repo.contarResumen(filtros),
    pagina,
    porPagina,
  };
}

export type DetalleCtaCte = {
  cuenta: CuentaCorriente;
  comprobantes: ComprobantePendiente[];
  pagos: Pago[];
};

/**
 * Pantalla B — el detalle de un proveedor.
 *
 * Devuelve las tres cosas juntas en vez de tres endpoints, por dos motivos:
 * la pantalla las necesita a las tres para dibujarse, y `POST /api/pagos`
 * responde con esta misma forma — así el front hace un `setState` con la
 * respuesta y el "saldo actualizado en tiempo real" del criterio 2 sale sin un
 * segundo viaje y sin que el navegador recalcule ningún saldo.
 *
 * Acepta un `client` para poder llamarse DENTRO de la transacción del alta de
 * pago: desde otra conexión del pool, las filas recién insertadas todavía no
 * existen (falta el COMMIT) y la respuesta saldría con el saldo viejo.
 */
export async function obtenerDetalle(
  proveedorId: number,
  client?: PoolClient,
): Promise<DetalleCtaCte> {
  const proveedor = await repo.findProveedor(proveedorId, client);
  if (!proveedor) throw new NotFoundError("el proveedor", proveedorId);

  const [comprobantes, pagos] = await Promise.all([
    repo.findComprobantes(proveedorId, client),
    repo.findPagos(proveedorId, client),
  ]);

  const imputaciones = await repo.findImputaciones(
    pagos.map((p) => p.id),
    client,
  );

  const comprobantesApi = comprobantes.map(mapper.comprobanteToApi);

  // El saldo se suma acá y no con otra consulta: ya tenemos todos sus
  // comprobantes en memoria, y una segunda pasada a la base para volver a sumar
  // lo mismo podría dar un número distinto si alguien escribió en el medio.
  const saldoActual = comprobantesApi.reduce((acc, c) => acc + c.saldoPendiente, 0);

  return {
    cuenta: {
      id: proveedor.id,
      tipo: "proveedor",
      nombre: proveedor.razon_social,
      documento: proveedor.cuit,
      saldoActual,
      estadoCta: peorEstado(comprobantesApi),
      proximoVencimiento: proximoVencimiento(comprobantesApi),
    },
    comprobantes: comprobantesApi,
    pagos: mapper.pagosToApi(pagos, imputaciones),
  };
}

/**
 * El peor estado entre los comprobantes, con la prelación del brief:
 * Vencido > ProximoAVencer > Credito > Saldado.
 *
 * En el LISTADO esto se calcula en SQL (ver `ESTADO_PROVEEDOR` en el repo)
 * porque ahí hay que poder filtrar por estado. Acá es un solo proveedor y sus
 * comprobantes ya están en memoria, así que repetir la consulta no compra nada.
 * Las dos definiciones tienen que decir lo mismo — si alguna vez se cambia la
 * prelación, se cambia en los dos lados.
 */
function peorEstado(comprobantes: ComprobantePendiente[]): CuentaCorriente["estadoCta"] {
  if (comprobantes.some((c) => c.estadoCta === "Vencido")) return "Vencido";
  if (comprobantes.some((c) => c.estadoCta === "ProximoAVencer")) return "ProximoAVencer";

  const saldo = comprobantes.reduce((acc, c) => acc + c.saldoPendiente, 0);
  if (saldo < 0) return "Credito";
  if (saldo === 0) return "Saldado";
  return "Pendiente";
}

/**
 * El vencimiento más cercano ENTRE LOS QUE TODAVÍA DEBEN algo.
 *
 * Sin el filtro por saldo saldría la fecha de una factura ya saldada, y el
 * encabezado mostraría un vencimiento que no le importa a nadie.
 */
function proximoVencimiento(comprobantes: ComprobantePendiente[]): string | null {
  const fechas = comprobantes
    .filter((c) => c.saldoPendiente > 0)
    .map((c) => c.fechaVencimiento)
    .sort();

  return fechas[0] ?? null;
}
