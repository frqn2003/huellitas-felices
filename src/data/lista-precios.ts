// Catálogo de Lista de Precios vigente (HU-STK-03).
// Los precios son administrados centralmente y se aplican automáticamente en mostrador (HU-VTA-01).
// No son editables por el cajero al momento de la venta.
//
// BACKEND: GET /api/lista-precios?vigente=true
// Cada item tiene un id numérico (PK) y pertenece a las categorías del sistema:
// Medicamentos, Insumos, Alimentos, Accesorios o Servicios/Prácticas.

export interface ItemListaPrecio {
  id: number;
  codigo: string;
  nombre: string;
  categoria: "Medicamentos" | "Insumos" | "Alimentos" | "Accesorios" | "Servicios";
  unidad: string;
  precioUnitario: number; // Precio final vigente con IVA incluido
  ivaPorcentaje: number; // 21% general, 10.5% diferencial o 0% exento
}

export const LISTA_PRECIOS_PRACTICAS: Record<number, number> = {
  1: 15000, // Consulta médica general
  2: 65000, // Cirugía de mediana/alta complejidad
  3: 12000, // Control post-operatorio / Vacunación
};
export const PRECIO_PRACTICA_DEFAULT = 15000;

export const LISTA_PRECIOS_ARTICULOS: ItemListaPrecio[] = [
  // ── Medicamentos ────────────────────────────────────────────────────────────
  {
    id: 1,
    codigo: "MED-001",
    nombre: "Amoxicilina 500mg suspensión",
    categoria: "Medicamentos",
    unidad: "Frasco",
    precioUnitario: 4500,
    ivaPorcentaje: 21,
  },
  {
    id: 2,
    codigo: "MED-005",
    nombre: "Meloxicam Gotas 10ml (Antiinflamatorio)",
    categoria: "Medicamentos",
    unidad: "Frasco",
    precioUnitario: 5200,
    ivaPorcentaje: 21,
  },
  {
    id: 3,
    codigo: "MED-012",
    nombre: "Prednisolona 20mg (Corticosteroide)",
    categoria: "Medicamentos",
    unidad: "Blister",
    precioUnitario: 3800,
    ivaPorcentaje: 21,
  },
  {
    id: 4,
    codigo: "ANT-003",
    nombre: "Pipeta Antiparasitaria Externa 10-20kg",
    categoria: "Medicamentos",
    unidad: "Pipeta",
    precioUnitario: 6800,
    ivaPorcentaje: 21,
  },
  {
    id: 5,
    codigo: "ANT-009",
    nombre: "Comprimido Antiparasitario Interno",
    categoria: "Medicamentos",
    unidad: "Pastilla",
    precioUnitario: 3100,
    ivaPorcentaje: 21,
  },
  {
    id: 6,
    codigo: "VAC-001",
    nombre: "Vacuna Antirrábica Obligatoria",
    categoria: "Medicamentos",
    unidad: "Dosis",
    precioUnitario: 5500,
    ivaPorcentaje: 21,
  },
  {
    id: 7,
    codigo: "VAC-008",
    nombre: "Vacuna Séxtuple Canina (Refuerzo)",
    categoria: "Medicamentos",
    unidad: "Dosis",
    precioUnitario: 8900,
    ivaPorcentaje: 21,
  },

  // ── Insumos Clínicos ────────────────────────────────────────────────────────
  {
    id: 8,
    codigo: "INS-014",
    nombre: "Jeringa descartable 5ml c/ aguja",
    categoria: "Insumos",
    unidad: "Unidad",
    precioUnitario: 950,
    ivaPorcentaje: 21,
  },
  {
    id: 9,
    codigo: "INS-002",
    nombre: "Gasas hidrófilas estériles (pack x 10)",
    categoria: "Insumos",
    unidad: "Sobre",
    precioUnitario: 1200,
    ivaPorcentaje: 21,
  },
  {
    id: 10,
    codigo: "INS-020",
    nombre: "Suero Fisiológico 500ml c/ guía",
    categoria: "Insumos",
    unidad: "Sachet",
    precioUnitario: 4200,
    ivaPorcentaje: 21,
  },
  {
    id: 11,
    codigo: "TOP-002",
    nombre: "Curabichera spray cicatrizante",
    categoria: "Insumos",
    unidad: "Aerosol",
    precioUnitario: 4900,
    ivaPorcentaje: 21,
  },

  // ── Alimentos ───────────────────────────────────────────────────────────────
  {
    id: 12,
    codigo: "ALI-001",
    nombre: "Royal Canin Maxi Adult 15kg",
    categoria: "Alimentos",
    unidad: "Bolsa",
    precioUnitario: 48500,
    ivaPorcentaje: 21,
  },
  {
    id: 13,
    codigo: "ALI-002",
    nombre: "Purina Pro Plan Gastrointestinal 7.5kg",
    categoria: "Alimentos",
    unidad: "Bolsa",
    precioUnitario: 36200,
    ivaPorcentaje: 21,
  },
  {
    id: 14,
    codigo: "ALI-003",
    nombre: "Cat Chow Gatitos Carne y Leche 3kg",
    categoria: "Alimentos",
    unidad: "Bolsa",
    precioUnitario: 14200,
    ivaPorcentaje: 21,
  },

  // ── Accesorios ─────────────────────────────────────────────────────────────
  {
    id: 15,
    codigo: "ACC-001",
    nombre: "Collar Isabelino Postquirúrgico Regulable N° 3",
    categoria: "Accesorios",
    unidad: "Unidad",
    precioUnitario: 4200,
    ivaPorcentaje: 21,
  },
  {
    id: 16,
    codigo: "ACC-002",
    nombre: "Correa de Paseo Reforzada 1.5m",
    categoria: "Accesorios",
    unidad: "Unidad",
    precioUnitario: 7800,
    ivaPorcentaje: 21,
  },
  {
    id: 17,
    codigo: "ACC-003",
    nombre: "Transportadora Rígida N° 2 p/ Felinos y Caninos Chicos",
    categoria: "Accesorios",
    unidad: "Unidad",
    precioUnitario: 24500,
    ivaPorcentaje: 21,
  },
  {
    id: 18,
    codigo: "ACC-004",
    nombre: "Placa Identificatoria Grabada c/ QR de Seguridad",
    categoria: "Accesorios",
    unidad: "Unidad",
    precioUnitario: 2600,
    ivaPorcentaje: 21,
  },
];
