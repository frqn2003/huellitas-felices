// Datos placeholder del módulo Clientes (HU-CLI-01).
// Contrato real del esquema (docs/esquema-bd-front.md, sección 8 "Clientes,
// Mascotas y Turnos" — DD Sprint 3). Cada `id` es la PK que mandará la base.

// Valor crudo del enum de la BD (C3): el front muestra "Activo"/"Inactivo" en
// tablas y filtros; el dato viaja en minúscula como lo define el dict.
export type EstadoCliente = "activo" | "inactivo";

// Banderas de demo para simular los estados de la pantalla (ver src/app/clientes/page.tsx).
export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

export interface Cliente {
  id: number;
  /** dict: cliente.nombre varchar NOT NULL. */
  nombre: string;
  /** dict: cliente.apellido varchar NOT NULL. */
  apellido: string;
  /** dict: cliente.documento varchar NOT NULL — único entre activos
      (cliente_documento_activo_uidx, WHERE estado = 'activo'). */
  documento: string;
  /** dict: cliente.telefono varchar NOT NULL. */
  telefono: string;
  /** dict: cliente.email varchar NOT NULL — único entre activos
      (cliente_email_activo_uidx, WHERE estado = 'activo'). */
  email: string;
  /** dict: cliente.direccion varchar (nullable). */
  direccion: string | null;
  /** dict: cliente.fecha_nacimiento date (nullable) → ISO "YYYY-MM-DD". */
  fecha_nacimiento: string | null;
  estado: EstadoCliente;
}

/** Lo que el formulario le manda al backend (POST / PUT + dar de baja lógica). */
export type ClienteDraft = Omit<Cliente, "id">;

export interface Mascota {
  id: number;
  nombre: string;
  /** dict: mascota.especie varchar NOT NULL (perro, gato, otro). */
  especie: string;
  estado: EstadoCliente;
}

// BACKEND: reemplazar por la respuesta de GET /api/clientes. El listado arranca
// con los clientes ACTIVOS; los inactivos se muestran solo si el filtro los incluye.
export const clientesIniciales: Cliente[] = [
  {
    id: 1,
    nombre: "Pablo",
    apellido: "Celaya",
    documento: "45115839",
    telefono: "3875122693",
    email: "pablo@gmail.com",
    direccion: "Avenida veteranos de malvinas y juncal",
    fecha_nacimiento: "2003-11-16",
    estado: "activo",
  },
  {
    id: 2,
    nombre: "Emiliano",
    apellido: "Aguirre",
    documento: "43115839",
    telefono: "3876566566",
    email: "emiliano@gmail.com",
    direccion: "Calle falsa 123",
    fecha_nacimiento: "1998-05-02",
    estado: "inactivo",
  },
  {
    id: 3,
    nombre: "Nicolas",
    apellido: "Celaya",
    documento: "46115839",
    telefono: "3875122000",
    email: "nico@gmail.com",
    direccion: "Av. Central 456",
    fecha_nacimiento: "1990-08-21",
    estado: "activo",
  },
];

// Mascotas vinculadas (placeholder, sección "Ver cliente") — tabla `mascota`
// del esquema, sección 8. La clave es el id del cliente (mascota.cliente_id).
// BACKEND: reemplazar por la respuesta de GET /api/clientes/:id/mascotas.
export const mascotasPorCliente: Record<number, Mascota[]> = {
  1: [
    { id: 1, nombre: "Poppi", especie: "Perro", estado: "activo" },
    { id: 2, nombre: "Azul", especie: "Perro", estado: "activo" },
  ],
};

// Reglas de validación front (formato por campo):
export const validaciones = {
  documento: /^\d{7,8}$/, // 7-8 dígitos
  telefono: /^\+?\d{8,15}$/, // con/sin prefijo, 8-15 dígitos
  email: /.+@.+\..+/, // formato email básico
  fecha_nacimiento: /^\d{4}-\d{2}-\d{2}$/, // ISO
};