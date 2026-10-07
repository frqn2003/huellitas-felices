/**
 * HU-PROV-01 — validación de input.
 *
 * El schema ya no vive acá: se mudó a `src/contracts/proveedor.ts`, que es el
 * archivo que importan las DOS mitades del equipo (ver la forma de trabajo
 * "contrato primero").
 *
 * Mientras estaba en este módulo, el front no tenía forma de importarlo sin
 * meter mano en `src/modules/`, que es territorio del back. Así que no lo
 * importaba: escribía el body a mano y esperaba haber acertado los nombres.
 * Durante semanas no acertó (`razon_social` contra `razonSocial`) y el alta
 * devolvía 422.
 *
 * Este archivo queda como puerta del módulo para no tocar los imports de las
 * rutas y el service. Los nombres son los de siempre.
 *
 * OJO: la validación de CUIT duplicado NO va en el schema. Un schema valida
 * forma, no reglas que necesiten consultar la base. Eso es del service.
 */

export {
  crearProveedorBody as crearProveedorSchema,
  editarProveedorBody as editarProveedorSchema,
} from "@/contracts/proveedor";

export type { CrearProveedorInput } from "@/contracts/proveedor";
