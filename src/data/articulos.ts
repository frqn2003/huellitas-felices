export type UnidadMedida = "Unidad" | "Kg" | "L" | "mL" | "Caja";

export type Categoria = "Medicamentos" | "Insumos" | "Alimentos" | "Accesorios";

export interface Proveedor {
  id: number;
  nombre: string;
}

export interface Articulo {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  fabricante: string;
  unidadMedida: UnidadMedida;
  categoria: Categoria;
  proveedorPreferido: Proveedor | null;
  estado: "Activo" | "Inactivo";
  imagen: string;
  createdAt: string;
  updatedAt: string;
  activo: boolean;
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

// BACKEND: reemplazar por la respuesta de GET /api/articulos. El `id` de cada
// artículo es la PK en la base de datos (se usa para editar/desactivar).
// El campo `imagen` es la URL del archivo subido (vacío = sin imagen, se muestra una huella).
export const articulosIniciales: Articulo[] = [
  {
    id: 1,
    codigo: "ART001",
    nombre: "Amoxicilina 500mg",
    descripcion: "Antibiótico de amplio espectro para infecciones bacterianas",
    fabricante: "Laboratorios Pharma S.A.",
    unidadMedida: "Unidad",
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
    fabricante: "Nipro Medical",
    unidadMedida: "Unidad",
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
    fabricante: "Nutribalance",
    unidadMedida: "Kg",
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
    fabricante: "Laboratorios Pharma S.A.",
    unidadMedida: "mL",
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
    fabricante: "Safetech",
    unidadMedida: "Unidad",
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
    fabricante: "PetNourish",
    unidadMedida: "Unidad",
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
    fabricante: "Vetmed Labs",
    unidadMedida: "mL",
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
    fabricante: "Safetech",
    unidadMedida: "Kg",
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
    fabricante: "DentalPets",
    unidadMedida: "Unidad",
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
    fabricante: "Vetmed Labs",
    unidadMedida: "Unidad",
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
    fabricante: "PetNourish",
    unidadMedida: "Unidad",
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
    fabricante: "Safetech",
    unidadMedida: "Unidad",
    categoria: "Insumos",
    proveedorPreferido: null,
    estado: "Activo",
    imagen: "",
    createdAt: "2025-07-25T09:40:00Z",
    updatedAt: "2025-09-08T14:25:00Z",
    activo: true,
  },
];
