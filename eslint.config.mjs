import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Catálogos que son TABLAS de la base y por lo tanto no pueden vivir como
 * arrays fijos en el front.
 *
 * POR QUÉ ESTA REGLA
 *   Los selects de la app se poblaban con listas escritas a mano en
 *   `src/data/*`. Eso falló de tres formas distintas, todas en silencio:
 *
 *     · `PROVEEDORES` (src/data/articulos.ts) tenía ids 5, 8, 12, 15, que no
 *       existen en la base. Los filtros de Artículos y de Órdenes de Compra
 *       devolvían SIEMPRE cero resultados.
 *     · `proveedoresOpts` (FiltrosComprobantes) tenía ids 1/2/3 con nombres
 *       inventados: el filtro traía los comprobantes de otro proveedor que el
 *       que decía la opción elegida.
 *     · `FORMAS_PAGO` coincidía con el seed de casualidad; agregar una forma de
 *       pago en la base no la mostraba en ningún formulario.
 *
 *   Ninguno de los tres rompía la compilación ni tiraba un error. La regla
 *   existe para que el próximo intento falle en `npm run lint` y no en
 *   producción.
 *
 * QUÉ HACER EN SU LUGAR
 *   Pedir el catálogo a la API con `useCatalogo` (src/lib/use-catalogo.ts):
 *
 *     const proveedores = useCatalogo<ProveedorOpcion>("/api/proveedores?estado=activo");
 *
 *   y pasárselo al componente por prop. Si la pantalla ya trae varios
 *   catálogos en un `Promise.all`, sumarlo ahí.
 *
 * QUÉ **NO** ALCANZA ESTA REGLA (y está bien)
 *   Las listas que no son tablas: enums del dominio (`tiposMovimiento`),
 *   opciones de UI ("Todos"), textos sugeridos (`OBSERVACIONES_RECEPCION`),
 *   y los catálogos de módulos que todavía no tienen API (turnos, mascotas,
 *   clientes). Esos siguen siendo constantes a propósito.
 *
 *   La regla para decidir: si la opción lleva un `id` que viaja a la base,
 *   tiene que venir de la base.
 */
const CATALOGOS_QUE_SON_TABLAS = [
  {
    name: "@/data/formas-pago",
    importNames: ["FORMAS_PAGO"],
    message:
      "`forma_pago` es una tabla: usá useCatalogo<FormaPago>('/api/formas-pago') " +
      "en vez del array fijo. Importar el TIPO (`import type { FormaPago }`) sí está bien.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Solo el front: los `src/modules/**` mapean contra estos tipos y no
    // renderizan selects.
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}", "src/context/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { paths: CATALOGOS_QUE_SON_TABLAS }],
    },
  },
  {
    // `src/data/` es donde viven las definiciones: no puede prohibirse a sí mismo.
    files: ["src/data/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
