export type UnidadMedida = "Unidad" | "Kg" | "L" | "mL" | "Caja";

export type Categoria = "Medicamentos" | "Insumos" | "Alimentos" | "Accesorios";

export interface Proveedor {
  id: number;
  nombre: string;
}

export interface Articulo {
  id: number;
  /** Lo genera la base (trigger fn_generar_cod_articulo): MED-000001. Solo lectura. */
  codigo: string;
  nombre: string;
  descripcion: string;
  // Categoría, unidad, fabricante y presentación son TABLAS en la base. La API
  // devuelve el id (lo que necesita el formulario para su select) y el nombre
  // (lo que muestra la tabla), así ninguna pantalla tiene que resolver la otra
  // mitad. Los ids siguen el nombre del dict (snake_case, convención C1).
  categoriaId: number;
  categoria: Categoria;
  unidadMedidaId: number;
  unidadMedida: UnidadMedida;
  fabricante_id: number;
  fabricante: string;
  /** FK → presentacion.id (dict: NOT NULL). BACKEND: la API aún no lo emite. */
  presentacion_id?: number;
  /** Presentación comercial (comprimido, frasco, caja...). BACKEND: GET /api/presentaciones. */
  presentacion?: string;
  /** Nro. de lote (dict: opcional). BACKEND: pendiente en la API. */
  numero_lote?: string;
  /** Fecha de vencimiento ISO (YYYY-MM-DD). BACKEND: pendiente en la API. */
  fecha_vencimiento?: string;
  /** Contenido neto (dict: numeric(10,2), default 1). BACKEND: pendiente en la API. */
  contenido_neto?: string;
  proveedorPreferido: Proveedor | null;
  /** Valor crudo del enum de la BD (C3): "activo" | "inactivo". Las pantallas
      muestran "Activo"/"Inactivo" en badges, filtros y CSV. */
  estado: "activo" | "inactivo";
  /** Ruta pública de la imagen (`/uploads/articulos/...`). Vacío = sin imagen. */
  imagen_url: string;
  /** dict: created_at/updated_at los pone la base. Solo lectura. */
  created_at: string;
  updated_at: string;
}

/** Catálogos que pobla el formulario. GET /api/articulos/catalogos */
export interface CatalogosArticulo {
  categorias: { id: number; nombre: string }[];
  unidadesMedida: { id: number; nombre: string }[];
  fabricantes: { id: number; nombre: string }[];
  proveedores: { id: number; nombre: string }[];
  /** BACKEND: el back los agrega a GET /api/articulos/catalogos cuando existan
      los catálogos `presentacion` y `fabricante`; el front cae a los
      placeholders PRESENTACIONES / FABRICANTES de este archivo (C2). */
  presentaciones?: { id: number; nombre: string }[];
}

export const CATEGORIAS: Categoria[] = [
  "Medicamentos",
  "Insumos",
  "Alimentos",
  "Accesorios",
];

export const UNIDADES: UnidadMedida[] = ["Unidad", "Kg", "L", "mL", "Caja"];

// Catálogo `presentacion` (dict: id, nombre UNIQUE). Placeholder C2: la API
// todavía no lo expone; el formulario cae acá hasta que GET /api/presentaciones
// exista. Los ids son las PK que mandará la base.
export const PRESENTACIONES: { id: number; nombre: string }[] = [
  { id: 1, nombre: "Comprimido" },
  { id: 2, nombre: "Cápsula" },
  { id: 3, nombre: "Frasco" },
  { id: 4, nombre: "Ampolla" },
  { id: 5, nombre: "Sobre" },
  { id: 6, nombre: "Bolsa" },
  { id: 7, nombre: "Caja" },
  { id: 8, nombre: "Tubo" },
  { id: 9, nombre: "Unidad" },
];

// BACKEND: poblar desde GET /api/fabricantes.
export const FABRICANTES: { id: number; nombre: string }[] = [
  { id: 1, nombre: "Laboratorios Pharma S.A." },
  { id: 2, nombre: "Nipro Medical" },
  { id: 3, nombre: "Nutribalance" },
  { id: 4, nombre: "Vetmed Labs" },
  { id: 5, nombre: "Safetech" },
  { id: 6, nombre: "PetNourish" },
  { id: 7, nombre: "DentalPets" },
];

// BACKEND: poblar desde GET /api/proveedores. Cada `id` es la PK en la base de datos.
export const PROVEEDORES: Proveedor[] = [
  { id: 5, nombre: "Laboratorios Pharma S.A." },
  { id: 8, nombre: "Vetmed Labs" },
  { id: 12, nombre: "Distribuidora Mascotas Felices" },
  { id: 15, nombre: "Agroalimentos del Sur" },
];

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

// YA NO LO USA /articulos: esa pantalla lee de GET /api/articulos. Tampoco lo
// usan Stock, Órdenes de Compra ni Cotizaciones (todos leen la API). Se
// conserva como placeholder de catálogo (C2); se puede borrar cuando no haga
// falta un json de referencia para el front.
// BACKEND: la API ya entrega los artículos (GET /api/articulos).
export const articulosIniciales: Articulo[] = [
  {
    id: 1,
    codigo: "ART001",
    nombre: "Amoxicilina 500mg",
    descripcion: "Antibiótico de amplio espectro para infecciones bacterianas",
    presentacion_id: 1,
    presentacion: "Comprimido",
    numero_lote: "L-2691",
    fecha_vencimiento: "2027-04-30",
    contenido_neto: "500",
    fabricante_id: 1,
    fabricante: "Laboratorios Pharma S.A.",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 1,
    categoria: "Medicamentos",
    proveedorPreferido: { id: 5, nombre: "Laboratorios Pharma S.A." },
    estado: "activo",
    imagen_url: "",
    created_at: "2025-01-15T10:30:00Z",
    updated_at: "2025-06-20T14:15:00Z",
  },
  {
    id: 2,
    codigo: "ART002",
    nombre: "Jeringa 5ml",
    descripcion: "Jeringa descartable con aguja 21G",
    presentacion_id: 9,
    presentacion: "Unidad",
    fabricante_id: 2,
    fabricante: "Nipro Medical",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 2,
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "inactivo",
    imagen_url: "",
    created_at: "2025-02-10T09:00:00Z",
    updated_at: "2025-07-01T16:20:00Z",
  },
  {
    id: 3,
    codigo: "ART003",
    nombre: "Alimento Premium para Perros",
    descripcion: "Alimento balanceado de alta calidad, bolsa 15kg",
    presentacion_id: 7,
    presentacion: "Caja",
    numero_lote: "L-4125",
    fecha_vencimiento: "2026-11-15",
    contenido_neto: "15",
    fabricante_id: 1,
    fabricante: "Nutribalance",
    unidadMedidaId: 2,
    unidadMedida: "Kg",
    categoriaId: 3,
    categoria: "Alimentos",
    proveedorPreferido: { id: 12, nombre: "Distribuidora Mascotas Felices" },
    estado: "activo",
    imagen_url: "",
    created_at: "2025-03-05T11:45:00Z",
    updated_at: "2025-08-12T08:30:00Z",
  },
  {
    id: 4,
    codigo: "ART004",
    nombre: "Ivermectina 1%",
    descripcion: "Antiparasitario inyectable para uso veterinario",
    presentacion_id: 4,
    presentacion: "Ampolla",
    numero_lote: "L-7382",
    fecha_vencimiento: "2026-09-10",
    contenido_neto: "50",
    fabricante_id: 1,
    fabricante: "Laboratorios Pharma S.A.",
    unidadMedidaId: 4,
    unidadMedida: "mL",
    categoriaId: 1,
    categoria: "Medicamentos",
    proveedorPreferido: { id: 5, nombre: "Laboratorios Pharma S.A." },
    estado: "activo",
    imagen_url: "",
    created_at: "2025-03-20T10:00:00Z",
    updated_at: "2025-08-30T12:00:00Z",
  },
  {
    id: 5,
    codigo: "ART005",
    nombre: "Guantes de látex talla M",
    descripcion: "Guantes descartables para procedimientos",
    fabricante_id: 1,
    fabricante: "Safetech",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 2,
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "activo",
    imagen_url: "",
    created_at: "2025-04-02T08:30:00Z",
    updated_at: "2025-07-15T10:45:00Z",
  },
  {
    id: 6,
    codigo: "ART006",
    nombre: "Comida Húmeda para Gatos",
    descripcion: "Sobre 85g, fórmula adulto castrado",
    fabricante_id: 1,
    fabricante: "PetNourish",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 3,
    categoria: "Alimentos",
    proveedorPreferido: { id: 12, nombre: "Distribuidora Mascotas Felices" },
    estado: "activo",
    imagen_url: "",
    created_at: "2025-04-18T14:00:00Z",
    updated_at: "2025-08-01T09:20:00Z",
  },
  {
    id: 7,
    codigo: "ART007",
    nombre: "Vitamina B12",
    descripcion: "Complejo B12 inyectable, frasco 100ml",
    fabricante_id: 4,
    fabricante: "Vetmed Labs",
    unidadMedidaId: 4,
    unidadMedida: "mL",
    categoriaId: 1,
    categoria: "Medicamentos",
    proveedorPreferido: { id: 8, nombre: "Vetmed Labs" },
    estado: "activo",
    imagen_url: "",
    created_at: "2025-05-06T09:15:00Z",
    updated_at: "2025-08-10T17:00:00Z",
  },
  {
    id: 8,
    codigo: "ART008",
    nombre: "Algodón quirúrgico",
    descripcion: "Paquete 100g de algodón hidrófilo",
    fabricante_id: 1,
    fabricante: "Safetech",
    unidadMedidaId: 2,
    unidadMedida: "Kg",
    categoriaId: 2,
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "activo",
    imagen_url: "",
    created_at: "2025-05-22T11:00:00Z",
    updated_at: "2025-07-28T15:30:00Z",
  },
  {
    id: 9,
    codigo: "ART009",
    nombre: "Seda dental canina",
    descripcion: "Kit de limpieza dental para perros",
    fabricante_id: 1,
    fabricante: "DentalPets",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 2,
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "inactivo",
    imagen_url: "",
    created_at: "2025-06-01T10:30:00Z",
    updated_at: "2025-08-05T11:45:00Z",
  },
  {
    id: 10,
    codigo: "ART010",
    nombre: "Pipeta antipulgas 40kg",
    descripcion: "Pipeta spot-on para perros de más de 40kg",
    fabricante_id: 4,
    fabricante: "Vetmed Labs",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 1,
    categoria: "Medicamentos",
    proveedorPreferido: { id: 8, nombre: "Vetmed Labs" },
    estado: "activo",
    imagen_url: "",
    created_at: "2025-06-15T13:00:00Z",
    updated_at: "2025-09-01T08:00:00Z",
  },
  {
    id: 11,
    codigo: "ART011",
    nombre: "Snack hipoalergénico",
    descripcion: "Premios sin cereales, sabor cordero",
    fabricante_id: 1,
    fabricante: "PetNourish",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 3,
    categoria: "Alimentos",
    proveedorPreferido: { id: 12, nombre: "Distribuidora Mascotas Felices" },
    estado: "activo",
    imagen_url: "",
    created_at: "2025-07-10T16:20:00Z",
    updated_at: "2025-09-05T10:10:00Z",
  },
  {
    id: 12,
    codigo: "ART012",
    nombre: "Gasas estériles 10x10",
    descripcion: "Paquete de 10 gasas estériles para curación",
    fabricante_id: 1,
    fabricante: "Safetech",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 2,
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "activo",
    imagen_url: "",
    created_at: "2025-07-25T09:40:00Z",
    updated_at: "2025-09-08T14:25:00Z",
  },
];
