# Página: turnos

> Reglas específicas del tab "Turnos" dentro de la página `/clientes` (módulo Recepción, HU-TUR-01). Si existe este archivo, reemplaza al MASTER para esta página. Los tokens base (fondo crema, verde brand, headings Baloo 2 uppercase, radios 8/16, sombras discretas, motion 150/250/500 con `prefers-reduced-motion`) vienen del `MASTER.md` de Pet Bliss; acá van solo los matices de esta pantalla.

## Desviaciones

- **CTA del header es contextual por tab**: en Turnos el botón "Nuevo turno" (amarillo `accent`) es la ÚNICA acción contundente del viewport; Tabla y filtros quedan en verde/superficie. El amarillo nunca aparece dentro de la tabla (ni filas ni badges).
- **Colores de estado = tokens `status-*` vía `StatusBadge`** (no peligro de amarillo): Pendiente=warning, Confirmado=success, Cancelado=danger, Atendido=info, No asistió=neutral. `EstadoTurnoBadge` solo mapea (regla 4 de reuso) y define el ícono Lucide por estado.
- **La fecha se elige en lista, no en chips**: el paso "Profesional y horario" muestra los días laborables como filas verticales (día + fecha + franjas del día como subtítulo), con radio de selección en verde. Las franjas y los horarios de inicio sí usan chips (son horarios, no fechas; se leen mejor en grilla).
- **Chips de horarios del wizard**: ocupan superficie con borde `border`; el chip seleccionado sube a `brand-900` (verde) — nunca amarillo. "Ocupado" en disabled + tooltip.
- **La práctica depende del profesional**: el Select de práctica se filtra por las prácticas que el profesional puede realizar (médico → Consulta/Control; cirujana → Cirugía), con el nombre del profesional como hint. Cambiar de profesional limpia la práctica y el horario.
- **Densidad de tabla**: mayor a la de clientes/mascotas porque la grilla lleva 11 columnas (Id, Fecha, Hora, DNI, Cliente, Mascota, Profesional, Especialidad, Práctica, Estado, Acciones); ancho mínimo `min-w-[1180px]` con scroll horizontal dentro del card. Fecha y hora en columnas separadas (acciones de agenda). Especialidad y Práctica van en texto secundario porque son atributos de apoyo, no identidad de la fila; el DNI va antes que el cliente para facilitar el barrido vertical de la grilla.
- **El buscador cubre cliente, profesional, especialidad y práctica** (substring, sin distinguir mayúsculas ni acentos: "medico" encuentra "Médico"); el estado y el rango de fecha siguen como filtros aparte en el panel.
- **Wizard de alta (Nuevo turno)**: multi-paso (Stepper "Paso X de 4") con las reglas habituales de modal — overlay, focus trap, cierre por Esc; cada apertura remonta desde el Paso 1 (remount-key del lado de la página, sin estado residual). El resumen cierra con ConfirmarDialog antes de crear.
- **Filtros de rango de fecha**: inputs `type="date"` con `max`/`min` cruzados (patrón de movimientos) para mantener el rango coherente.
- **Botón "Atrás"** presente en los pasos 2–4 del wizard para no forzar el flujo lineal.