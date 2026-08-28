import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ValidationError } from "@/lib/http/errors";

/**
 * Guardado de imágenes subidas desde el front.
 *
 * POR QUÉ EXISTE ESTO
 *   El front lee el archivo con FileReader y lo manda como **data URL en
 *   base64** (`data:image/png;base64,iVBORw0...`). Ese string pesa cientos de
 *   miles de caracteres.
 *
 *   `articulo.imagen_url` es `varchar(255)`. Guardar el base64 ahí es imposible:
 *   la base lo rechaza por largo. Y agrandar la columna a `text` para meter
 *   imágenes adentro de la tabla sería peor — cada SELECT de artículos
 *   arrastraría megabytes.
 *
 *   Entonces: el archivo se escribe en disco y en la base queda solo la ruta,
 *   que entra de sobra en 255 caracteres. Es lo que anticipaba el comentario
 *   del front en ArticuloFormModal.tsx:141.
 *
 * LÍMITE CONOCIDO
 *   `public/uploads/` funciona con `next dev` y con un servidor Node normal.
 *   En un hosting serverless (Vercel) el disco no persiste entre requests: ahí
 *   habría que pasar a Supabase Storage o S3. Para la demo del sprint alcanza,
 *   y el cambio quedaría contenido en este archivo.
 */

const DIR_PUBLICO = "/uploads/articulos";
const DIR_DISCO = join(process.cwd(), "public", "uploads", "articulos");

const EXTENSIONES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB, igual que valida el front

/**
 * Recibe una data URL en base64, la escribe en disco y devuelve la ruta pública.
 *
 * Si le llega algo que ya es una ruta (`/uploads/...`), lo devuelve tal cual:
 * pasa al editar un artículo sin cambiar la imagen, donde el front reenvía la
 * URL que ya tenía en vez de un archivo nuevo.
 */
export async function guardarImagenBase64(
  dataUrl: string | null | undefined,
): Promise<string | null> {
  if (!dataUrl) return null;

  // Ya es una ruta guardada: no hay nada que hacer.
  if (dataUrl.startsWith("/uploads/")) return dataUrl;

  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) {
    throw new ValidationError(
      "IMAGEN_INVALIDA",
      "La imagen no tiene un formato válido.",
      "imagen",
    );
  }

  const [, mime, base64] = match;

  const extension = EXTENSIONES[mime];
  if (!extension) {
    throw new ValidationError(
      "IMAGEN_TIPO_NO_SOPORTADO",
      "La imagen debe ser PNG, JPG, WEBP o GIF.",
      "imagen",
    );
  }

  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength > MAX_BYTES) {
    throw new ValidationError(
      "IMAGEN_DEMASIADO_GRANDE",
      "La imagen no puede superar los 2 MB.",
      "imagen",
    );
  }

  // Nombre aleatorio: si dos artículos suben "foto.png" no se pisan, y nadie
  // puede adivinar la URL de la imagen de otro.
  const archivo = `${randomUUID()}.${extension}`;

  await mkdir(DIR_DISCO, { recursive: true });
  await writeFile(join(DIR_DISCO, archivo), buffer);

  return `${DIR_PUBLICO}/${archivo}`;
}
