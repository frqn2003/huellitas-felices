# Design System --- Pet Bliss Style

## Análisis visual exhaustivo y guía de implementación

> **Objetivo:** documentar el lenguaje visual de la landing analizada y
> convertirlo en un sistema reutilizable para diseñar otra página con el
> mismo ADN visual, sin depender del contenido específico de mascotas.

------------------------------------------------------------------------

# 1. Resumen ejecutivo

La interfaz pertenece a una categoría de **pet-care / e-commerce
lifestyle** y combina:

-   estética cálida y natural;
-   personalidad amigable y juguetona;
-   sensación artesanal/eco;
-   estructura comercial orientada a conversión;
-   fotografía emocional;
-   tipografía pesada y expresiva;
-   fondos crema;
-   verde bosque como color institucional;
-   amarillo/naranja como color de acción;
-   formas redondeadas y orgánicas;
-   imágenes recortadas y superpuestas;
-   mucho espacio negativo;
-   alternancia de secciones para crear ritmo visual.

### DNA visual

> **Cream background + forest green + warm yellow + bold uppercase
> typography + emotional photography + rounded cards + organic shapes +
> overlapping imagery + generous whitespace.**

La identidad no depende de un único elemento. Se construye por la
combinación consistente de estos recursos.

------------------------------------------------------------------------

# 2. Personalidad de marca

## 2.1 Atributos principales

  Atributo        Intensidad
  ------------- ------------
  Amigable               5/5
  Divertida              4/5
  Natural                4/5
  Comercial              4/5
  Profesional            3/5
  Minimalista            3/5
  Premium                2/5
  Infantil               2/5

## 2.2 Principio de personalidad

La interfaz debe sentirse:

**Playful, but not childish.**

Debe transmitir cercanía y alegría sin perder credibilidad.

### Debe evitar

-   estética corporativa fría;
-   minimalismo excesivamente tecnológico;
-   lujo excesivamente sobrio;
-   ilustraciones infantiles dominantes;
-   saturación de colores;
-   exceso de sombras;
-   componentes visualmente pesados.

------------------------------------------------------------------------

# 3. Principios de diseño

## 01 --- Warm first

El canvas principal debe sentirse cálido y acogedor, nunca clínico.

## 02 --- Green is the brand

El verde bosque es el color que comunica identidad, confianza y
naturaleza.

## 03 --- Yellow means action

El amarillo/naranja funciona principalmente como color de conversión.

## 04 --- Photography has personality

Las fotografías deben comunicar emoción y vida, no funcionar solamente
como decoración.

## 05 --- Typography creates hierarchy

Los headings grandes, pesados y generalmente uppercase forman parte de
la identidad.

## 06 --- Organic over geometric

Se priorizan curvas, máscaras, blobs, overlaps y composiciones naturales
sobre layouts excesivamente rígidos.

## 07 --- Playful, never childish

La experiencia puede ser alegre y expresiva sin parecer una interfaz
infantil.

## 08 --- Commerce follows storytelling

La página alterna contenido de marca con contenido comercial para evitar
que todo se perciba como catálogo.

## 09 --- Contrast creates rhythm

Las secciones crema, verde, amarillo y blanco se alternan para mantener
movimiento visual.

## 10 --- One clear action at a time

El amarillo debe concentrar la atención en acciones importantes y no
aparecer indiscriminadamente.

------------------------------------------------------------------------

# 4. Arquitectura visual de la página

La estructura observada sigue aproximadamente este patrón:

``` text
HEADER
↓
HERO
↓
CATEGORY / COLLECTION
↓
BRAND STORY
↓
BENEFITS / WHY CHOOSE US
↓
PRODUCT GRID
↓
SOCIAL PROOF / PET PARENTS
↓
PROMOTIONAL CTA
↓
PROCESS
↓
TRUST BAR
↓
ARTICLES / BLOG
↓
FAQ
↓
FINAL CTA
↓
FOOTER
```

Esta secuencia tiene una lógica de conversión:

``` text
Atención
↓
Qué ofrecemos
↓
Quiénes somos
↓
Por qué confiar
↓
Qué comprar
↓
Prueba social
↓
Oferta / acción
↓
Cómo funciona
↓
Confianza
↓
Contenido
↓
Objeciones
↓
Conversión final
```

------------------------------------------------------------------------

# 5. Paleta de color

> Los valores siguientes son **tokens de referencia aproximados**,
> inferidos visualmente de la captura. Para una implementación
> definitiva conviene ajustarlos con un color picker sobre los assets
> originales.

## 5.1 Colores principales

  Token              Hex aproximado   Uso
  ------------------ ---------------- -----------------------------------------
  `green-900`        `#114F3C`        Brand, headings, fondos oscuros, footer
  `green-700`        `#245E4D`        Superficies verdes, cards, variaciones
  `yellow-500`       `#F9A900`        CTA, promociones, highlights
  `cream-50`         `#FFF9EB`        Background principal
  `cream-100`        `#F0ECDF`        Background secundario
  `white`            `#FFFFFF`        Cards y superficies
  `text-secondary`   `#547066`        Texto secundario
  `border`           `#DDD8C8`        Bordes y divisores

## 5.2 Jerarquía cromática

La composición visual puede entenderse aproximadamente como:

-   **60%** crema / neutros cálidos;
-   **30%** verde;
-   **10%** amarillo/naranja.

El amarillo funciona porque es relativamente escaso.

## 5.3 Reglas de uso

### Verde oscuro

Usar para:

-   títulos;
-   navegación;
-   footer;
-   secciones institucionales;
-   elementos de confianza;
-   botones secundarios;
-   fondos de alto contraste.

### Amarillo

Usar para:

-   CTA principal;
-   botones de compra;
-   badges;
-   promociones;
-   destacados;
-   llamadas a la acción.

### Crema

Usar para:

-   canvas;
-   secciones editoriales;
-   espacios de descanso;
-   backgrounds principales.

### Blanco

Usar para:

-   cards;
-   superficies de producto;
-   bloques internos;
-   áreas que necesiten contraste con el fondo crema.

### Colores de estado (badges)

Paleta semántica **exclusiva para etiquetas de estado** (pills con punto o
ícono + texto). Nunca usarla para botones, fondos de sección ni CTAs — esos
siguen usando verde oscuro / amarillo / destructive.

| Semántica | Color | Punto | Texto del chip | Estados típicos |
|-----------|-------|-------|----------------|-----------------|
| Positivo / completado | Verde vibrante | `status-success` `#16A34A` | `status-success-strong` `#15803D` | Activo, Normal, Ingreso, Recibida Total, Adjudicada |
| Pendiente / atención | Amarillo vibrante | `status-warning` `#F59E0B` | `status-warning-strong` `#B45309` | Pendiente, Bajo, Ajuste, Abierta, Recibida Parcial |
| En proceso / tránsito | Azul | `status-info` `#2563EB` | `status-info-strong` `#1D4ED8` | Enviada, Transferencia |
| Negativo / crítico | Rojo | `status-danger` `#DC2626` | `status-danger-strong` `#B91C1C` | Crítico, Egreso, Cancelada |
| Neutro | Gris crema | `text-secondary` | `text-secondary` | Inactivo |

Reglas:

-   Patrón único de chip: fondo `bg-status-X/10`, texto `-strong`, punto
    sólido `status-X`. Implementado en el componente `StatusBadge`
    (`src/components/ui/StatusBadge.tsx`) — los badges de cada módulo son
    wrappers que solo definen su mapeo.
-   Siempre indicador visual (punto o ícono) + texto; nunca color solo.
-   El amarillo de estado (`#F59E0B`) es distinto del amarillo de acción
    (`accent-500 #F9A900`): uno comunica "pendiente", el otro dispara la
    acción principal. No intercambiarlos.

------------------------------------------------------------------------

# 6. Tokens de color sugeridos

``` css
:root {
  --color-primary: #114F3C;
  --color-primary-light: #245E4D;

  --color-accent: #F9A900;
  --color-accent-hover: #E99C00;

  --color-background: #FFF9EB;
  --color-background-secondary: #F0ECDF;

  --color-surface: #FFFFFF;

  --color-text-primary: #114F3C;
  --color-text-secondary: #547066;

  --color-border: #DDD8C8;

  /* Colores de estado: SOLO etiquetas/badges de estado (ver 5.3) */
  --color-status-success: #16A34A;
  --color-status-success-strong: #15803D;
  --color-status-warning: #F59E0B;
  --color-status-warning-strong: #B45309;
  --color-status-danger: #DC2626;
  --color-status-danger-strong: #B91C1C;
  --color-status-info: #2563EB;
  --color-status-info-strong: #1D4ED8;
}
```

------------------------------------------------------------------------

# 7. Tipografía

La tipografía observada es:

-   pesada;
-   compacta;
-   redondeada o de apariencia amable;
-   altamente legible;
-   expresiva en títulos;
-   mucho más neutra en cuerpo.

## 7.1 Títulos

Características:

-   uppercase;
-   weight alto;
-   tracking ligeramente cerrado;
-   line-height compacto;
-   color verde oscuro;
-   frases cortas.

Ejemplo conceptual:

``` text
NO MORE TROUBLE
WITH PET HAIRS
```

## 7.2 Jerarquía recomendada

### Display

``` text
48–64 px
Weight: 800–900
Line-height: 0.90–1.00
Letter-spacing: -2% aprox.
```

### H1

``` text
40–48 px
Weight: 800
Line-height: 0.95–1.05
```

### H2

``` text
28–36 px
Weight: 800
Line-height: 1.00–1.10
```

### H3

``` text
18–22 px
Weight: 700–800
Line-height: 1.10–1.25
```

### Body

``` text
14–16 px
Weight: 400–500
Line-height: 1.45–1.60
```

### Small

``` text
11–13 px
Weight: 500
Line-height: 1.30–1.40
```

## 7.3 Recomendación de familias

Para conservar el carácter visual, elegir una familia display sans con
personalidad redondeada y una sans muy legible para body.

Una implementación posible:

``` text
Display: Baloo 2 / Nunito ExtraBold / similar
Body: Nunito / Inter / similar
```

La elección definitiva debe validarse contra el logotipo y los assets de
marca.

------------------------------------------------------------------------

# 8. Sistema de espaciado

Se recomienda utilizar una escala consistente:

``` text
4
8
12
16
20
24
32
40
48
64
80
96
120
```

### Valores de uso frecuente

  Token          Valor Uso
  ------------ ------- ---------------------
  `space-1`        4px micro separación
  `space-2`        8px icono/texto
  `space-3`       12px padding pequeño
  `space-4`       16px padding estándar
  `space-5`       20px gaps compactos
  `space-6`       24px cards / grid
  `space-8`       32px grupos
  `space-10`      40px componentes
  `space-12`      48px separación media
  `space-16`      64px secciones compactas
  `space-20`      80px secciones
  `space-24`      96px grandes bloques

------------------------------------------------------------------------

# 9. Grid y layout

## Desktop

Usar:

``` text
Max width: 1200px aprox.
12 columnas
Gap: 20–24px
Padding horizontal: 24px
```

Conceptualmente:

``` text
┌──────────────────────────────────────────────┐
│                  1200px                      │
│                                              │
│  ┌────┬────┬────┬────┬────┬────┐            │
│  │    │    │    │    │    │    │            │
│  └────┴────┴────┴────┴────┴────┘            │
│                                              │
└──────────────────────────────────────────────┘
```

## Tablet

``` text
8 columnas
```

## Mobile

``` text
4 columnas
```

## Container

``` css
.container {
  width: min(1200px, calc(100% - 48px));
  margin-inline: auto;
}
```

------------------------------------------------------------------------

# 10. Border radius

La interfaz utiliza redondeos moderados.

``` text
radius-sm:   8px
radius-md:  12px
radius-lg:  16px
radius-pill: 999px
```

### Regla

-   Cards: 8--12px
-   Imágenes grandes: 10--16px
-   Botones: pill
-   Chips: pill
-   Grandes bloques decorativos: 16px o formas orgánicas

No utilizar `24px+` en todos los componentes, porque cambiaría el
carácter visual hacia un estilo SaaS más contemporáneo.

------------------------------------------------------------------------

# 11. Sombras

Las sombras deben ser discretas.

``` css
--shadow-card: 0 4px 16px rgba(17, 79, 60, 0.08);
```

Evitar:

-   sombras negras fuertes;
-   grandes blur;
-   efectos glassmorphism;
-   múltiples sombras simultáneas.

La interfaz depende más de **color, espacio y fotografía** que de
sombras.

------------------------------------------------------------------------

# 12. Header

## Estructura

``` text
┌─────────────────────────────────────────────┐
│ LOGO      NAV NAV NAV NAV          CTA      │
└─────────────────────────────────────────────┘
```

Características:

-   background crema;
-   altura visual relativamente compacta;
-   logo pequeño;
-   navegación discreta;
-   CTA amarillo;
-   mucho espacio horizontal.

## Comportamiento

Desktop:

``` text
Logo | Navigation | CTA
```

Mobile:

``` text
Logo                    Menu
```

El CTA puede permanecer dentro del menú móvil si el espacio es reducido.

------------------------------------------------------------------------

# 13. Botones

## Primary

``` css
background: #F9A900;
color: #114F3C;
border-radius: 999px;
```

## Secondary

``` css
background: #114F3C;
color: #FFFFFF;
border-radius: 999px;
```

## Outline

``` css
background: transparent;
border: 1px solid #114F3C;
color: #114F3C;
border-radius: 999px;
```

## Ghost

``` css
background: transparent;
color: #114F3C;
```

## Tamaños

### Large

``` text
height: 48–52px
padding-inline: 24–32px
```

### Medium

``` text
height: 40–44px
padding-inline: 20–24px
```

### Small

``` text
height: 32–36px
padding-inline: 14–18px
```

## Estados

### Hover

``` text
Yellow → slightly darker yellow
```

### Active

``` css
transform: scale(0.97);
```

### Disabled

``` css
opacity: 0.45;
```

------------------------------------------------------------------------

# 14. Hero

El hero es uno de los elementos más distintivos.

## Estructura

``` text
             EYEBROW

        LARGE HEADLINE
        LARGE HEADLINE

          DESCRIPTION

             [ CTA ]

       DOG              CAT
```

Las mascotas funcionan como elementos gráficos recortados y no solamente
como una imagen convencional.

## Principios

-   headline grande;
-   CTA claramente visible;
-   fotografías expresivas;
-   sujetos recortados;
-   overlap;
-   fondo crema;
-   sección con alta personalidad.

## Composición

Las imágenes pueden invadir visualmente el límite inferior de la
sección:

``` text
       TITLE
         ↓
┌───────────────────────┐
│                       │
│        HERO           │
│                       │
└───────────────────────┘
     🐕           🐈
```

Este patrón debe conservarse al crear una nueva página.

------------------------------------------------------------------------

# 15. Fotografía

La fotografía es parte del sistema de marca.

## Tipos

### Lifestyle

Persona + mascota / producto en contexto.

### Pet portrait

Mascota expresiva, preferiblemente mirando hacia cámara.

### Product photography

Producto sobre fondo neutro y limpio.

## Dirección de arte

Preferir:

-   luz natural;
-   colores cálidos;
-   fondos claros;
-   expresiones espontáneas;
-   ambientes domésticos;
-   sensación de cercanía;
-   fotografías con composición sencilla.

Evitar:

-   stock demasiado artificial;
-   iluminación excesivamente dramática;
-   fondos negros;
-   fotografía corporativa;
-   saturación excesiva;
-   imágenes sin relación emocional con el producto.

------------------------------------------------------------------------

# 16. Overlap y composición

El sistema utiliza mucho:

``` text
IMAGE
↓
overlap
↓
SECTION
```

Recursos recomendados:

-   imágenes transparentes;
-   sujetos recortados;
-   elementos que cruzan límites;
-   tarjetas parcialmente superpuestas;
-   stickers;
-   blobs;
-   pequeñas decoraciones.

Esto crea una identidad más viva que una cuadrícula completamente
rígida.

------------------------------------------------------------------------

# 17. Collection / Category Section

Después del hero aparece una sección de colección.

``` text
          TITLE
       DESCRIPTION

┌────┐ ┌────┐ ┌────┐ ┌────┐
│IMG │ │IMG │ │IMG │ │IMG │
│TXT │ │TXT │ │TXT │ │TXT │
└────┘ └────┘ └────┘ └────┘

             [ CTA ]
```

Objetivo:

**explicar rápidamente qué ofrece la marca.**

Las cards son compactas para mantener el ritmo.

------------------------------------------------------------------------

# 18. Product Card

## Estructura

``` text
┌─────────────────────┐
│                     │
│       IMAGE         │
│                     │
├─────────────────────┤
│ CATEGORY            │
│ PRODUCT NAME        │
│ PRICE               │
│                     │
│      [ CTA ]        │
└─────────────────────┘
```

## Características

-   superficie blanca;
-   border sutil;
-   radius moderado;
-   fotografía dominante;
-   nombre compacto;
-   precio claramente visible;
-   CTA amarillo.

------------------------------------------------------------------------

# 19. Product Grid

Desktop:

``` text
┌────────┐ ┌────────┐ ┌────────┐
│ PRODUCT│ │ PRODUCT│ │ PRODUCT│
└────────┘ └────────┘ └────────┘

┌────────┐ ┌────────┐ ┌────────┐
│ PRODUCT│ │ PRODUCT│ │ PRODUCT│
└────────┘ └────────┘ └────────┘
```

Mobile:

``` text
┌──────────────────┐
│ PRODUCT          │
└──────────────────┘

┌──────────────────┐
│ PRODUCT          │
└──────────────────┘
```

------------------------------------------------------------------------

# 20. Category filters

Los filtros deben parecer secundarios.

``` text
[ ALL ] [ DOG ] [ CAT ] [ ACCESSORIES ]
```

### Active

``` text
background: #114F3C
color: white
```

### Default

``` text
background: transparent
border: #114F3C
color: #114F3C
```

------------------------------------------------------------------------

# 21. Brand Story / About

El bloque editorial cambia el ritmo.

Desktop:

``` text
┌───────────────┐  ┌───────────────┐
│               │  │               │
│     TEXT      │  │     IMAGE     │
│               │  │               │
└───────────────┘  └───────────────┘
```

Puede invertirse en la siguiente sección:

``` text
IMAGE | TEXT
```

Esto evita monotonía.

## Objetivo

Comunicar:

-   propósito;
-   historia;
-   filosofía;
-   conexión emocional;
-   diferenciación.

------------------------------------------------------------------------

# 22. Why Choose Us

Patrón:

``` text
IMAGE

TITLE

✓ Benefit
  Description

✓ Benefit
  Description

✓ Benefit
  Description
```

Puede acompañarse con pequeñas tarjetas de beneficios.

## Benefit Card

``` text
ICON
TITLE / NUMBER
DESCRIPTION
```

Los colores pueden alternarse:

``` text
GREEN
GREEN
YELLOW
```

------------------------------------------------------------------------

# 23. Social Proof / Pet Parents

La sección utiliza imágenes y color para crear comunidad.

Estructura:

``` text
             TITLE

 [PHOTO] [PHOTO] [PHOTO] [PHOTO]

       testimonial / category
```

Puede utilizar:

-   fotos de clientes;
-   mascotas;
-   testimonios;
-   contenido generado por usuarios;
-   ratings;
-   pequeños mensajes.

## Principio

La prueba social debe sentirse **humana**, no corporativa.

------------------------------------------------------------------------

# 24. Promotional CTA Band

Una sección de color fuerte sirve como ruptura visual.

Ejemplo:

``` text
████████████████████████████
      EXPLORE OUR
      AFFORDABLE

   [ PHOTO ] [ PHOTO ] [ PHOTO ]

████████████████████████████
```

La sección amarilla/naranja funciona como:

-   promoción;
-   cambio de ritmo;
-   llamada a explorar;
-   punto de atención.

------------------------------------------------------------------------

# 25. Process

El proceso debe ser muy simple.

``` text
OUR PROCESS

[01] ───── [02] ───── [03]
```

Ejemplo conceptual:

``` text
Discover
   ↓
Choose
   ↓
Receive
```

Cada paso puede ser una card compacta.

El objetivo no es explicar todo el negocio, sino reducir incertidumbre.

------------------------------------------------------------------------

# 26. Trust Bar

Una franja breve puede reforzar atributos:

``` text
QUALITY
CARE
INNOVATION
TRUST
SATISFACTION GUARANTEED
```

## Función

No es una sección informativa profunda.

Funciona como:

**brand reinforcement.**

------------------------------------------------------------------------

# 27. Articles / Blog

Cards editoriales:

``` text
┌────────┐ ┌────────┐ ┌────────┐
│ IMAGE  │ │ IMAGE  │ │ IMAGE  │
│        │ │        │ │        │
│ TITLE  │ │ TITLE  │ │ TITLE  │
│ DATE   │ │ DATE   │ │ DATE   │
└────────┘ └────────┘ └────────┘
```

Las imágenes son protagonistas.

El título debe ser corto y legible.

------------------------------------------------------------------------

# 28. FAQ

El FAQ observado es deliberadamente minimalista.

``` text
QUESTION                          +
───────────────────────────────────
QUESTION                          +
───────────────────────────────────
QUESTION                          +
───────────────────────────────────
```

No necesita cards grandes.

## Interacción

-   click/tap en toda la fila;
-   icono `+` / `−`;
-   transición suave;
-   contenido expandible;
-   buen contraste.

------------------------------------------------------------------------

# 29. Final CTA

Antes del footer aparece un último bloque de conversión.

``` text
┌─────────────────────────┐
│ GIVE YOUR PET THE BEST  │
│                         │
│       [ CTA ]           │
└─────────────────────────┘
```

Debe ser:

-   corto;
-   emocional;
-   muy visible;
-   fácil de accionar.

------------------------------------------------------------------------

# 30. Footer

El footer cambia al verde oscuro.

``` text
████████████████████████████

LOGO

Column 1       Column 2       Column 3
Links          Links          Contact

Social icons

Copyright

████████████████████████████
```

## Funciones

-   cierre visual;
-   navegación secundaria;
-   contacto;
-   redes;
-   información legal.

------------------------------------------------------------------------

# 31. Iconografía

Estilo recomendado:

-   outline;
-   stroke medio/grueso;
-   esquinas redondeadas;
-   formas simples;
-   lenguaje amigable.

Evitar:

-   iconos demasiado técnicos;
-   iconos 3D;
-   exceso de detalle;
-   mezcla de estilos.

------------------------------------------------------------------------

# 32. Elementos decorativos

El sistema admite:

-   pequeñas estrellas;
-   hojas;
-   paw prints;
-   blobs;
-   formas orgánicas;
-   pequeños stickers;
-   líneas decorativas.

## Regla

La decoración debe reforzar la personalidad, pero nunca competir con:

1.  headline;
2.  producto;
3.  CTA;
4.  fotografía principal.

------------------------------------------------------------------------

# 33. Ritmo de secciones

Uno de los recursos más importantes es alternar superficies.

Patrón aproximado:

``` text
CREAM
↓
WHITE
↓
GREEN
↓
CREAM
↓
YELLOW
↓
CREAM
↓
GREEN
```

No todas las secciones deben utilizar el mismo fondo.

## Objetivo

Crear:

-   contraste;
-   pausa;
-   jerarquía;
-   sensación de recorrido;
-   variedad.

------------------------------------------------------------------------

# 34. Densidad visual

La landing alterna zonas densas y zonas de descanso.

### Alta densidad

-   product grid;
-   collection cards;
-   articles;
-   testimonials.

### Baja densidad

-   hero;
-   story;
-   CTA;
-   FAQ;
-   trust bar.

Esto evita que la página se sienta saturada.

------------------------------------------------------------------------

# 35. Responsive

## Breakpoints

``` text
Mobile:   < 640px
Tablet:   640–1024px
Desktop:  1024–1440px
Large:    > 1440px
```

## Desktop

``` text
Texto + imagen
```

## Mobile

``` text
Texto
↓
Imagen
```

## Cards

``` text
Desktop: 4 / 3 columnas
Tablet:  2 columnas
Mobile:  1 columna
```

La cantidad exacta depende del contenido.

------------------------------------------------------------------------

# 36. Mobile design principles

En mobile deben conservarse:

### 1. Personalidad tipográfica

No reducir los títulos hasta volverlos genéricos.

### 2. Overlap

Mantener parte de los recortes y superposiciones.

### 3. CTA

El CTA principal debe permanecer muy visible.

### 4. Jerarquía

No intentar meter desktop en una pantalla pequeña.

### 5. Espaciado

Reducir aproximadamente:

``` text
Desktop section: 80–96px
Mobile section: 48–64px
```

------------------------------------------------------------------------

# 37. Accesibilidad

El análisis original puede mejorarse incorporando reglas explícitas de
accesibilidad.

## Contraste

Verificar contraste de:

-   verde sobre crema;
-   verde sobre amarillo;
-   blanco sobre verde;
-   texto secundario sobre crema.

No depender únicamente del color para comunicar estados.

## Focus

Todo control interactivo debe tener un estado de focus visible.

## Touch targets

Usar aproximadamente:

``` text
44 × 44px mínimo
```

para controles táctiles importantes.

## Imágenes

Todas las imágenes informativas deben tener `alt`.

Las imágenes puramente decorativas deben poder ignorarse mediante
tecnología asistiva.

## Movimiento

Los overlaps y animaciones deben ser suaves y respetar:

``` css
@media (prefers-reduced-motion: reduce) {
  /* disable non-essential motion */
}
```

------------------------------------------------------------------------

# 38. Motion / Animation

Aunque la captura es estática, el lenguaje visual se presta a
microinteracciones.

## Recomendado

-   hover suave en cards;
-   leve elevación;
-   imágenes con pequeño scale;
-   aparición al entrar al viewport;
-   expansión del FAQ;
-   transición de filtros;
-   feedback de botones.

## Evitar

-   animaciones permanentes;
-   parallax excesivo;
-   rebotes constantes;
-   transiciones largas.

### Duraciones

``` text
Fast:   120–180ms
Normal: 200–300ms
Slow:   400–600ms
```

Easing:

``` text
ease-out
```

para interacciones directas.

------------------------------------------------------------------------

# 39. Estados de componentes

Todos los componentes interactivos deberían documentar:

``` text
Default
Hover
Focus
Active
Disabled
Loading
Error
Success
```

No todos necesariamente se muestran en la landing, pero deben formar
parte del sistema si el diseño se reutilizará en un producto real.

------------------------------------------------------------------------

# 40. Sistema de cards

Las cards deben compartir una misma familia.

## Base

``` css
background: #FFFFFF;
border-radius: 12px;
box-shadow: 0 4px 16px rgba(17, 79, 60, .08);
```

## Variantes

``` text
Product Card
Article Card
Benefit Card
Testimonial Card
Process Card
Category Card
```

No crear una estética completamente diferente para cada una.

------------------------------------------------------------------------

# 41. Sistema de imágenes

Definir ratios consistentes.

## Product

``` text
1:1
```

## Article

``` text
4:3
```

## Lifestyle

``` text
4:3 / 3:2
```

## Hero

``` text
variable / editorial
```

## Regla

Las imágenes dentro de un mismo grupo deben compartir ratio, recorte y
tratamiento.

------------------------------------------------------------------------

# 42. Arquitectura de componentes

``` text
FOUNDATION
│
├── Colors
├── Typography
├── Spacing
├── Grid
├── Radius
├── Shadows
└── Motion

NAVIGATION
│
├── Header
├── Navigation Link
├── Mobile Menu
└── CTA

CONTENT
│
├── Section Header
├── Heading
├── Body Text
├── Badge
├── Image
└── Divider

COMMERCE
│
├── Product Card
├── Product Grid
├── Category Filter
├── Price
├── Add to Cart
└── Product Badge

BRAND
│
├── Hero
├── Story Block
├── Benefits
├── Testimonials
├── Process
└── Trust Bar

CONVERSION
│
├── Primary CTA
├── Promotional Banner
└── Final CTA

CONTENT MARKETING
│
├── Article Card
└── FAQ

GLOBAL
│
├── Footer
├── Social Links
└── Legal Links
```

------------------------------------------------------------------------

# 43. Tokens completos

``` css
:root {

  /* COLORS */
  --green-900: #114F3C;
  --green-700: #245E4D;

  --yellow-500: #F9A900;
  --yellow-600: #E99C00;

  --cream-50: #FFF9EB;
  --cream-100: #F0ECDF;

  --white: #FFFFFF;

  --text-primary: #114F3C;
  --text-secondary: #547066;
  --border: #DDD8C8;


  /* TYPOGRAPHY */
  --font-display-weight: 800;
  --font-heading-weight: 800;
  --font-body-weight: 400;
  --font-medium-weight: 500;
  --font-bold-weight: 700;


  /* RADIUS */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 999px;


  /* SPACING */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;


  /* LAYOUT */
  --container: 1200px;
  --grid-gap: 24px;


  /* SHADOW */
  --shadow-card:
    0 4px 16px rgba(17, 79, 60, .08);


  /* MOTION */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 500ms;
}
```

------------------------------------------------------------------------

# 44. Reglas de composición

## Regla 1 --- Una jerarquía dominante

Cada viewport debe tener un elemento principal:

``` text
Headline
o
Product
o
CTA
```

No los tres compitiendo al mismo nivel.

## Regla 2 --- Yellow is scarce

No utilizar amarillo en todos los componentes.

## Regla 3 --- Green anchors the layout

El verde debe aparecer de forma recurrente para conectar secciones.

## Regla 4 --- Cream provides breathing room

El crema es el espacio de descanso.

## Regla 5 --- Images break the grid

Las fotografías pueden romper ligeramente la estructura para crear
personalidad.

## Regla 6 --- Rounded does not mean inflated

Mantener radios moderados.

## Regla 7 --- Keep copy short

Los headings de esta estética funcionan mejor como frases breves y
visuales.

------------------------------------------------------------------------

# 45. Escala visual

Una regla útil para mantener el carácter:

``` text
DISPLAY
████████████████████

H1
██████████████

H2
██████████

H3
██████

BODY
████

SMALL
███
```

La diferencia entre títulos y cuerpo debe ser evidente.

------------------------------------------------------------------------

# 46. Qué NO copiar literalmente

Para crear otra web con el mismo estilo pero con identidad propia, no
conviene copiar:

-   textos;
-   fotografías;
-   logotipo;
-   nombres de productos;
-   ilustraciones específicas;
-   composiciones idénticas;
-   proporciones exactas de cada sección;
-   elementos gráficos propietarios.

Lo que se reutiliza es:

**el lenguaje visual y el sistema de diseño.**

------------------------------------------------------------------------

# 47. Qué sí debe permanecer

Para que una nueva web siga sintiéndose de la misma familia, conservar
al menos:

1.  fondo crema cálido;
2.  verde bosque dominante;
3.  amarillo/naranja como acento;
4.  headings bold y uppercase;
5.  fotografía emocional;
6.  cards redondeadas;
7.  CTA tipo pill;
8.  overlaps y formas orgánicas;
9.  alternancia de fondos;
10. bastante espacio negativo;
11. combinación de storytelling + commerce;
12. footer verde oscuro.

------------------------------------------------------------------------

# 48. Fórmula para construir una nueva landing

``` text
HEADER
↓
HERO
↓
COLLECTION / CATEGORIES
↓
STORY
↓
BENEFITS
↓
PRODUCT / SERVICE GRID
↓
SOCIAL PROOF
↓
BIG PROMOTIONAL CTA
↓
PROCESS
↓
TRUST BAR
↓
ARTICLES / RESOURCES
↓
FAQ
↓
FINAL CTA
↓
FOOTER
```

No es obligatorio utilizar todas las secciones.

La arquitectura debe adaptarse al objetivo de negocio.

------------------------------------------------------------------------

# 49. Adaptación a otros sectores

El sistema visual puede trasladarse a:

-   veterinaria;
-   alimentación;
-   cosmética;
-   cafetería;
-   wellness;
-   productos naturales;
-   lifestyle;
-   retail;
-   servicios;
-   marcas de consumo.

### Ejemplo

En una marca de café:

``` text
Pet Photography
→
Lifestyle Photography

Pet Benefits
→
Product Benefits

Pet Parents
→
Customer Stories

Pet Products
→
Coffee Products
```

La estructura cambia, pero el lenguaje visual permanece.

------------------------------------------------------------------------

# 50. Checklist de fidelidad visual

Antes de aprobar una nueva página, comprobar:

## Color

-   [ ] ¿El crema domina el canvas?
-   [ ] ¿El verde funciona como ancla visual?
-   [ ] ¿El amarillo está reservado para acciones?
-   [ ] ¿Existe suficiente contraste?

## Tipografía

-   [ ] ¿Los headings tienen suficiente peso?
-   [ ] ¿Los títulos son predominantemente uppercase?
-   [ ] ¿Existe una jerarquía clara?
-   [ ] ¿El body sigue siendo cómodo de leer?

## Layout

-   [ ] ¿Existe un container consistente?
-   [ ] ¿Las secciones tienen suficiente aire?
-   [ ] ¿El grid es coherente?
-   [ ] ¿Hay variación entre bloques densos y espaciosos?

## Fotografía

-   [ ] ¿Las imágenes se sienten cálidas?
-   [ ] ¿Existe coherencia de iluminación?
-   [ ] ¿Las fotografías tienen personalidad?
-   [ ] ¿Los recortes pueden utilizarse como elementos gráficos?

## Componentes

-   [ ] ¿Los botones comparten estilo?
-   [ ] ¿Las cards pertenecen a la misma familia?
-   [ ] ¿Los radios son consistentes?
-   [ ] ¿Los estados están definidos?

## Composición

-   [ ] ¿Hay overlaps?
-   [ ] ¿Hay formas orgánicas?
-   [ ] ¿Se alternan fondos?
-   [ ] ¿El CTA principal domina cuando corresponde?

## Responsive

-   [ ] ¿El hero funciona en mobile?
-   [ ] ¿Las cards colapsan correctamente?
-   [ ] ¿El texto no queda demasiado pequeño?
-   [ ] ¿Los botones tienen touch targets adecuados?
-   [ ] ¿Los overlaps no rompen el layout?

## Accesibilidad

-   [ ] ¿El contraste fue validado?
-   [ ] ¿Existe focus visible?
-   [ ] ¿Las imágenes tienen alt cuando corresponde?
-   [ ] ¿La interfaz funciona sin depender exclusivamente del color?
-   [ ] ¿Se respeta `prefers-reduced-motion`?

------------------------------------------------------------------------

# 51. Evaluación final del análisis

El análisis inicial cubría correctamente los elementos visuales
principales, pero para convertirlo realmente en un **Design System
reutilizable** faltaban varios aspectos.

Esta versión incorpora explícitamente:

-   tokens de color;
-   escala tipográfica;
-   escala de spacing;
-   grid;
-   breakpoints;
-   radios;
-   sombras;
-   tamaños de botones;
-   estados de interacción;
-   motion;
-   accesibilidad;
-   touch targets;
-   focus;
-   responsive;
-   sistema de imágenes;
-   arquitectura de componentes;
-   variantes de cards;
-   reglas de composición;
-   densidad visual;
-   dirección de arte fotográfica;
-   criterios de fidelidad;
-   reglas de qué copiar y qué no copiar;
-   arquitectura de la landing;
-   adaptación a otros sectores.

### Conclusión

Con esta documentación ya existe una **base suficientemente completa
para reconstruir el lenguaje visual de la página en Figma, HTML/CSS,
React, Webflow o mediante una herramienta de generación de interfaces**.

Los únicos elementos que no pueden considerarse definitivos a partir de
una captura son:

1.  valores exactos de color;
2.  familia tipográfica exacta;
3.  medidas exactas del grid;
4.  especificaciones de interacción no visibles;
5.  comportamiento responsive original;
6.  tokens internos de la marca original.

Por eso esos elementos están documentados como **tokens de referencia**,
no como mediciones oficiales.
