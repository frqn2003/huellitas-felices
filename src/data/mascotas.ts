// Datos placeholder del módulo Mascotas (HU-MAS-01).
// Contrato real del esquema (docs/esquema-bd-front.md, sección 8 "Clientes,
// Mascotas y Turnos" — DD Sprint 3). Cada `id` es la PK que mandará la base.
// El estado reutiliza el enum de clientes (activo/inactivo en minúscula).

import type { EstadoCliente } from "@/data/clientes";

// Banderas de demo para simular los estados de la pantalla (ver src/app/clientes/page.tsx).
export const SIMULAR_VACIO = false;
export const SIMULAR_ERROR = false;

// Subtipo de la FK (mascota.cliente_id → cliente.id, OBLIGATORIO).
export type Mascota = {
  id: number; // PK (mascota.id)
  /** dict: mascota.cliente_id int NOT NULL FK → cliente.id (titular). */
  clienteId: number;
  /** dict: mascota.nombre varchar NOT NULL. */
  nombre: string;
  /** dict: mascota.especie varchar NOT NULL (texto libre; la UI ofrece Perro/Gato/Otro). */
  especie: string;
  /** dict: mascota.raza varchar (nullable, texto libre con sugerencias). */
  raza: string | null;
  /** dict: mascota.sexo varchar NOT NULL (Macho/Hembra). */
  sexo: string;
  /** dict: mascota.peso numeric (nullable) — CHECK peso IS NULL OR peso > 0. */
  peso: number | null;
  /** dict: mascota.fecha_nacimiento date (nullable) → ISO "YYYY-MM-DD". */
  fechaNacimiento: string | null;
  /** dict: mascota.senas_particulares text (nullable). */
  senasParticulares: string | null;
  estado: EstadoCliente;
};

/** Lo que el formulario le manda al backend (POST / PUT + dar de baja lógica). */
export type MascotaDraft = Omit<Mascota, "id">;

// BACKEND: reemplazar por la respuesta de GET /api/mascotas (tabla mascota).
export const mascotasIniciales: Mascota[] = [
  {
    id: 1,
    clienteId: 3,
    nombre: "Azul",
    especie: "Perro",
    raza: "Pitbull",
    sexo: "Macho",
    peso: 20,
    fechaNacimiento: "2023-11-13",
    senasParticulares: "Marca de nacimiento en el pecho con forma de corazón",
    estado: "activo",
  },
  {
    id: 2,
    clienteId: 1,
    nombre: "Dogi",
    especie: "Gato",
    raza: null,
    sexo: "Hembra",
    peso: 4.5,
    fechaNacimiento: "2021-03-02",
    senasParticulares: null,
    estado: "inactivo",
  },
  {
    id: 3,
    clienteId: 1,
    nombre: "Poppi",
    especie: "Perro",
    raza: "Labrador",
    sexo: "Hembra",
    peso: 28,
    fechaNacimiento: "2022-06-30",
    senasParticulares: "Muy cariñosa",
    estado: "activo",
  },
];

// Catálogo de opciones del form (la BD guarda el string; no hay tabla catálogo).
// BACKEND: catálogos fijos del front — no requieren endpoint (especie/sexo son
// varchar libre; la UI los restringe). Raza también es texto libre: el datalist
// solo sugiere valores conocidos, el usuario puede escribir cualquiera.
export const especies = ["Perro", "Gato", "Otro"];
export const sexos = ["Macho", "Hembra"];
export const razasSugeridas = ["Pitbull", "Labrador", "Caniche", "Ovejero", "Persa", "Siames", "Mestizo"];

// Reglas de validación front (formato por campo):
export const validacionesMascota = {
  nombre: /^.{1,100}$/, // obligatorio
  peso: /^\d+(\.\d+)?$/, // numérico, mayor a 0 (CHECK del esquema)
  fechaNacimiento: /^\d{4}-\d{2}-\d{2}$/, // ISO
};