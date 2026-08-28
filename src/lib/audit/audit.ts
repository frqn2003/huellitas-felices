import type { PoolClient } from "pg";

/**
 * Auditoría — HU-SIS-06 y criterio de aceptación de las 5 HU del Sprint 1.
 *
 * El registro lo escribe un TRIGGER de Postgres (ver db/migrations/0005_auditoria.sql),
 * no la aplicación. Razones:
 *   · HU-SIS-06 exige que nadie pueda editar ni borrar entradas → se garantiza
 *     en el motor, no por confianza en el código.
 *   · Un trigger no se puede olvidar cuando se agrega un endpoint nuevo.
 *
 * Lo único que la app tiene que hacer es decirle al trigger QUIÉN está operando,
 * y eso viaja por una variable de sesión de Postgres.
 */

/**
 * Fija el usuario responsable para el trigger de auditoría.
 *
 * ⚠️ LLAMAR AL PRINCIPIO DE TODA TRANSACCIÓN QUE ESCRIBA. Si se olvida, la
 * operación funciona igual pero la fila de auditoría queda con usuario_id NULL
 * — o sea, un registro que no sirve para auditar.
 *
 * El tercer parámetro de set_config en `true` significa SET LOCAL: la variable
 * vive solo lo que dura la transacción, así que no se filtra a la próxima
 * operación que reuse la misma conexión del pool.
 *
 *   await withTransaction(async (client) => {
 *     await withAuditUser(client, usuarioId);
 *     ...
 *   });
 */
export async function withAuditUser(client: PoolClient, usuarioId: number): Promise<void> {
  await client.query("SELECT set_config('app.usuario_id', $1, true)", [String(usuarioId)]);
}

/**
 * Registro manual, para lo que el trigger no puede ver.
 *
 * El trigger cubre altas, modificaciones y bajas de tablas. Esto es para
 * eventos que no son un cambio de fila: inicio de sesión, exportaciones,
 * intentos rechazados que igual conviene dejar asentados.
 */
export async function registrarEvento(
  client: PoolClient,
  datos: {
    usuarioId: number;
    accion: string;
    modulo: string;
    entidad: string;
    entidadId?: number;
    valorAnterior?: unknown;
    valorNuevo?: unknown;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO auditoria
       (usuario_id, accion, modulo, entidad, entidad_id, valor_anterior, valor_nuevo)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      datos.usuarioId,
      datos.accion,
      datos.modulo,
      datos.entidad,
      datos.entidadId ?? null,
      datos.valorAnterior ? JSON.stringify(datos.valorAnterior) : null,
      datos.valorNuevo ? JSON.stringify(datos.valorNuevo) : null,
    ],
  );
}
