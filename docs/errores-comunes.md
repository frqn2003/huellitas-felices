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

---

## Registro de errores

<!-- Formato de cada entrada. Agregar entradas NUEVAS ARRIBA de las existentes (más reciente primero).
     No borrar entradas viejas: si quedó obsoleta, marcarla como [OBSOLETA] y por qué. -->

### 2026-09-15 · Recepción · tab Mascotas (`/clientes`, HU-MAS-01)

- **Qué pasó:** `next build` falló al prerender `/clientes` con `useSearchParams() should be wrapped in a suspense boundary`.
- **Cómo se detectó:** renderizado real (paso 6b, `npm run build` como fallback sin skill browser-automation instalada).
- **Causa:** el componente client lee `useSearchParams` (para derivar `?tab=`/`?dueno=`) sin límite de Suspense; durante el prerender estático la query aún no se conoce, así que Next exige el bailout.
- **Regla para no repetirlo:** toda página client que use `useSearchParams` debe envolver el screen en `<Suspense fallback={null}>` en el export default (patrón ya existente en `/ordenes-compra`); verificar siempre con `npm run build`, no solo lint + tsc.

<!-- Formato de cada entrada. Agregar entradas NUEVAS ARRIBA de las existentes (más reciente primero).
     No borrar entradas viejas: si quedó obsoleta, marcarla como [OBSOLETA] y por qué. -->

_(Registro vacío.)_
