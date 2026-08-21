// Datos placeholder del módulo Proveedores (HU-PROV-01).
// Cada `id` es la PK que mandará la base de datos (ver comentarios // BACKEND:).

export type EstadoProveedor = "Activo" | "Inactivo";

export interface Proveedor {
  id: number;
  razonSocial: string;
  cuit: string;
  direccion: string;
  telefono: string;
  email: string;
  contacto: string;
  formaPago: string;
  plazoEntregaDias: number;
  estado: EstadoProveedor;
}

// BACKEND: reemplazar por la respuesta de GET /api/proveedores
export const proveedoresIniciales: Proveedor[] = [
  {
    id: 1,
    razonSocial: "Nutrición Animal SRL",
    cuit: "30-71234567-8",
    direccion: "Av. Bolivia 1450, Salta Capital",
    telefono: "387-4551122",
    email: "ventas@nutricionanimal.com.ar",
    contacto: "Marcela Funes",
    formaPago: "Cuenta Corriente",
    plazoEntregaDias: 5,
    estado: "Activo",
  },
  {
    id: 2,
    razonSocial: "VetInsumos Norte SA",
    cuit: "30-70987654-2",
    direccion: "Alvarado 890, Salta Capital",
    telefono: "387-4223344",
    email: "pedidos@vetinsumosnorte.com",
    contacto: "Diego Herrera",
    formaPago: "Contado",
    plazoEntregaDias: 2,
    estado: "Activo",
  },
  {
    id: 3,
    razonSocial: "Farmavet Distribuidora",
    cuit: "27-65432198-3",
    direccion: "Ruta 9 Km 4.5, Cerrillos",
    telefono: "387-4998877",
    email: "administracion@farmavet.com.ar",
    contacto: "Lucía Paz",
    formaPago: "Cheque a 30 días",
    plazoEntregaDias: 7,
    estado: "Activo",
  },
  {
    id: 4,
    razonSocial: "Balanceados del Norte",
    cuit: "30-69876543-1",
    direccion: "Belgrano 220, Salta Capital",
    telefono: "387-4667788",
    email: "contacto@balanceadosnorte.com",
    contacto: "Rubén Salinas",
    formaPago: "Cuenta Corriente",
    plazoEntregaDias: 10,
    estado: "Inactivo",
  },
];
