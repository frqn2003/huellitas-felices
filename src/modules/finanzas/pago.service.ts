import { withTransaction } from "@/lib/db/tx";
import { withAuditUser } from "@/lib/audit/audit";
import { BusinessRuleError, NotFoundError, traducirErrorPostgres } from "@/lib/http/errors";
import * as repo from "./pago.repo";
import * as ctacte from "./ctacte.service";
import type { CrearPagoInput } from "./pago.schema";

/**
 * HU-FIN-02 — alta de un pago a proveedor.
 *
 * Criterio: "Registra los pagos realizados a cada comprobante, actualizando el
 * saldo pendiente en tiempo real".
 *
 * LO QUE ESTE SERVICE **NO** HACE, PORQUE LO HACE LA BASE
 *
 *   Cuatro triggers `BEFORE INSERT` sobre `pago_imputacion` validan, con
 *   `FOR UPDATE`, todo lo que depende del estado de la base:
 *
 *     fn_ck_suma_imputada           lo imputado no supera el monto del pago
 *     fn_ck_comprobante_no_excede   no supera el monto del comprobante, y
 *                                   (corrección 17) el comprobante no está
 *                                   anulado ni es una Nota de Crédito
 *     fn_ck_pi_mismo_tercero        el comprobante es de ese proveedor
 *     fn_pi_upsert_monto_imputado   consolida una imputación repetida
 *
 *   No se revalida ninguna. Los dos primeros toman lock: la versión en JS
 *   leería un snapshot y decidiría con datos viejos, así que bajo concurrencia
 *   daría un resultado distinto al de la base. Lo único que hace el service es
 *   traducir el error (ver `conCampo` abajo).
 *
 *   Tampoco escribe en `auditoria`: lo hacen `trg_auditoria_pago` y
 *   `trg_auditoria_pago_imputacion`. Lo único que hay que recordar es
 *   `withAuditUser()` al abrir la transacción.
 *
 * LO QUE SÍ PASA ACÁ
 *   Que el proveedor exista, y que el error de la línea N diga que fue la N.
 */

export async function registrar(
  input: CrearPagoInput,
  usuarioId: number,
): Promise<ctacte.DetalleCtaCte> {
  // Fuera de la transacción: es una lectura y no necesita el lock. Da un 404
  // con nombre en vez del `23503 → REFERENCIA_INVALIDA` genérico que devolvería
  // la foreign key.
  if (!(await repo.existeProveedorActivo(input.proveedorId))) {
    throw new NotFoundError("el proveedor", input.proveedorId);
  }

  return withTransaction(async (client) => {
    // Primero de todo: sin esto el trigger de auditoría guarda usuario_id NULL,
    // y una bitácora sin responsable no sirve para auditar.
    await withAuditUser(client, usuarioId);

    const pagoId = await repo.insertPago(
      {
        proveedorId: input.proveedorId,
        numeroComprobante: input.numeroComprobante,
        formaPagoId: input.formaPagoId,
        fecha: input.fecha.slice(0, 10),
        monto: input.monto,
        usuarioId,
      },
      client,
    );

    // De a una, para poder decir CUÁL falló. Un INSERT multi-fila devolvería un
    // solo error y el modal no sabría qué input pintar de rojo.
    for (const [i, imp] of input.imputaciones.entries()) {
      try {
        await repo.insertImputacion(
          { pagoId, comprobanteId: imp.comprobanteId, monto: imp.monto },
          client,
        );
      } catch (e) {
        throw conCampo(e, `imputaciones.${i}`);
      }
    }

    // Se devuelve el DETALLE COMPLETO, no el pago creado.
    //
    // Así el front hace `setState(respuesta)` y listo: el "saldo actualizado en
    // tiempo real" del criterio 2 sale sin un segundo viaje y sin que el
    // navegador recalcule ningún saldo — que es lo que hacía antes, y era una
    // tercera definición de "saldo pendiente" conviviendo con la vista.
    //
    // Se lee con el MISMO client: desde otra conexión del pool el pago todavía
    // no existe (falta el COMMIT) y la respuesta saldría con el saldo viejo.
    return ctacte.obtenerDetalle(input.proveedorId, client);
  });
}

/**
 * Le agrega a un error de la base cuál línea de la imputación lo causó.
 *
 * Los triggers no saben nada de "la línea 2": ven una fila por vez. El índice lo
 * tiene el loop, y es lo que hace que el modal pueda marcar el input correcto en
 * rojo en vez de mostrar un cartel general.
 *
 * Si no es un error que sepamos traducir, se devuelve tal cual para que lo
 * maneje `withRoute` — envolverlo en algo nuestro escondería el stack.
 */
function conCampo(e: unknown, campo: string): unknown {
  const traducido = traducirErrorPostgres(e);

  // Solo se re-etiquetan las reglas de negocio, que son las cinco HF01x de las
  // imputaciones. Cualquier otra cosa se devuelve tal cual: envolverla
  // escondería el stack de un error que sí es un bug.
  if (traducido instanceof BusinessRuleError) {
    return new BusinessRuleError(traducido.codigo, traducido.message, campo);
  }

  return traducido ?? e;
}

/**
 * Anula un pago y sus imputaciones.
 */
export async function anular(pagoId: number, usuarioId: number): Promise<ctacte.DetalleCtaCte> {
  return withTransaction(async (client) => {
    await withAuditUser(client, usuarioId);

    const info = await repo.obtenerInfoPago(pagoId, client);
    if (!info) {
      throw new NotFoundError("el pago", pagoId);
    }
    if (info.estado !== "vigente") {
      throw new BusinessRuleError("PAGO_NO_VIGENTE", "El pago ya se encuentra anulado.");
    }

    await repo.anularPago(pagoId, usuarioId, client);

    // Devuelve el detalle actualizado de la cuenta corriente
    return ctacte.obtenerDetalle(info.proveedor_id, client);
  });
}

