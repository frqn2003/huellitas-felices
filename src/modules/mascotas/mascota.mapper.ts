import type { Mascota } from "@/data/mascotas";
import type { MascotaRow } from "./mascota.types";

/**
 * HU-MAS-01 — traduce fila de Postgres → shape que el front espera.
 *
 * Las tres traducciones que hace y por qué ninguna es opcional:
 *
 *  1. NOMBRES. El contrato del front es camelCase para las claves compuestas
 *     (`clienteId`, `fechaNacimiento`, `senasParticulares`) mientras la base es
 *     snake_case. Cada mapper copia el estilo de SU módulo: acá es camelCase
 *     porque así lo declaró la pantalla (src/data/mascotas.ts).
 *
 *  2. `numeric` → number. El driver `pg` devuelve `peso` como STRING para no
 *     perder precisión. Sin esta conversión el front recibe "20.00" en vez de
 *     20 y cualquier comparación numérica falla en silencio.
 *
 *  3. `date` → "YYYY-MM-DD". El driver devuelve un objeto `Date` de JS; el
 *     front declara un string ISO.
 *
 * El tipo `Mascota` se importa de src/data/mascotas.ts a propósito: es el
 * contrato compartido. Si el front cambia la interfaz, esto deja de compilar —
 * que es exactamente lo que queremos que pase.
 */

/**
 * `date` de Postgres → "YYYY-MM-DD".
 *
 * ⚠️ NO se usa `toISOString()`: esa función pasa a UTC, y una fecha guardada
 *    como 2023-11-13 llega del driver como la medianoche LOCAL del server. En
 *    Argentina (UTC-3) eso es 2023-11-13T03:00Z, que en ISO sigue dando el día
 *    13 — pero en un server al oeste de UTC daría el 12. Se arma a mano con las
 *    partes locales, que es lo que la columna `date` realmente guarda.
 */
function aFechaISO(fecha: Date | null): string | null {
  if (!fecha) return null;
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function toApi(row: MascotaRow): Mascota {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    nombre: row.nombre,
    especie: row.especie,
    raza: row.raza,
    sexo: row.sexo,
    // `numeric` llega como string desde `pg`.
    peso: row.peso !== null ? Number(row.peso) : null,
    fechaNacimiento: aFechaISO(row.fecha_nacimiento),
    senasParticulares: row.senas_particulares,
    estado: row.estado,
  };

  // NOTA: `cliente_nombre`/`cliente_apellido`/`cliente_documento` vienen en la
  // fila (los usa la BÚSQUEDA del listado, que se resuelve en SQL) pero NO se
  // exponen: el contrato `Mascota` no los declara y la pantalla resuelve el
  // dueño contra su propia lista de clientes (`clientePorId` en
  // src/app/clientes/page.tsx). Si algún día hace falta mandarlos, se agregan
  // acá y a la interfaz del front a la vez.
}

export function toApiList(rows: MascotaRow[]): Mascota[] {
  return rows.map(toApi);
}
