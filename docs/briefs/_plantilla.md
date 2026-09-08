# HU-XXX: [Como <rol>, quiero <acción>, para <beneficio>]

> Copiar este archivo como `HU-XXX.md` (ej: `HU-001.md`) y completar. Referencia: `docs/COMO-USAR.md`.

## Contexto

- **Ruta propuesta:** `/nombre-de-la-pantalla`
- **Relacionada con:** (otras HUs/pantallas)
- **Prioridad:** alta / media / baja

## Wireframe (idea)

Dibujar en ASCII o describir qué va en cada zona. Ejemplo:

```
┌─────────────────────────────────────────┐
│ LOGO     Turnos  Pacientes  Stock  [+] │  ← header crema
├──────────────┬──────────────────────────┤
│              │  Hola, [nombre]          │
│  MENÚ        │  Tenés 5 turnos hoy      │
│  Lateral     ├──────────────────────────┤
│              │  [Tabla de turnos...]    │
└──────────────┴──────────────────────────┘
```

## User flow

1. ¿De dónde viene el usuario?
2. ¿Qué quiere hacer?
3. ¿A dónde quiere llegar?

## Fuente de datos (BD)

Tablas del esquema (`docs/esquema-bd-front.md`) que alimentan esta pantalla. Ayuda a generar datos hardcodeados correctos y comentarios `// BACKEND:` precisos.

| Tabla | Campos usados | Relación clave |
|---|---|---|
| `ejemplo` | campo1, campo2, campo3 | FK → otra_tabla |

> Si la pantalla necesita datos de tablas que no existen aún, indicarlo acá como "PENDIENTE DBA".

## Datos hardcodeados

Ejemplos reales para poblar la pantalla, **respetando los tipos y constraints del esquema** (varchar, numeric, enum, FK):

```ts
const turnos = [
  { id: 1, paciente: "Rex", especie: "Perro", motivo: "Vacuna", hora: "09:00", estado: "Confirmado" },
  ...
];
```

## Estados

- [ ] Vacío
- [ ] Cargando
- [ ] Error
- [ ] Con datos

## Criterios de aceptación

- [ ] ...
- [ ] ...
