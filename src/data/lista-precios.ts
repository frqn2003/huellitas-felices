// Contrato de la Lista de Precios de venta (HU-STK-03): la forma EXACTA que
// devuelven GET /api/lista-precios y GET /api/lista-precios/historial
// (src/modules/precios/precio.mapper.ts). Los datos salen de la base
// (`lista_precio` e `historial_precios`); acá solo viven los tipos.

/** Una fila del listado: artículo + su precio vigente (null = sin precio cargado). */
export interface FilaListaPrecio {
  /** PK de `lista_precio`; null = el artículo todavía no tiene precio (HF047). */
  precioId: number | null;
  /** FK → articulo.id. Es la identidad de la fila en pantalla y en el historial. */
  articuloId: number;
  /**
   * `articulo.codigo`, NO una columna de `lista_precio`. Lo genera el trigger
   * `fn_generar_cod_articulo` a partir del PREFIJO DE LA CATEGORÍA, con 6
   * dígitos: MED-000001, INS-000001, ALI-000001, ACC-000001.
   *
   * Los seeds respetan esa regla para que esta pantalla muestre el mismo
   * código que la de Artículos (HU-STK-01/02). Solo hay 4 prefijos porque hay
   * 4 categorías: un "Antiparasitario" es un MED, no un ANT. Cuando la API
   * reemplace los seeds, el código llega de la base y esto deja de aplicar.
   */
  codigo: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  /** La tabla `unidad_medida` tiene más valores que el dict viejo del front. */
  unidadMedida: string;
  fabricante: string;
  /** Fecha ISO (YYYY-MM-DD) o null. Solo lectura en el modal. */
  fechaVencimiento: string | null;
  /** Ruta pública de la imagen. Vacío = sin imagen (ArticuloThumb muestra el placeholder). */
  imagenUrl: string;
  /**
   * `articulo.estado` (enum `estado_activo_inactivo`), NO una columna de
   * `lista_precio`. Se muestra acá porque define qué artículos aceptan precio:
   * `fn_abm_lista_precio` rechaza los inactivos (esquema l.40) y los combos
   * deben filtrar por `estado = 'activo'` (esquema l.308).
   */
  estado: "activo" | "inactivo";
  /** numeric(12,2) CHECK >= 0. null = sin fila en `lista_precio`. */
  precio: number | null;
  /** date de `lista_precio.vigencia_desde`; lo reasigna el trigger al cambiar el precio. */
  vigenciaDesde: string | null;
  /**
   * usuario_id de `lista_precio` (FK NOT NULL) y su nombre resuelto por JOIN.
   * En pantalla es SIEMPRE el de la sesión: nunca es un input.
   */
  usuarioId: number | null;
  usuarioNombre: string | null;
  /**
   * `lista_precio.fecha_registro` (esquema l.37): cuándo se INSERTÓ la fila.
   * NO cambia nunca — la base no tiene ningún trigger que lo toque. Sirve para
   * saber desde cuándo existe el precio, no cuándo se lo tocó por última vez.
   */
  fechaRegistro: string | null;
  /**
   * `lista_precio.updated_at` (esquema l.38): cuándo fue el último UPDATE. Lo
   * mantiene `trg_lista_precio_updated_at` en CADA update (l.201), por eso se
   * mueve aunque el importe no cambie. Es el campo que significa "último cambio".
   */
  updatedAt: string | null;
  /**
   * No es columna de `lista_precio`: viene de la última orden de compra.
   * BACKEND: GET /api/articulos/:id/ultimo-precio-compra → { precio } (null = nunca se compró).
   */
  costoRefOc: number | null;
}

/** Una vigencia archivada. Solo lectura desde la app: la escribe el trigger `fn_historial_precios`. */
export interface HistorialPrecio {
  /** PK de `historial_precios`. */
  id: number;
  articuloId: number;
  precio: number;
  /**
   * date YYYY-MM-DD (esquema l.48). Marca el INICIO del período. Ojo: es una
   * `date`, no un timestamp — la hora de la columna "Vigencia desde" de la
   * pantalla sale de `fechaHora`, que es otro campo.
   */
  vigenciaDesde: string;
  /**
   * date YYYY-MM-DD; null = vigencia abierta (vigente) (esquema l.49). La cierra
   * el trigger `fn_historial_precios` con `vigencia_desde - 1 día`, así que es
   * siempre una `date` y nunca lleva hora.
   *
   * NO hay columna `estado` en `historial_precios`, y no hace falta: de este
   * campo se deriva el badge de la columna "Estado" — null = "Vigente",
   * con fecha = "Finalizada". No persistir el estado: ya está en el dato.
   */
  vigenciaHasta: string | null;
  usuarioId: number;
  usuarioNombre: string;
  /** timestamp ISO: fecha_hora del cambio, orden de la pantalla de historial. */
  fechaHora: string;
}
