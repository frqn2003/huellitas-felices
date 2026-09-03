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

_(Todavía no hay reglas. Se completan automáticamente durante `/disenar`)_

---

## Registro de errores

<!-- Formato de cada entrada. Agregar entradas NUEVAS ARRIBA de las existentes (más reciente primero).
     No borrar entradas viejas: si quedó obsoleta, marcarla como [OBSOLETA] y por qué. -->

<!--
### YYYY-MM-DD · <pantalla o módulo> (HU-XXX)

- **Qué pasó:** <el error concreto, ej: "StatusBadge duplicado con colores hardcodeados">
- **Cómo se detectó:** <lint / tsc / checklist accesibilidad / prueba del usuario>
- **Causa:** <por qué ocurrió, ej: "no se buscó en src/components/ui antes de crear">
- **Regla para no repetirlo:** <acción concreta, ej: "siempre reusar StatusBadge de ui/, nunca definir chips de estado en un componente de módulo">

+ Si aplica, sumar la regla a "Reglas activas".
-->

_(Registro vacío.)_
