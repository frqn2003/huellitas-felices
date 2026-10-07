import type { Venta } from "@/data/ventas";
import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from "@/lib/http/errors";
import * as repo from "./venta.repo";
import * as mapper from "./venta.mapper";
import type { CalcularVentaInput, CrearVentaInput } from "./venta.schema";
import type {
  Calculo,
  FiltrosVenta,
  LineaCalculada,
  LineaEntrada,
  MedioCobro,
} from "./venta.types";

/**
 * HU-VTA-01 — reglas de negocio de la Venta en Mostrador.
 *
 * Qué hace la BASE y por eso NO se recalcula acá (ver venta.repo.ts): el precio
 * de cada línea, el total, el descuento de stock y su movimiento, el cambio de
 * estado a 'pagado', el ingreso en caja del efectivo, el marcado del turno como
 * pagado y la bitácora de auditoría.
 *
 * Cliente: `venta` no tiene cliente_id a propósito. El historial del cliente
 * sale de venta.consulta_id → consulta_medica.cliente_id.
 *
 * Qué hace el SERVICE: resolver las líneas contra la lista de precios para poder
 * (1) mostrar los precios y el total ANTES de confirmar, (2) validar con un
 * mensaje claro lo que la base rechazaría con un código técnico, y (3) precargar
 * la atención médica sin reingreso manual.
 */

const redondear = (n: number) => Math.round(n * 100) / 100;
const centavos = (n: number) => Math.round(n * 100);

// ---------------------------------------------------------
// Cálculo (sirve para previsualizar y para confirmar)
// ---------------------------------------------------------

/**
 * Resuelve líneas + totales. Con `consultaId` precarga:
 *  · el servicio de la atención (práctica del turno, a precio de lista), y
 *  · cada insumo/medicamento aplicado, con la cantidad indicada por el profesional.
 * `lineas` del input se SUMAN a eso (ítems adicionales en el mostrador).
 */
async function resolver(input: CalcularVentaInput, ej?: repo.Ejecutor): Promise<Calculo> {
  let consultaInfo: Awaited<ReturnType<typeof repo.findConsulta>> = null;
  const pendientes: (LineaEntrada & { consultaMedicaInsumoId?: number })[] = [];

  if (input.consultaId !== undefined) {
    consultaInfo = await repo.findConsulta(input.consultaId, ej);
    if (!consultaInfo) throw new NotFoundError("la atención médica", input.consultaId);
    if (!consultaInfo.cerrada) {
      throw new BusinessRuleError(
        "CONSULTA_ABIERTA",
        "La atención todavía no fue finalizada: no se puede cobrar una consulta en curso.",
        "consultaId",
      );
    }
    const yaCobrada = await repo.findVentaDeConsulta(consultaInfo.id, ej);
    if (yaCobrada) {
      throw new ConflictError(
        "CONSULTA_YA_COBRADA",
        `Esta atención ya fue cobrada (venta N° ${yaCobrada}).`,
        "consultaId",
      );
    }

    pendientes.push({ practicaId: consultaInfo.practica_id, cantidad: 1 });
    for (const i of await repo.findInsumosConsulta(consultaInfo.id, ej)) {
      pendientes.push({ articuloId: i.articulo_id, cantidad: i.cantidad, consultaMedicaInsumoId: i.id });
    }
  }
  pendientes.push(...input.lineas);

  const articuloIds = [...new Set(pendientes.filter((l) => l.articuloId).map((l) => l.articuloId as number))];
  const practicaIds = [...new Set(pendientes.filter((l) => l.practicaId).map((l) => l.practicaId as number))];
  const [articulos, practicas] = await Promise.all([
    repo.findArticulosConPrecio(articuloIds, ej),
    repo.findPracticasConPrecio(practicaIds, ej),
  ]);
  const porArticulo = new Map(articulos.map((a) => [a.id, a]));
  const porPractica = new Map(practicas.map((p) => [p.id, p]));

  const lineas: LineaCalculada[] = pendientes.map((l) => {
    const esPractica = l.practicaId !== undefined;
    const id = (esPractica ? l.practicaId : l.articuloId) as number;
    const item = (esPractica ? porPractica : porArticulo).get(id);
    const etiqueta = esPractica ? "El servicio" : "El artículo";

    if (!item) throw new NotFoundError(esPractica ? "el servicio" : "el artículo", id);
    // Un inactivo no se puede seleccionar... salvo que ya esté indicado en una
    // atención cerrada: ahí se cobra lo que efectivamente se aplicó.
    if (item.estado !== "activo" && l.consultaMedicaInsumoId === undefined && !(esPractica && consultaInfo)) {
      throw new BusinessRuleError(
        "ITEM_INACTIVO",
        `${etiqueta} "${item.nombre}" está inactivo y no se puede vender.`,
        "lineas",
      );
    }
    if (item.precio === null) {
      throw new BusinessRuleError(
        "SIN_PRECIO",
        `${etiqueta} "${item.nombre}" no tiene precio de venta cargado en la Lista de Precios.`,
        "lineas",
      );
    }

    const precioUnitario = Number(item.precio);
    return {
      tipo: esPractica ? "practica" : "articulo",
      articuloId: esPractica ? null : id,
      practicaId: esPractica ? id : null,
      codigo: item.codigo ?? "",
      nombre: item.nombre,
      categoria: item.categoria ?? "",
      unidad: item.unidad ?? "",
      cantidad: l.cantidad,
      precioUnitario,
      subtotal: redondear(l.cantidad * precioUnitario),
      consultaMedicaInsumoId: l.consultaMedicaInsumoId ?? null,
    };
  });

  const total = redondear(lineas.reduce((acc, l) => acc + l.subtotal, 0));

  return {
    consultaId: consultaInfo?.id ?? null,
    turnoId: consultaInfo?.turno_id ?? null,
    clienteId: consultaInfo?.cliente_id ?? null,
    clienteNombre: consultaInfo?.cliente_nombre ?? null,
    sucursalId: consultaInfo?.sucursal_id ?? null,
    lineas,
    total,
  };
}

/** Previsualización: precios de la lista vigente y total. No escribe nada. */
export async function calcular(input: CalcularVentaInput): Promise<Calculo> {
  return resolver(input);
}

// ---------------------------------------------------------
// Medios de pago (HU-VTA-02)
// ---------------------------------------------------------

/**
 * `forma_pago` es UN catálogo compartido con las condiciones de compra a
 * proveedores ("Cta. cte. 30 días", "Cheque a 30 días"…), que no sirven para
 * cobrarle a un cliente en el mostrador. Los medios de cobro son las filas que
 * se reconocen por nombre; agregar "Tarjeta" o "Billetera virtual" al catálogo
 * alcanza para que aparezcan, sin tocar código.
 *
 * El registro es manual sobre lo que declara el cliente: no hay pasarelas de
 * pago externas ni referencias a terceros.
 */
export const tipoDeMedio = mapper.tipoDeMedio;

export async function listarMediosPago(): Promise<MedioCobro[]> {
  const formas = await repo.findTodasFormasPago();
  return formas.flatMap((f) => {
    const tipo = tipoDeMedio(f.nombre);
    return tipo ? [{ id: f.id, nombre: f.nombre, tipo }] : [];
  });
}

/**
 * El cobro de una venta: sus medios de pago y la bitácora (quién, cuándo, con
 * qué medios y montos).
 */
export async function obtenerCobro(ventaId: number) {
  const venta = await repo.findVentaById(ventaId);
  if (!venta) throw new NotFoundError("la venta", ventaId);

  const medios = await repo.findMediosPago([ventaId]);
  const auditoria = await repo.findAuditoriaCobro(medios.map((m) => m.id));
  const nombrePorForma = new Map(medios.map((m) => [m.forma_pago_id, m.nombre]));

  return {
    ventaId,
    total: Number(venta.total),
    medios: medios.map((m) => ({
      id: m.id,
      formaPagoId: m.forma_pago_id,
      nombre: m.nombre,
      tipo: tipoDeMedio(m.nombre),
      monto: Number(m.monto),
    })),
    auditoria: auditoria.map((a) => ({
      fechaHora: a.fecha_hora,
      usuarioId: a.usuario_id,
      usuarioNombre: a.usuario_nombre,
      operacion: a.operacion,
      formaPagoId: a.forma_pago_id,
      medio: nombrePorForma.get(a.forma_pago_id) ?? null,
      monto: Number(a.monto),
    })),
  };
}

// ---------------------------------------------------------
// Lecturas
// ---------------------------------------------------------

async function armar(rows: Awaited<ReturnType<typeof repo.findVentas>>, ej?: repo.Ejecutor): Promise<Venta[]> {
  const ids = rows.map((r) => r.id);
  const [detalles, medios] = await Promise.all([repo.findDetalles(ids, ej), repo.findMediosPago(ids, ej)]);
  return rows.map((r) => mapper.toApi(r, detalles, medios));
}

/** Ventas; con `clienteId` es el historial del cliente. */
export async function listar(filtros: FiltrosVenta = {}): Promise<Venta[]> {
  return armar(await repo.findVentas(filtros));
}

export async function obtener(id: number): Promise<Venta> {
  const row = await repo.findVentaById(id);
  if (!row) throw new NotFoundError("la venta", id);
  return (await armar([row]))[0];
}

// ---------------------------------------------------------
// Confirmación
// ---------------------------------------------------------

/**
 * Confirma la venta: cabecera + detalle + medios de pago en UNA transacción.
 * Si algo falla —stock insuficiente, pagos que no suman, falta de caja— no queda
 * nada a medias.
 */
export async function crear(input: CrearVentaInput, usuarioId: number): Promise<Venta> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const calculo = await resolver({ consultaId: input.consultaId, lineas: input.lineas }, client);

    // ---- Sucursal y depósito de donde sale el stock.
    const sucursalId =
      calculo.sucursalId ?? input.sucursalId ?? (await repo.findSucursalDeUsuario(usuarioId, client));
    if (sucursalId === null || sucursalId === undefined) {
      throw new ValidationError("SUCURSAL_OBLIGATORIA", "Indicá la sucursal de la venta.", "sucursalId");
    }
    if (calculo.sucursalId !== null && input.sucursalId !== undefined && input.sucursalId !== calculo.sucursalId) {
      throw new BusinessRuleError(
        "SUCURSAL_NO_COINCIDE",
        "La atención médica se realizó en otra sucursal.",
        "sucursalId",
      );
    }

    const depositos = await repo.findDepositos(sucursalId, client);
    if (depositos.length === 0) {
      throw new BusinessRuleError("SIN_DEPOSITO", "La sucursal no tiene un depósito del cual descontar stock.", "depositoId");
    }
    let depositoId = depositos[0].id; // por defecto el primero de la sucursal
    if (input.depositoId !== undefined) {
      if (!depositos.some((d) => d.id === input.depositoId)) {
        throw new BusinessRuleError("DEPOSITO_INVALIDO", "El depósito no pertenece a la sucursal de la venta.", "depositoId");
      }
      depositoId = input.depositoId;
    }

    // ---- Medios de pago: tienen que cubrir exactamente el total.
    const formas = await repo.findFormasPago(
      [...new Set(input.mediosPago.map((m) => m.formaPagoId))],
      client,
    );
    const nombreForma = new Map(formas.map((f) => [f.id, f.nombre]));
    const desconocida = input.mediosPago.find((m) => !nombreForma.has(m.formaPagoId));
    if (desconocida) throw new NotFoundError("la forma de pago", desconocida.formaPagoId);

    // Solo medios de cobro (efectivo, transferencia, tarjeta, billetera virtual).
    const noCobrable = input.mediosPago.find(
      (m) => tipoDeMedio(nombreForma.get(m.formaPagoId) as string) === null,
    );
    if (noCobrable) {
      throw new BusinessRuleError(
        "MEDIO_PAGO_NO_VALIDO",
        `"${nombreForma.get(noCobrable.formaPagoId)}" no es un medio de cobro: elegí efectivo, transferencia, tarjeta o billetera virtual.`,
        "mediosPago",
      );
    }
    // Un mismo medio una sola vez: para pagar con el mismo medio en dos partes, se suma el monto.
    if (new Set(input.mediosPago.map((m) => m.formaPagoId)).size !== input.mediosPago.length) {
      throw new ValidationError(
        "MEDIO_PAGO_REPETIDO",
        "Un medio de pago no puede repetirse: sumá los montos en una sola línea.",
        "mediosPago",
      );
    }

    const sumaPagos = input.mediosPago.reduce((acc, m) => acc + centavos(m.monto), 0);
    if (sumaPagos !== centavos(calculo.total)) {
      throw new ValidationError(
        "MEDIOS_PAGO_NO_COINCIDEN",
        `Los medios de pago suman $${(sumaPagos / 100).toFixed(2)} y el total de la venta es $${calculo.total.toFixed(2)}.`,
        "mediosPago",
      );
    }

    // El efectivo se asienta en la caja abierta de la sucursal (trigger de la base).
    const hayEfectivo = input.mediosPago.some(
      (m) => nombreForma.get(m.formaPagoId)?.toLowerCase() === "efectivo",
    );
    if (hayEfectivo && !(await repo.hayCajaAbierta(sucursalId, client))) {
      throw new BusinessRuleError(
        "SIN_CAJA_ABIERTA",
        "No hay una caja abierta en la sucursal: abrila para registrar un cobro en efectivo.",
        "mediosPago",
      );
    }

    // ---- Escritura. El precio, el stock y el total los resuelve la base.
    const ventaId = await repo.insertVenta(
      { sucursalId, depositoId, consultaId: calculo.consultaId, usuarioId },
      client,
    );
    for (const l of calculo.lineas) {
      await repo.insertDetalle(
        ventaId,
        {
          articuloId: l.articuloId,
          practicaId: l.practicaId,
          cantidad: l.cantidad,
          consultaMedicaInsumoId: l.consultaMedicaInsumoId,
        },
        client,
      );
    }
    for (const m of input.mediosPago) {
      await repo.insertMedioPago(ventaId, m.formaPagoId, m.monto, client);
    }

    const row = await repo.findVentaById(ventaId, client);
    if (!row) throw new NotFoundError("la venta", ventaId);
    return (await armar([row], client))[0];
  });
}
