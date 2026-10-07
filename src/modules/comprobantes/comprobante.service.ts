import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, ConflictError, NotFoundError } from "@/lib/http/errors";
import * as repo from "./comprobante.repo";
import * as mapper from "./comprobante.mapper";
import type { FiltrosComprobante, LineaComprobanteInput } from "./comprobante.types";
import type { CrearComprobanteInput, AnularComprobanteInput } from "./comprobante.schema";

function round2(num: number): number {
  return Math.round(num * 100) / 100;
}

export async function listar(filtros: FiltrosComprobante) {
  const rows = await repo.listar(filtros);
  return rows.map((r) => mapper.toComprobanteDTO(r));
}

export async function obtenerPorId(id: number) {
  const row = await repo.obtenerPorId(id);
  if (!row) {
    throw new NotFoundError("comprobante", id);
  }
  const detalles = await repo.obtenerDetalles(id);
  return mapper.toComprobanteDTO(row, detalles);
}

export async function crear(input: CrearComprobanteInput, usuarioId: number) {
  // 1. Validar que la OC exista y esté recibida (parcial o total)
  const oc = await repo.obtenerEstadoOrdenCompra(input.ordenCompraId);
  if (!oc) {
    throw new NotFoundError("orden de compra", input.ordenCompraId);
  }

  const estadoOc = oc.estado.toLowerCase();
  if (!estadoOc.includes("recibida")) {
    throw new BusinessRuleError(
      "ORDEN_NO_RECIBIDA",
      `La orden de compra vinculada está en estado "${oc.estado}". Solo se pueden registrar comprobantes de OC recibidas parcial o totalmente.`,
    );
  }

  // 2. Validar que no exista un comprobante duplicado
  const yaExiste = await repo.existeNumero(
    input.proveedorId,
    input.tipoComprobanteId,
    input.letra,
    input.puntoVenta.padStart(4, "0"),
    input.numeroComprobante.padStart(8, "0"),
  );
  if (yaExiste) {
    throw new ConflictError(
      "COMPROBANTE_DUPLICADO",
      `Ya existe el comprobante ${input.letra}-${input.puntoVenta.padStart(4, "0")}-${input.numeroComprobante.padStart(8, "0")} para este proveedor.`,
    );
  }

  // 3. Validar tipo: Si es Nota de Crédito/Débito, requiere factura corregida
  const tipos = await repo.listarTiposComprobante();
  const tipoDoc = tipos.find((t) => t.id === input.tipoComprobanteId);
  const nombreTipo = tipoDoc ? tipoDoc.nombre.toLowerCase() : "";

  if ((nombreTipo.includes("crédito") || nombreTipo.includes("débito")) && !input.comprobanteCorregidoId) {
    throw new BusinessRuleError(
      "COMPROBANTE_ORIGINAL_REQUERIDO",
      "Las Notas de Crédito y Notas de Débito requieren asociar obligatoriamente la factura que corrigen.",
    );
  }

  // 4. Calcular subtotales y monto total
  const lineasInsert: LineaComprobanteInput[] = input.lineas.map((l) => {
    const subtotal = l.subtotal !== undefined ? l.subtotal : round2(l.cantidad * l.precioFacturado);
    return {
      articuloId: l.articuloId,
      cantidad: l.cantidad,
      precioFacturado: l.precioFacturado,
      subtotal,
    };
  });

  const montoTotal = input.montoTotal !== undefined ? input.montoTotal : round2(lineasInsert.reduce((acc, l) => acc + l.subtotal, 0));

  // 5. Transacción: Insertar Cabecera + Líneas + Auditoría
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const comprobanteId = await repo.insertarCabecera(client, {
      proveedorId: input.proveedorId,
      tipoComprobanteId: input.tipoComprobanteId,
      letra: input.letra,
      puntoVenta: input.puntoVenta.padStart(4, "0"),
      numeroComprobante: input.numeroComprobante.padStart(8, "0"),
      fechaEmision: input.fechaEmision,
      fechaVencimiento: input.fechaVencimiento,
      ordenCompraId: input.ordenCompraId,
      comprobanteCorregidoId: input.comprobanteCorregidoId,
      montoTotal,
      usuarioId,
    });

    await repo.insertarLineas(client, comprobanteId, lineasInsert);

    // Con el MISMO client: desde otra conexión del pool estas filas todavía no
    // existen (falta el COMMIT). Sin esto la relectura devolvía null, el `!` lo
    // tapaba en compilación, y el mapper reventaba — o sea que el alta SIEMPRE
    // terminaba en 500 y ROLLBACK.
    const comprobanteCreado = await repo.obtenerPorId(comprobanteId, client);
    const detallesCreados = await repo.obtenerDetalles(comprobanteId, client);

    if (!comprobanteCreado) {
      // No debería pasar nunca, pero si pasa que se vea como lo que es en vez
      // de romper con un TypeError adentro del mapper.
      throw new Error(`El comprobante ${comprobanteId} no se pudo releer tras insertarlo.`);
    }

    return mapper.toComprobanteDTO(comprobanteCreado, detallesCreados);
  });
}

export async function anular(id: number, _input: AnularComprobanteInput, usuarioId: number) {
  const comprobanteOriginal = await repo.obtenerPorId(id);
  if (!comprobanteOriginal) {
    throw new NotFoundError("comprobante", id);
  }

  if (comprobanteOriginal.estado === "anulado") {
    throw new BusinessRuleError("YA_ANULADO", "El comprobante ya se encuentra anulado.");
  }

  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const nuevoNumero = `${Date.now()}`.slice(-8);

    await repo.insertarCabecera(client, {
      proveedorId: comprobanteOriginal.proveedor_id,
      tipoComprobanteId: comprobanteOriginal.tipo_comprobante_id,
      letra: comprobanteOriginal.letra,
      puntoVenta: comprobanteOriginal.punto_venta,
      numeroComprobante: nuevoNumero,
      fechaEmision: new Date().toISOString().slice(0, 10),
      fechaVencimiento: new Date().toISOString().slice(0, 10),
      ordenCompraId: comprobanteOriginal.orden_compra_id,
      anulaComprobanteId: comprobanteOriginal.id,
      montoTotal: 0,
      usuarioId,
    });

    // Mismo motivo: el trigger `fn_anula_comprobante_proveedor` ya pasó el
    // original a 'anulado' dentro de ESTA transacción, y desde otra conexión
    // seguiría figurando vigente.
    const actualizado = await repo.obtenerPorId(comprobanteOriginal.id, client);

    if (!actualizado) {
      throw new Error(`El comprobante ${comprobanteOriginal.id} no se pudo releer tras anularlo.`);
    }

    return mapper.toComprobanteDTO(actualizado);
  });
}
