# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/huellitas-felices/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.
>
> **SOURCE OF TRUTH:** This file is the machine-readable version of `docs/design-system-pet-bliss-style.md` ("Pet Bliss Style"). When in doubt, check the human-readable doc for full rationale (section references noted below). Do NOT pull colors, fonts or radii from the ui-ux-pro-max catalog — the Pet Bliss tokens below replace it.

---

**Project:** Huellitas Felices
**Generated:** 2026-08-11 (manual — tokens Pet Bliss, ver `docs/design-system-pet-bliss-style.md`)
**Category:** Veterinary clinic management (SaaS, warm organic style)

---

## Global Rules

### Color Palette (fuente: doc §5–§6)

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary / Brand | `#114F3C` | `--color-primary` |
| Primary Light | `#245E4D` | `--color-primary-light` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Accent / CTA | `#F9A900` | `--color-accent` |
| Accent Hover | `#E99C00` | `--color-accent-hover` |
| Background | `#FFF9EB` | `--color-background` |
| Background Secondary | `#F0ECDF` | `--color-background-secondary` |
| Surface | `#FFFFFF` | `--color-surface` |
| Text Primary | `#114F3C` | `--color-text-primary` |
| Text Secondary | `#547066` | `--color-text-secondary` |
| Border | `#DDD8C8` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |

**Color Notes (doc §5.2–§5.3, regla "Yellow is scarce"):**
- **60%** crema / neutros cálidos — canvas y secciones de descanso.
- **30%** verde bosque — títulos, nav, footer, botones secundarios, superficies verdes.
- **10%** amarillo — SOLO CTA principal, promociones, badges. El amarillo gana porque es escaso; nunca usarlo de forma indiscriminada.
- Blanco solo para cards y superficies internas.
- Verificar contraste siempre (WCAG 4.5:1 texto, 3:1 elementos grandes).

### Typography (doc §7)

- **Heading Font:** Baloo 2 (700/800) — display redondeada, amable, expresiva
- **Body Font:** Nunito (400/500/600/700/800) — neutra y legible
- **Google Fonts:** `https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@400;500;600;700;800&display=swap`
- En Next.js usar `next/font/google` (ya configurado en `src/app/layout.tsx` como `--font-baloo` / `--font-nunito`).
- Tailwind: `font-display` → Baloo 2, `font-sans` → Nunito.

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@400;500;600;700;800&display=swap');
```

### Type Scale (doc §7.2)

| Level | Size | Weight | Line-height | Notes |
|-------|------|--------|-------------|-------|
| Display | 48–64px | 800–900 | 0.90–1.00 | letter-spacing -2% aprox. |
| H1 | 40–48px | 800 | 0.95–1.05 | |
| H2 | 28–36px | 800 | 1.00–1.10 | |
| H3 | 18–22px | 700–800 | 1.10–1.25 | |
| Body | 14–16px | 400–500 | 1.45–1.60 | |
| Small | 11–13px | 500 | 1.30–1.40 | |

**Heading rules:** headings pesados (bold/extra bold), **predominantemente uppercase**, line-height compacto, color verde bosque, frases cortas.

### Spacing Variables (doc §8)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Micro separación |
| `--space-2` | 8px | Icono/texto |
| `--space-3` | 12px | Padding pequeño |
| `--space-4` | 16px | Padding estándar |
| `--space-5` | 20px | Gaps compactos |
| `--space-6` | 24px | Cards / grid |
| `--space-8` | 32px | Grupos |
| `--space-10` | 40px | Componentes |
| `--space-12` | 48px | Separación media |
| `--space-16` | 64px | Secciones compactas |
| `--space-20` | 80px | Secciones |
| `--space-24` | 96px | Grandes bloques |

**Responsive:** secciones desktop 80–96px, mobile 48–64px (doc §36.5).

### Radius (doc §10)

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Cards, inputs |
| `--radius-md` | 12px | Cards estándar |
| `--radius-lg` | 16px | Imágenes grandes, bloques |
| `--radius-pill` | 999px | Botones, chips, filtros |

**Regla (doc §10):** NO usar 24px+ en todos los componentes — cambia el carácter hacia SaaS contemporáneo. Cards 8–12px, botones pill.

### Shadows (doc §11)

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-card` | `0 4px 16px rgba(17, 79, 60, 0.08)` | Cards |

**Regla:** sombras discretas. Evitar sombras negras fuertes, gran blur, glassmorphism, múltiples sombras. La interfaz depende de color, espacio y fotografía, no de sombras.

### Motion (doc §38)

| Duration | Value | Usage |
|----------|-------|-------|
| Fast | 120–180ms | Hover/press microinteracciones |
| Normal | 200–300ms | Transiciones estándar |
| Slow | 400–600ms | Apariciones, expansión FAQ |

**Easing:** `ease-out` para interacciones directas. Respetar `prefers-reduced-motion`. Evitar animaciones permanentes, parallax excesivo, rebotes constantes, transiciones largas.

---

## Component Specs (doc §13, §40–§41)

### Buttons (doc §13)

```css
/* Primary (solo CTA principal) */
.btn-primary {
  background: #F9A900;
  color: #114F3C;
  border-radius: 999px;
  font-weight: 700;
  transition: all 200ms ease;
  cursor: pointer;
}
.btn-primary:hover { background: #E99C00; }
.btn-primary:active { transform: scale(0.97); }
.btn-primary:disabled { opacity: 0.45; }

/* Secondary */
.btn-secondary {
  background: #114F3C;
  color: #FFFFFF;
  border-radius: 999px;
  font-weight: 700;
  transition: all 200ms ease;
  cursor: pointer;
}

/* Outline */
.btn-outline {
  background: transparent;
  border: 1px solid #114F3C;
  color: #114F3C;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: #114F3C;
  cursor: pointer;
}
```

**Tamaños (doc §13):** Large 48–52px alto / padding-inline 24–32px · Medium 40–44px / 20–24px · Small 32–36px / 14–18px.

### Cards (doc §40)

```css
.card {
  background: #FFFFFF;
  border-radius: 12px;
  border: 1px solid #DDD8C8;
  box-shadow: 0 4px 16px rgba(17, 79, 60, 0.08);
}
```

**Misma familia para todas las variantes** (product, article, benefit, testimonial, process, category) — no estéticas distintas por card.

**Imágenes por tipo (doc §41):** product 1:1 · article 4:3 · lifestyle 4:3/3:2 · hero editorial. Mismo ratio/recorte/tratamiento dentro de cada grupo.

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #DDD8C8;
  border-radius: 8px;
  font-size: 16px;
  background: #FFFFFF;
  color: #114F3C;
  transition: border-color 200ms ease;
}
.input:focus {
  border-color: #114F3C;
  outline: none;
  box-shadow: 0 0 0 3px rgba(17, 79, 60, 0.2);
}
.input::placeholder { color: #547066; }
```

### Filters / Chips (doc §20)

```css
.filter-active { background: #114F3C; color: #FFFFFF; border-radius: 999px; }
.filter-default { background: transparent; border: 1px solid #114F3C; color: #114F3C; border-radius: 999px; }
```

### Header (doc §12)

Logo pequeño | navegación discreta | CTA amarillo. Background crema, mucho espacio horizontal. Mobile: logo + menú hamburguesa.

### Footer (doc §30)

Fondo verde oscuro `#114F3C`, texto blanco/crema. Logo + columnas de links + contacto + redes + copyright.

### Hero (doc §14)

Headline grande display, eyebrow, descripción corta, CTA amarillo, fotografías recortadas superpuestas (overlap), fondo crema.

---

## Style Guidelines

**Style:** Warm organic + rounded + bold uppercase typography (Pet Bliss, no claymorphism)

**Keywords:** cream background, forest green, warm yellow accent, bold uppercase headings, emotional photography, rounded cards (8–12px), organic shapes, overlapping imagery, generous whitespace, alternating section backgrounds (doc §33: CREAM → WHITE → GREEN → CREAM → YELLOW → CREAM → GREEN)

**Best For:** veterinary care, lifestyle commerce, warm service brands (doc §49)

**Key Effects:** overlaps, cutout subjects, blobs, small decorative stickers (stars, leaves, paw prints — que nunca compitan con headline/producto/CTA, doc §32), microinteracciones suaves (doc §38)

### Page Pattern (doc §4, §48)

**Pattern Name:** Storytelling + Commerce

**Section Order:** HEADER → HERO → CATEGORIES → STORY → BENEFITS → PRODUCT/SERVICE GRID → SOCIAL PROOF → PROMO CTA → PROCESS → TRUST BAR → ARTICLES → FAQ → FINAL CTA → FOOTER (adaptable a gestión: dashboard, turnos, fichas)

**Layout (doc §9):** container `min(1200px, calc(100% - 48px))`, 12 columnas desktop / 8 tablet / 4 mobile, gap 20–24px.

---

## Anti-Patterns (Do NOT Use)

- ❌ **Amarillo indiscriminado** — solo CTA y highlights (regla "Yellow is scarce", doc §26 regla 2)
- ❌ **Sin jerarquía dominante** — un solo elemento principal por viewport (headline, producto o CTA)
- ❌ **Radios 24px+ en todo** — deriva a estilo SaaS contemporáneo (doc §10)
- ❌ **Emojis como iconos** — usar Lucide (outline, stroke medio, esquinas redondeadas, doc §31)
- ❌ **Sombras fuertes / glassmorphism** (doc §11)
- ❌ **Estética corporativa fría, minimalismo tecnológico, lujo sobrio, ilustraciones infantiles dominantes, saturación de color** (doc §2.2)
- ❌ **Layouts rígidos sin overlaps ni formas orgánicas** (principio 06, doc §16)
- ❌ **Missing cursor:pointer** — todos los elementos clicables
- ❌ **Instant state changes** — transiciones 150–300ms
- ❌ **Invisible focus states** — focus visible para a11y (doc §37)
- ❌ **Contraste bajo** — verificar verde sobre crema, verde sobre amarillo, blanco sobre verde, texto secundario sobre crema (doc §37)

---

## Pre-Delivery Checklist (doc §50)

Antes de entregar cualquier UI, verificar:

- [ ] ¿El crema domina el canvas?
- [ ] ¿El verde funciona como ancla visual?
- [ ] ¿El amarillo está reservado para acciones?
- [ ] ¿Existe suficiente contraste (4.5:1 texto)?
- [ ] ¿Los headings tienen peso suficiente y son predominantemente uppercase?
- [ ] ¿Existe jerarquía clara H1–H4?
- [ ] ¿El body sigue siendo cómodo de leer?
- [ ] ¿Container consistente y secciones con aire?
- [ ] ¿Grid coherente y variación densidad (altas: grids; bajas: hero/story/CTA)?
- [ ] ¿Las imágenes se sienten cálidas y con coherencia de iluminación?
- [ ] ¿Hay overlaps y formas orgánicas?
- [ ] ¿Se alternan fondos (crema/blanco/verde/amarillo)?
- [ ] ¿El CTA principal domina cuando corresponde?
- [ ] ¿Hero funciona en mobile (sin perder personalidad tipográfica)?
- [ ] ¿Cards colapsan correctamente (4/3/2/1 columnas)?
- [ ] ¿Touch targets ≥ 44×44px?
- [ ] ¿Focus visible?
- [ ] ¿Imágenes con `alt` cuando corresponde?
- [ ] ¿La interfaz no depende solo del color?
- [ ] ¿Se respeta `prefers-reduced-motion`?
- [ ] ¿Breakpoints: mobile <640 / tablet 640–1024 / desktop 1024–1440 / large >1440?
- [ ] ¿Estados de componentes definidos (default, hover, focus, active, disabled, loading, error, success)?
