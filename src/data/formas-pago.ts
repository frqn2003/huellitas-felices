/**
 * Fila del catálogo `forma_pago`.
 *
 * Acá vivía también un array FORMAS_PAGO con las 5 filas escritas a mano
 * ("decisión D4"). Se borró: el catálogo lo sirve GET /api/formas-pago, y la
 * copia local solo coincidía con el seed de casualidad — agregar una forma de
 * pago en la base no la mostraba en ningún formulario, y renombrar una rompía
 * en silencio la traducción nombre → id del alta de proveedores.
 *
 * La misma tabla se expone también como GET /api/condiciones-pago para las
 * pantallas de compras (ver src/app/api/condiciones-pago/route.ts).
 *
 * Queda solo el TIPO, que es lo único que el front necesita declarar.
 */
export interface FormaPago {
  id: number;
  nombre: string;
}
