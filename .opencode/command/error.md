---
description: Registra un error/lección aprendida en docs/errores-comunes.md para no repetirlo. Uso: /error "descripción breve de lo que pasó" (o sin argumento para modo interactivo).
agent: build
---

# Comando /error — Registrar un error en el log de lecciones

Registrás a propósito un error detectado (en diseño, código, verificación o prueba del usuario) en **`docs/errores-comunes.md`**, para que `/disenar` lo tenga en cuenta y no se repita.

## Paso 1 — Recopilar la información

Si el usuario pasó argumento (`/error "el modal no cerraba con Escape"`), usalo como punto de partida. Si no, preguntá:

1. **¿En qué pantalla/módulo o HU ocurrió?** (ej: stock, HU-STK-02)
2. **¿Qué pasó exactamente?** (el error concreto y observable)
3. **¿Cómo se detectó?** (lint / tsc / checklist accesibilidad / prueba del usuario)
4. **¿Por qué pasó?** (causa raíz; si no la sabés, proponé la más probable y marcala como hipótesis)

No inventes datos que el usuario no dio: si falta algo clave, preguntá antes de registrar.

## Paso 2 — Redactar la entrada

Seguí EXACTAMENTE el formato del archivo (mirá el comentario de ejemplo en "Registro de errores"):

- Título: `### YYYY-MM-DD · <pantalla o módulo> (HU si aplica)` — fecha de HOY.
- Campos: **Qué pasó**, **Cómo se detectó**, **Causa**, **Regla para no repetirlo**.
- La regla debe ser una **acción concreta y verificable** (ej: "siempre reusar StatusBadge de ui/", no "tener más cuidado").
- Insertá la entrada **ARRIBA** de las existentes (más reciente primero). No borres ni reordenes las viejas.

## Paso 3 — Actualizar "Reglas activas" si aplica

- Si la regla es aplicable a futuras pantallas en general, agregala como ítem a la sección **"Reglas activas"** (máx ~15 reglas; si se pasa, consolidá las parecidas).
- Si es demasiado específica de una pantalla, dejala solo en el registro.

## Paso 4 — Confirmar

Mostrale al usuario la entrada final tal como quedó en el archivo (y la regla sumada, si corresponde) y preguntale si quiere ajustar algo. No hagas commit ni push: eso lo maneja `/subir`.
