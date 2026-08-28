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
  // Categoría, unidad y fabricante son TABLAS en la base. La API devuelve el id
  // (lo que necesita el formulario para su select) y el nombre (lo que muestra
  // la tabla), así ninguna pantalla tiene que resolver la otra mitad.
  categoriaId: number;
  categoria: Categoria;
  unidadMedidaId: number;
  unidadMedida: UnidadMedida;
  fabricanteId: number;
  fabricante: string;
  proveedorPreferido: Proveedor | null;
  estado: "Activo" | "Inactivo";
  /** Ruta pública de la imagen (`/uploads/articulos/...`). Vacío = sin imagen. */
  imagen: string;
  createdAt: string;
  updatedAt: string;
  activo: boolean;
}

/** Catálogos que pobla el formulario. GET /api/articulos/catalogos */
export interface CatalogosArticulo {
  categorias: { id: number; nombre: string }[];
  unidadesMedida: { id: number; nombre: string }[];
  fabricantes: { id: number; nombre: string }[];
  proveedores: { id: number; nombre: string }[];
}

export const CATEGORIAS: Categoria[] = [
  "Medicamentos",
  "Insumos",
  "Alimentos",
  "Accesorios",
];

export const UNIDADES: UnidadMedida[] = ["Unidad", "Kg", "L", "mL", "Caja"];

// BACKEND: poblar desde GET /api/proveedores. Cada `id` es la PK en la base de datos.
export const PROVEEDORES: Proveedor[] = [
  { id: 5, nombre: "Laboratorios Pharma S.A." },
  { id: 8, nombre: "Vetmed Labs" },
  { id: 12, nombre: "Distribuidora Mascotas Felices" },
  { id: 15, nombre: "Agroalimentos del Sur" },
];

export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

// YA NO LO USA /articulos: esa pantalla lee de GET /api/articulos.
// Sigue acá porque Stock, Órdenes de Compra y Cotizaciones todavía están
// hardcodeados y lo necesitan. Se borra cuando se conecte el último de los tres.
// BACKEND: reemplazar por GET /api/articulos en esos tres módulos.
export const articulosIniciales: Articulo[] = [
  {
    id: 1,
    codigo: "ART001",
    nombre: "Amoxicilina 500mg",
    descripcion: "Antibiótico de amplio espectro para infecciones bacterianas",
    fabricanteId: 1,
    fabricante: "Laboratorios Pharma S.A.",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 1,
    categoria: "Medicamentos",
    proveedorPreferido: { id: 5, nombre: "Laboratorios Pharma S.A." },
    estado: "Activo",
    imagen: "",
    createdAt: "2025-01-15T10:30:00Z",
    updatedAt: "2025-06-20T14:15:00Z",
    activo: true,
  },
  {
    id: 2,
    codigo: "ART002",
    nombre: "Jeringa 5ml",
    descripcion: "Jeringa descartable con aguja 21G",
    fabricanteId: 2,
    fabricante: "Nipro Medical",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 2,
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "Inactivo",
    imagen: "",
    createdAt: "2025-02-10T09:00:00Z",
    updatedAt: "2025-07-01T16:20:00Z",
    activo: false,
  },
  {
    id: 3,
    codigo: "ART003",
    nombre: "Alimento Premium para Perros",
    descripcion: "Alimento balanceado de alta calidad, bolsa 15kg",
    fabricanteId: 1,
    fabricante: "Nutribalance",
    unidadMedidaId: 2,
    unidadMedida: "Kg",
    categoriaId: 3,
    categoria: "Alimentos",
    proveedorPreferido: { id: 12, nombre: "Distribuidora Mascotas Felices" },
    estado: "Activo",
    imagen: "",
    createdAt: "2025-03-05T11:45:00Z",
    updatedAt: "2025-08-12T08:30:00Z",
    activo: true,
  },
  {
    id: 4,
    codigo: "ART004",
    nombre: "Ivermectina 1%",
    descripcion: "Antiparasitario inyectable para uso veterinario",
    fabricanteId: 1,
    fabricante: "Laboratorios Pharma S.A.",
    unidadMedidaId: 4,
    unidadMedida: "mL",
    categoriaId: 1,
    categoria: "Medicamentos",
    proveedorPreferido: { id: 5, nombre: "Laboratorios Pharma S.A." },
    estado: "Activo",
    imagen: "",
    createdAt: "2025-03-20T10:00:00Z",
    updatedAt: "2025-08-30T12:00:00Z",
    activo: true,
  },
  {
    id: 5,
    codigo: "ART005",
    nombre: "Guantes de látex talla M",
    descripcion: "Guantes descartables para procedimientos",
    fabricanteId: 1,
    fabricante: "Safetech",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 2,
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "Activo",
    imagen: "",
    createdAt: "2025-04-02T08:30:00Z",
    updatedAt: "2025-07-15T10:45:00Z",
    activo: true,
  },
  {
    id: 6,
    codigo: "ART006",
    nombre: "Comida Húmeda para Gatos",
    descripcion: "Sobre 85g, fórmula adulto castrado",
    fabricanteId: 1,
    fabricante: "PetNourish",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 3,
    categoria: "Alimentos",
    proveedorPreferido: { id: 12, nombre: "Distribuidora Mascotas Felices" },
    estado: "Activo",
    imagen: "",
    createdAt: "2025-04-18T14:00:00Z",
    updatedAt: "2025-08-01T09:20:00Z",
    activo: true,
  },
  {
    id: 7,
    codigo: "ART007",
    nombre: "Vitamina B12",
    descripcion: "Complejo B12 inyectable, frasco 100ml",
    fabricanteId: 4,
    fabricante: "Vetmed Labs",
    unidadMedidaId: 4,
    unidadMedida: "mL",
    categoriaId: 1,
    categoria: "Medicamentos",
    proveedorPreferido: { id: 8, nombre: "Vetmed Labs" },
    estado: "Activo",
    imagen: "",
    createdAt: "2025-05-06T09:15:00Z",
    updatedAt: "2025-08-10T17:00:00Z",
    activo: true,
  },
  {
    id: 8,
    codigo: "ART008",
    nombre: "Algodón quirúrgico",
    descripcion: "Paquete 100g de algodón hidrófilo",
    fabricanteId: 1,
    fabricante: "Safetech",
    unidadMedidaId: 2,
    unidadMedida: "Kg",
    categoriaId: 2,
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "Activo",
    imagen: "",
    createdAt: "2025-05-22T11:00:00Z",
    updatedAt: "2025-07-28T15:30:00Z",
    activo: true,
  },
  {
    id: 9,
    codigo: "ART009",
    nombre: "Seda dental canina",
    descripcion: "Kit de limpieza dental para perros",
    fabricanteId: 1,
    fabricante: "DentalPets",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 2,
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "Inactivo",
    imagen: "",
    createdAt: "2025-06-01T10:30:00Z",
    updatedAt: "2025-08-05T11:45:00Z",
    activo: false,
  },
  {
    id: 10,
    codigo: "ART010",
    nombre: "Pipeta antipulgas 40kg",
    descripcion: "Pipeta spot-on para perros de más de 40kg",
    fabricanteId: 4,
    fabricante: "Vetmed Labs",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 1,
    categoria: "Medicamentos",
    proveedorPreferido: { id: 8, nombre: "Vetmed Labs" },
    estado: "Activo",
    imagen: "",
    createdAt: "2025-06-15T13:00:00Z",
    updatedAt: "2025-09-01T08:00:00Z",
    activo: true,
  },
  {
    id: 11,
    codigo: "ART011",
    nombre: "Snack hipoalergénico",
    descripcion: "Premios sin cereales, sabor cordero",
    fabricanteId: 1,
    fabricante: "PetNourish",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 3,
    categoria: "Alimentos",
    proveedorPreferido: { id: 12, nombre: "Distribuidora Mascotas Felices" },
    estado: "Activo",
    imagen: "",
    createdAt: "2025-07-10T16:20:00Z",
    updatedAt: "2025-09-05T10:10:00Z",
    activo: true,
  },
  {
    id: 12,
    codigo: "ART012",
    nombre: "Gasas estériles 10x10",
    descripcion: "Paquete de 10 gasas estériles para curación",
    fabricanteId: 1,
    fabricante: "Safetech",
    unidadMedidaId: 1,
    unidadMedida: "Unidad",
    categoriaId: 2,
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "Activo",
    imagen: "",
    createdAt: "2025-07-25T09:40:00Z",
    updatedAt: "2025-09-08T14:25:00Z",
    activo: true,
  },
];
