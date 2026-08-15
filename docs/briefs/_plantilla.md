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

## Datos hardcodeados

Ejemplos reales para poblar la pantalla (pacientes, veterinarios, turnos, montos, etc.):

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
