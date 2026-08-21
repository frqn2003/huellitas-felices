# Proveedores (ABML) - Pet Bliss Style

## Tokens y directivas específicas

Esta página es un ABML (Alta, Baja, Modificación y Lectura) estándar, pero adaptado al estilo Pet Bliss.

### Estructura
1. **Header de página**: Título (H1, `font-display`, uppercase, `text-brand-900`) y botón primario amarillo "Nuevo proveedor".
2. **Barra de herramientas**: Input de búsqueda con ícono de lupa (rounded-sm) y Select de filtros de estado (Todos/Activos/Inactivos).
3. **Card contenedora**: Fondo `bg-surface` (blanco), borde `border-border`, sombra discreta `shadow-card`.
4. **Tabla**:
   - Cabeceras: `bg-cream-50`, texto `text-xs font-extrabold uppercase text-text-secondary`.
   - Filas: separador `border-border/60`, hover `hover:bg-cream-50/60`.
5. **Estado (Badge)**:
   - Activo: texto `text-status-success-strong`, fondo `bg-status-success/10`.
   - Inactivo: texto `text-text-secondary`, fondo `bg-cream-100`.
6. **Acciones**: Botones ghost redondos (`rounded-pill`) con íconos Lucide. Hover sutil `hover:bg-brand-900/10`.

### Formulario Modal
- Mismo estilo que `SolicitudFormModal` u `OrdenFormModal`.
- Fondo del overlay semi-transparente, modal centrado.
- Botón "Guardar" primario, botón "Cancelar" outline o ghost.
- En modo LECTURA: campos deshabilitados (texto primario visible, fondo bloqueado o inputs reemplazados por texto).
