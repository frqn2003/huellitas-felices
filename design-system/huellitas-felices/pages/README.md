# Design System Overrides por página

Cuando el comando `/diseñar` procesa una pantalla, crea acá un archivo `[pantalla].md` con los tokens/reglas específicos de esa página. Si existe, tiene prioridad sobre `MASTER.md` (ver `AGENTS.md` → "Regla de tokens").

Formato de ejemplo:

```markdown
# Página: dashboard

> Reglas específicas de esta página. Si existe este archivo, reemplaza al MASTER para esta página.

## Desviaciones
- (ej: densidad alta para tablas, spacing compacto, etc.)
```
