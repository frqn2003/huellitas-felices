# Errores comunes — Lecciones aprendidas

Log vivo del equipo de diseño para **no volver a cometer los mismos errores**. Se consulta al inicio de `/disenar` y se alimenta **automáticamente** durante los pasos 6/7: si el agente detecta un error (propio, del renderizado o del feedback del usuario), lo registra solo, sin comando manual.

## Cómo usar este archivo

1. **Al diseñar:** leer las "Reglas activas" antes de codear y verificarlas en el paso de verificación técnica.
2. **Al detectar un error** (en lint/tsc, renderizado, checklist de accesibilidad, feedback del usuario o revisión): se registra automáticamente. No hay comando `/error`; el agente lo hace durante `/disenar`.
3. Si un error ya está registrado pero cambió la regla para evitarlo, editar la entrada existente (no duplicar).

---

## Reglas activas

<!-- Checklist rápido derivado de los errores registrados abajo.
     Cada nueva entrada puede sumar una regla acá. Mantener corto (máx ~15). -->

- [x] Páginas con `useSearchParams` (client component) → envolver en `<Suspense fallback={null}>` (falla el prerender de `next build`).
- [x] Siempre que un input cargue sugerencias, verificar cómo se renderizan dentro de un `Modal` animado (transform): el `datalist` nativo se posiciona mal → usar chips propios. Y si un Combobox "parece seleccionado", revisar el `value` interno: tipear sin elegir de la lista deja el value vacío.

---

## Registro de errores

<!-- Formato de cada entrada. Agregar entradas NUEVAS ARRIBA de las existentes (más reciente primero).
     No borrar entradas viejas: si quedó obsoleta, marcarla como [OBSOLETA] y por qué. -->

### 2026-09-15 · Recepción · Formulario de mascotas (`/clientes`, HU-MAS-01)

- **Qué pasó:** (1) al guardar una mascota nueva aparecía "El dueño es obligatorio" aunque el usuario lo había tipeado; (2) el desplegable de sugerencias de raza (`datalist`) se veía mal.
- **Cómo se detectó:** feedback del usuario (prueba real en el modal).
- **Causa:** (1) el `Combobox` de `ui/` vaciaba `onChange("")` al tipear y solo recuperaba el value si se elegía una opción de la lista con click/Enter+flechas; tipear y tocar afuera dejaba el texto visible pero el value vacío (y Enter sin flechas nunca seleccionaba). (2) el `datalist` nativo se posiciona respecto del viewport: dentro de un Modal animado con Framer Motion (transform crea un containing block distinto) el navegador lo dibuja descolocado.
- **Regla para no repetirlo:** (1) un Combobox debe auto-seleccionar en blur si el texto coincide con UNA sola opción (y Enter con un único resultado también); (2) NO usar `datalist` dentro de modales animados → sugerencias propias como chips (botones pill con `aria-pressed`, filtrados por lo tipeado).
- **Fix:** `src/components/ui/Combobox.tsx` (auto-commit en blur + Enter) y `src/components/mascotas/MascotaFormModal.tsx` (chips de razasSugeridas en lugar de `<datalist>`).

### 2026-09-15 · Recepción · tab Mascotas (`/clientes`, HU-MAS-01)

- **Qué pasó:** `next build` falló al prerender `/clientes` con `useSearchParams() should be wrapped in a suspense boundary`.
- **Cómo se detectó:** renderizado real (paso 6b, `npm run build` como fallback sin skill browser-automation instalada).
- **Causa:** el componente client lee `useSearchParams` (para derivar `?tab=`/`?dueno=`) sin límite de Suspense; durante el prerender estático la query aún no se conoce, así que Next exige el bailout.
- **Regla para no repetirlo:** toda página client que use `useSearchParams` debe envolver el screen en `<Suspense fallback={null}>` en el export default (patrón ya existente en `/ordenes-compra`); verificar siempre con `npm run build`, no solo lint + tsc.

<!-- Formato de cada entrada. Agregar entradas NUEVAS ARRIBA de las existentes (más reciente primero).
     No borrar entradas viejas: si quedó obsoleta, marcarla como [OBSOLETA] y por qué. -->

_(Registro vacío.)_
