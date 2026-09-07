// Datos placeholder del módulo Proveedores (HU-PROV-01).
// Cada `id` es la PK que mandará la base de datos (ver comentarios // BACKEND:).

// Valor crudo del enum de la BD (C3): el front muestra "Activo"/"Inactivo" en
// tablas y filtros; el dato viaja en minúscula como lo define el dict.
export type EstadoProveedor = "activo" | "inactivo";

// Banderas de demo para simular los estados de la pantalla (ver src/app/proveedores/page.tsx).
export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

export interface Proveedor {
  id: number;
  /** dict: razon_social varchar NOT NULL. */
  razon_social: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email: string;
  contacto: string;
  /** N:M del wire actual (string[] de nombres, el context la traduce a ids).
      El dict la reemplaza por `forma_pago_id` único; se conserva mientras la
      API no se alinee. */
  formasPago: string[];
  /** PK → forma_pago.id (dict: NOT NULL). El formulario la elige como Select y
      viaja en el POST/PUT (además de `formasPago` para el wire actual). */
  forma_pago_id?: number;
  /** dict: plazo_entrega_dias int NOT NULL. */
  plazo_entrega_dias: number;
  estado: EstadoProveedor;
  /** Evaluación de desempeño 0-10 (dict: numeric(3,1)). BACKEND: pendiente en la API. */
  calificacion?: number;
}

// BACKEND: reemplazar por la respuesta de GET /api/proveedores. Los nombres de
// `formasPago` deben coincidir con el catálogo GET /api/formas-pago (el context
// los traduce a ids; hoy el catálogo es el placeholder FORMAS_PAGO de
// src/data/formas-pago.ts); "Cta. cte. 30 días" es el nombre del dict.
export const proveedoresIniciales: Proveedor[] = [
  {
    id: 1,
    razon_social: "Nutrición Animal SRL",
    cuit: "30-71234567-8",
    direccion: "Av. Bolivia 1450, Salta Capital",
    telefono: "387-4551122",
    email: "ventas@nutricionanimal.com.ar",
    contacto: "Marcela Funes",
    formasPago: ["Cta. cte. 30 días", "Transferencia"],
    forma_pago_id: 2,
    plazo_entrega_dias: 5,
    estado: "activo",
  },
  {
    id: 2,
    razon_social: "VetInsumos Norte SA",
    cuit: "30-70987654-2",
    direccion: "Alvarado 890, Salta Capital",
    telefono: "387-4223344",
    email: "pedidos@vetinsumosnorte.com",
    contacto: "Diego Herrera",
    formasPago: ["Contado"],
    forma_pago_id: 1,
    plazo_entrega_dias: 2,
    estado: "activo",
  },
  {
    id: 3,
    razon_social: "Farmavet Distribuidora",
    cuit: "27-65432198-3",
    direccion: "Ruta 9 Km 4.5, Cerrillos",
    telefono: "387-4998877",
    email: "administracion@farmavet.com.ar",
    contacto: "Lucía Paz",
    formasPago: ["Cheque a 30 días", "Contado"],
    forma_pago_id: 5,
    plazo_entrega_dias: 7,
    estado: "activo",
  },
  {
    id: 4,
    razon_social: "Balanceados del Norte",
    cuit: "30-69876543-1",
    direccion: "Belgrano 220, Salta Capital",
    telefono: "387-4667788",
    email: "contacto@balanceadosnorte.com",
    contacto: "Rubén Salinas",
    formasPago: ["Cta. cte. 30 días"],
    forma_pago_id: 2,
    plazo_entrega_dias: 10,
    estado: "inactivo",
  },
];
