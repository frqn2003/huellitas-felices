"use client";

import { useEffect, useState } from "react";
import { apiGetOpcional } from "@/lib/api-client";

/**
 * Trae un catálogo de la API para poblar un `<select>`.
 *
 * POR QUÉ EXISTE
 *   Los catálogos (proveedores, categorías, formas de pago, tipos de
 *   comprobante, depósitos…) son tablas de la base. Cuando el front los
 *   declaraba como arrays fijos en `src/data/`, pasaba siempre lo mismo:
 *
 *     · alguien agregaba una fila en la base y el `<select>` no la mostraba;
 *     · los ids inventados a mano no coincidían con los reales, así que el
 *       filtro devolvía cero resultados — o peor, los de OTRO registro.
 *
 *   Y el arreglo era ir a editar el array a mano en cada cambio. En un ERP eso
 *   no escala: la base la tocan varias personas y nadie avisa al front.
 *
 *   Este hook convierte eso en una línea que se mantiene sola:
 *
 *     const proveedores = useCatalogo<ProveedorOpcion>("/api/proveedores?estado=activo");
 *
 * POR QUÉ `apiGetOpcional` Y NO `apiGet`
 *   Un catálogo caído no puede tirar abajo la pantalla. Si falla, la lista
 *   queda vacía: el `<select>` no ofrece opciones, que es molesto pero honesto.
 *   Un fallback a datos inventados es peor — hace que el formulario guarde el
 *   id equivocado sin avisar (ya pasó con PRESENTACIONES, ver el comentario de
 *   `CatalogosArticulo` en src/data/articulos.ts).
 *
 * CUÁNDO **NO** USARLO
 *   · Cuando la pantalla ya pide varios catálogos juntos en un `Promise.all`
 *     (artículos, órdenes de compra): ahí conviene un solo efecto que los
 *     traiga a todos, para no disparar N requests sueltos en el primer render.
 *   · Para listas que NO son tablas: enums del dominio (`TipoMovimiento`),
 *     opciones de UI ("Todos"), textos sugeridos. Esas sí son constantes del
 *     código, y está bien que lo sean.
 *
 * LA REGLA PARA DECIDIR
 *   Si la opción lleva un `id` que viaja a la base, tiene que venir de la base.
 */
export function useCatalogo<T>(url: string, porDefecto: T[] = []): T[] {
  const [items, setItems] = useState<T[]>(porDefecto);

  useEffect(() => {
    let cancelado = false;

    apiGetOpcional<T[]>(url, porDefecto).then((lista) => {
      // Si el componente se desmontó mientras esperábamos, no tocamos estado.
      if (!cancelado) setItems(lista);
    });

    return () => {
      cancelado = true;
    };
    // `porDefecto` queda fuera a propósito: es casi siempre un literal `[]`,
    // que es una referencia nueva en cada render y volvería a disparar el
    // efecto para siempre. La url es lo único que define qué catálogo es.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return items;
}
