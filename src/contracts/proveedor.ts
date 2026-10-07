/**
 * CONTRATO — Proveedores (HU-PROV-01)
 *
 * Este archivo lo importan LAS DOS MITADES. Es el ejemplo de referencia de la
 * forma de trabajo "contrato primero": antes de que nadie escriba una pantalla
 * o un service, front y back se sientan y escriben ESTO.
 *
 * ── QUÉ TIENE QUE HABER EN UN CONTRATO (y nada más) ──────────────────────────
 *
 *   1. La RUTA        — para que el front no tipee la URL a mano.
 *   2. El REQUEST     — un schema de zod: valida en el back, tipa en el front.
 *   3. El RESPONSE    — un type: lo que el back promete devolver.
 *   4. Los ERRORES    — los códigos de dominio que este endpoint puede emitir.
 *
 * Lo que NO va: SQL, reglas de negocio, componentes, nada que dependa de la
 * base. Un contrato tiene que poder leerse entero en dos minutos, porque el
 * único momento en que sirve es cuando dos personas lo leen juntas.
 *
 * ── POR QUÉ UN ARCHIVO Y NO UN DOCUMENTO ─────────────────────────────────────
 *
 * El alta de proveedores estuvo rota durante semanas: el front mandaba
 * `razon_social` y el schema esperaba `razonSocial`. Las dos cosas estaban
 * escritas y documentadas. Nadie las comparó nunca, porque nada las comparaba.
 *
 * Con este archivo, esa misma equivocación no compila. Ese es el punto entero.
 *
 * ── LA REGLA QUE LO MANTIENE VIVO ────────────────────────────────────────────
 *
 * Si falta un campo, se cambia ESTE archivo primero, en un commit propio. Ese
 * commit rompe el typecheck de las dos mitades hasta que ambas se adapten.
 * Romper es la función, no el efecto secundario.
 */

import { z } from "zod";

// ─── 1. Rutas ────────────────────────────────────────────────────────────────

export const RUTA_PROVEEDORES = "/api/proveedores";
export const rutaProveedor = (id: number) => `${RUTA_PROVEEDORES}/${id}`;
export const rutaInactivarProveedor = (id: number) => `${RUTA_PROVEEDORES}/${id}/inactivar`;

// ─── 2. Request ──────────────────────────────────────────────────────────────

/** CUIT argentino: 11 dígitos, con o sin guiones (XX-XXXXXXXX-X). */
const cuit = z
  .string()
  .trim()
  .regex(/^\d{2}-?\d{8}-?\d$/, "El CUIT debe tener el formato XX-XXXXXXXX-X.");

/**
 * El cuerpo de POST /api/proveedores.
 *
 * `.strict()` NO es opcional. Sin él, zod descarta en silencio cualquier clave
 * que no esté declarada acá: el front cree que mandó el campo, el INSERT sale
 * sin él y la base contesta un 500 que no menciona nada de esto. Fue
 * exactamente el bug de `presentacion_id` en Artículos.
 *
 * Con `.strict()`, el mismo caso devuelve un 422 diciendo qué campo sobra.
 */
export const crearProveedorBody = z
  .object({
    razonSocial: z
      .string()
      .trim()
      .min(1, "La razón social es obligatoria.")
      .max(150, "La razón social no puede superar los 150 caracteres."),

    cuit,

    direccion: z.string().trim().max(255).optional(),
    telefono: z.string().trim().max(30).optional(),

    email: z
      .string()
      .trim()
      .max(120)
      .email("El email no tiene un formato válido.")
      .optional()
      .or(z.literal("").transform(() => undefined)),

    contacto: z.string().trim().max(100).optional(),

    plazoEntregaDias: z
      .number()
      .int("El plazo de entrega debe ser un número entero de días.")
      .min(0, "El plazo de entrega no puede ser negativo.")
      .max(365, "El plazo de entrega no puede superar los 365 días.")
      .optional(),

    formaPagoIds: z
      .array(z.number().int().positive())
      .min(1, "Elegí al menos una forma de pago.")
      .default([]),
  })
  .strict();

/** La edición manda lo mismo que el alta: es el mismo formulario. */
export const editarProveedorBody = crearProveedorBody;

/**
 * El tipo que usa el FRONT para armar el body.
 *
 * Ojo con cuál se usa de cada lado:
 *   - el front tipa lo que MANDA  → `input`  (antes de los `.default()`)
 *   - el back  recibe lo validado → `output` (después de los `.default()`)
 *
 * Si se usa `z.infer` en el front, `formaPagoIds` figura como obligatorio por
 * culpa del `.default([])`, y el front tendría que mandarlo siempre.
 */
export type CrearProveedorBody = z.input<typeof crearProveedorBody>;
export type CrearProveedorInput = z.output<typeof crearProveedorBody>;

// ─── 3. Response ─────────────────────────────────────────────────────────────

/**
 * Lo que devuelven GET, POST y PUT.
 *
 * Se re-exporta desde `src/data/proveedores.ts`, que hoy es donde el front lo
 * declara. A medida que las HU vayan pasando a esta forma de trabajo, el tipo
 * se muda acá y `src/data/` desaparece — pero mudarlo hoy tocaría veinte
 * imports por un cambio cosmético, y el contrato no gana nada con eso.
 *
 * El casing mezclado (`razon_social` junto a `formasPago`) es deuda conocida:
 * este módulo decidió hablar snake_case como la base. Un contrato describe lo
 * que HAY, no lo que nos gustaría; disimularlo acá sería mentir.
 */
export type { Proveedor as ProveedorResponse, EstadoProveedor } from "@/data/proveedores";

// ─── 4. Errores de dominio ───────────────────────────────────────────────────

/**
 * Lo que este endpoint puede contestar además de 200/201.
 *
 * Van en el contrato porque son parte de lo que el front tiene que saber
 * manejar. Si el back agrega un código y no lo pone acá, el front lo va a
 * mostrar como "error inesperado" — que es lo que pasa hoy con varios.
 */
export type ErrorProveedor =
  /** 409 — ya existe un proveedor con ese CUIT. */
  | "CUIT_DUPLICADO"
  /** 409 — no se puede inactivar: tiene órdenes de compra abiertas. */
  | "PROVEEDOR_CON_ORDENES_ABIERTAS"
  /** 404 — el id no existe. */
  | "NO_ENCONTRADO"
  /** 422 — el body no pasó el schema de arriba. */
  | "DATOS_INVALIDOS";
