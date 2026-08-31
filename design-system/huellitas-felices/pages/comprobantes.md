# Page Spec — Comprobantes de proveedores (HU-PROV-04)

**Ruta:** `/proveedores?tab=comprobantes` (tab de la página Proveedores; la ruta `/proveedores/comprobantes` redirige acá)  
**Brief:** `docs/briefs/HU-PROV-04.md`  
**Módulo de componentes:** `src/components/comprobantes/`

## Flujo de 2 pasos

- Sin stepper visual: el paso 1 muestra dropzone + botón "Volver al historial"; el paso 2 tiene layout 2 paneles (preview 55% + formulario 45%) en `lg:flex-row`, apilado en mobile.
- La vista (historial | nuevo) la controla la pantalla (`/proveedores`): el botón naranja "Nuevo comprobante" del header se oculta mientras estás en el flujo nuevo y reaparece al guardar/cancelar (`onTabChange`).
- El formulario del paso 2 se divide en 2 sub-pasos (`formPaso`) para no scrollear mientras se lee el PDF: **cabecera** (Tipo, Pto venta+Número, Fecha, CUIT, OC, Factura original si NC/ND) + botón "Siguiente" (valida cabecera `validarCabecera()`); luego **Monto total + Detalle de líneas** con acciones Volver | Cancelar | Guardar comprobante.

## Estados OCR → campos

| Confianza | Borde | Mensaje | Ícono |
|-----------|-------|---------|-------|
| alta | normal | — | CheckCircle2 success |
| media | `border-status-warning` | "Verificar" | AlertTriangle warning-strong |
| baja | `border-destructive` | "Revisar" | AlertTriangle destructive |
| no reconocido | `border-destructive` | "Completar manualmente" | AlertTriangle destructive |

## Estado Comprobante → StatusBadge

| Estado | variant | label |
|--------|---------|-------|
| Vigente | success | Vigente |
| Anulado | danger | Anulado |

## Componentes nuevos creados

- `DropzoneComprobante` — dropzone con estados idle/uploading/error, spinner OCR inline
- `OcrFieldGroup` — wrapper con indicador de confianza OCR
- `DetalleLineasTable` — tabla editable de líneas con IVA inline
- `EstadoComprobanteBadge` — mapea estado → StatusBadge
- `FiltrosComprobantes` — botón Filtros (dropdown con 6 filtros) + `FiltrosComprobantesChips` (etiquetas removibles)
- `ComprobantesTable` — historial con acciones Ver/Anular
- `AnularComprobanteModal` — modal de anulación con campo motivo
- `PreviewComprobantePdf` — visor nativo del documento subido (iframe `blob:` del navegador); para JPG/PNG muestra la imagen; revoca object URL al desmontar

## Notas NC/ND

- Si `tipo.startsWith("Nota de")` → mostrar campo obligatorio "Factura original que corrige".
- Opciones: facturas Vigentes del historial, excluyendo NC/ND.

## BACKEND points

- `GET /api/ordenes-compra?estado=recibida-parcial,recibida-total` → llenar select OC
- `POST /api/comprobantes/ocr` (FormData con el archivo) → `datosOCR`
- `POST /api/comprobantes` → guardar cabecera + detalle
- `POST /api/comprobantes/{id}/anular` con `{ motivo }` → genera comprobante de anulación
