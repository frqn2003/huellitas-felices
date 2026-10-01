/**
 * Generador nativo de Comprobante PDF (Pet Bliss Style)
 * Genera un PDF 1.4 binario válido sin librerías externas pesadas.
 * BACKEND: En producción este archivo puede ser sustituido por el PDF
 * generado por el backend desde GET /api/caja/comprobantes/:id/pdf.
 */

export interface ItemComprobantePdf {
  codigo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  precioUnitario: number;
}

export interface ItemMedioPagoPdf {
  medio: string;
  monto: number;
  referencia?: string;
}

export interface DatosComprobantePdf {
  numero: string;
  fechaHora: string;
  turnoId: number;
  clienteNombre: string;
  clienteDoc?: string | null;
  clienteTel?: string | null;
  mascotaNombre: string;
  mascotaEspecie: string;
  mascotaRaza?: string | null;
  profesional: string;
  practicaNombre: string;
  arancel: number;
  productos: ItemComprobantePdf[];
  subtotalNeto?: number;
  impuestosIva?: number;
  total: number;
  medioPago: string;
  mediosPago?: ItemMedioPagoPdf[];
  referencia?: string;
  observaciones?: string;
}

function normalizarTextoPdf(str: string): string {
  return (
    str
      // Reemplaza tildes y caracteres especiales a equivalentes limpios
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
  );
}

export function construirPdfComprobanteBlob(datos: DatosComprobantePdf): Blob {
  const width = 595.28; // A4 pt
  const height = 841.89; // A4 pt

  const ops: string[] = [];

  const text = (
    str: string,
    x: number,
    y: number,
    font = "/F1",
    size = 10,
    r = 0.07,
    g = 0.31,
    b = 0.24,
  ) => {
    const escaped = normalizarTextoPdf(str);
    ops.push(
      `BT ${font} ${size} Tf ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escaped}) Tj ET`,
    );
  };

  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    fillR = 1,
    fillG = 1,
    fillB = 1,
    strokeR = 0.87,
    strokeG = 0.85,
    strokeB = 0.78,
  ) => {
    ops.push(
      `${fillR.toFixed(3)} ${fillG.toFixed(3)} ${fillB.toFixed(3)} rg ${strokeR.toFixed(3)} ${strokeG.toFixed(3)} ${strokeB.toFixed(3)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re B`,
    );
  };

  const line = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    r = 0.87,
    g = 0.85,
    b = 0.78,
    w = 1,
  ) => {
    ops.push(
      `${w} w ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`,
    );
  };

  // 1. Tarjeta principal de fondo (tono crema suave #FFF9EB)
  rect(36, 60, 523.28, 720, 1, 0.98, 0.92, 0.87, 0.85, 0.78);

  // 2. Encabezado principal (verde bosque #114F3C)
  rect(36, 705, 523.28, 75, 0.067, 0.31, 0.235, 0.067, 0.31, 0.235);
  text("HUELLITAS FELICES", 54, 750, "/F2", 18, 1, 0.98, 0.92);
  text("CENTRO VETERINARIO - CLINICA Y FARMACIA", 54, 733, "/F1", 9, 0.94, 0.93, 0.87);
  text("CUIT: 30-71234567-8 | IVA RESPONSABLE INSCRIPTO", 54, 720, "/F1", 8, 0.82, 0.85, 0.8);

  text("COMPROBANTE DE COBRO", 360, 752, "/F2", 11, 0.976, 0.663, 0.0); // acento amarillo Pet Bliss
  text(`Recibo: ${datos.numero}`, 360, 736, "/F2", 10, 1, 1, 1);
  text(`Fecha: ${datos.fechaHora}`, 360, 721, "/F1", 8.5, 0.94, 0.93, 0.87);

  // 3. Badge de estado PAGADO
  rect(460, 665, 80, 22, 0.86, 0.96, 0.88, 0.08, 0.5, 0.24);
  text("PAGADO", 478, 672, "/F2", 9.5, 0.08, 0.5, 0.24);

  // 4. Bloque Turno, Cliente & Paciente
  text(`TURNO #${String(datos.turnoId).padStart(4, "0")}`, 54, 672, "/F2", 13, 0.067, 0.31, 0.235);
  line(54, 656, 540, 656, 0.82, 0.8, 0.74);

  // Columna 1: Cliente
  text("DATOS DEL CLIENTE / TITULAR", 54, 640, "/F2", 8.5, 0.33, 0.44, 0.4);
  text(`Titular: ${datos.clienteNombre}`, 54, 624, "/F2", 10, 0.067, 0.31, 0.235);
  text(`Documento (DNI): ${datos.clienteDoc || "—"}`, 54, 610, "/F1", 9, 0.25, 0.25, 0.25);
  text(`Telefono: ${datos.clienteTel || "—"}`, 54, 596, "/F1", 9, 0.25, 0.25, 0.25);

  // Columna 2: Paciente y Profesional / Mostrador
  if (datos.mascotaNombre) {
    text("PACIENTE Y ATENCION MEDICA", 300, 640, "/F2", 8.5, 0.33, 0.44, 0.4);
    text(
      `Paciente: ${datos.mascotaNombre} (${datos.mascotaEspecie}${datos.mascotaRaza ? ` · ${datos.mascotaRaza}` : ""})`,
      300,
      624,
      "/F2",
      10,
      0.067,
      0.31,
      0.235,
    );
    text(`Profesional: ${datos.profesional}`, 300, 610, "/F1", 9, 0.25, 0.25, 0.25);
    text(`Servicio: ${datos.practicaNombre}`, 300, 596, "/F1", 9, 0.25, 0.25, 0.25);
  } else {
    text("OPERACION DE MOSTRADOR", 300, 640, "/F2", 8.5, 0.33, 0.44, 0.4);
    text("Venta Directa de Articulos", 300, 624, "/F2", 10, 0.067, 0.31, 0.235);
    text("Atencion Mostrador / Farmacia", 300, 610, "/F1", 9, 0.25, 0.25, 0.25);
    text("Sucursal Principal", 300, 596, "/F1", 9, 0.25, 0.25, 0.25);
  }

  line(54, 580, 540, 580, 0.82, 0.8, 0.74);

  // 5. Tabla de Conceptos Facturados
  rect(54, 550, 486, 22, 0.94, 0.93, 0.87, 0.87, 0.85, 0.78);
  text("DETALLE DEL CONCEPTO / ITEM", 64, 557, "/F2", 8, 0.33, 0.44, 0.4);
  text("CANT.", 340, 557, "/F2", 8, 0.33, 0.44, 0.4);
  text("PRECIO UNIT.", 395, 557, "/F2", 8, 0.33, 0.44, 0.4);
  text("SUBTOTAL", 480, 557, "/F2", 8, 0.33, 0.44, 0.4);

  let currentY = 530;

  // Renglón 1: Arancel del Servicio (si aplica)
  if (datos.arancel > 0) {
    text(datos.practicaNombre, 64, currentY, "/F2", 9, 0.067, 0.31, 0.235);
    text("1 Servicio", 340, currentY, "/F1", 9, 0.25, 0.25, 0.25);
    text(`$ ${datos.arancel.toLocaleString("es-AR")}`, 395, currentY, "/F1", 9, 0.25, 0.25, 0.25);
    text(`$ ${datos.arancel.toLocaleString("es-AR")}`, 480, currentY, "/F2", 9, 0.067, 0.31, 0.235);
    line(54, currentY - 7, 540, currentY - 7, 0.9, 0.88, 0.82);
    currentY -= 20;
  }

  // Renglones: Insumos y Medicamentos
  datos.productos.forEach((p) => {
    text(`${p.nombre} (${p.codigo})`, 64, currentY, "/F1", 8.5, 0.15, 0.15, 0.15);
    text(`${p.cantidad} ${p.unidad}`, 340, currentY, "/F1", 8.5, 0.25, 0.25, 0.25);
    text(`$ ${p.precioUnitario.toLocaleString("es-AR")}`, 395, currentY, "/F1", 8.5, 0.25, 0.25, 0.25);
    text(
      `$ ${(p.cantidad * p.precioUnitario).toLocaleString("es-AR")}`,
      480,
      currentY,
      "/F2",
      8.5,
      0.067,
      0.31,
      0.235,
    );
    line(54, currentY - 7, 540, currentY - 7, 0.9, 0.88, 0.82);
    currentY -= 20;
  });

  // 6. Bloque de Totales y Liquidación con desglose fiscal (HU-VTA-01)
  const subtotalNeto = datos.subtotalNeto ?? Math.round(datos.total / 1.21);
  const impuestosIva = datos.impuestosIva ?? (datos.total - subtotalNeto);

  const boxTop = Math.min(currentY - 15, 330);
  rect(54, boxTop - 100, 486, 100, 1, 1, 1, 0.87, 0.85, 0.78);

  const formatNombreMedio = (m: string) => {
    switch (m) {
      case "efectivo":
        return "Efectivo";
      case "transferencia":
        return "Transferencia / QR";
      case "tarjeta_debito":
        return "Tarjeta Debito";
      case "tarjeta_credito":
        return "Tarjeta Credito";
      default:
        return m.toUpperCase();
    }
  };

  if (datos.mediosPago && datos.mediosPago.length > 1) {
    text("MEDIOS DE PAGO (COMBINADO):", 68, boxTop - 18, "/F2", 8.5, 0.33, 0.44, 0.4);
    let mpY = boxTop - 32;
    datos.mediosPago.slice(0, 3).forEach((item) => {
      const refTxt = item.referencia ? ` (Ref: ${item.referencia})` : "";
      text(`* ${formatNombreMedio(item.medio)}: $${item.monto.toLocaleString("es-AR")}${refTxt}`, 68, mpY, "/F1", 7.5, 0.15, 0.15, 0.15);
      mpY -= 12;
    });
    if (datos.observaciones) {
      text(`Obs: ${datos.observaciones}`, 68, boxTop - 80, "/F1", 7.5, 0.4, 0.4, 0.4);
    }
  } else {
    const singleMedio = datos.mediosPago?.[0]?.medio || datos.medioPago;
    text("MEDIO DE PAGO:", 68, boxTop - 25, "/F2", 9, 0.33, 0.44, 0.4);
    text(
      formatNombreMedio(singleMedio).toUpperCase(),
      160,
      boxTop - 25,
      "/F2",
      9.5,
      0.067,
      0.31,
      0.235,
    );
    if (datos.referencia || datos.mediosPago?.[0]?.referencia) {
      const ref = datos.referencia || datos.mediosPago?.[0]?.referencia;
      text(`Nro de Comprobante / Ref: ${ref}`, 68, boxTop - 45, "/F1", 8.5, 0.25, 0.25, 0.25);
    }
    if (datos.observaciones) {
      text(`Observaciones de caja: ${datos.observaciones}`, 68, boxTop - 65, "/F1", 8, 0.4, 0.4, 0.4);
    }
  }

  // Desglose fiscal de Subtotal, IVA y Total
  text("SUBTOTAL (Neto):", 345, boxTop - 25, "/F1", 8.5, 0.33, 0.44, 0.4);
  text(`$ ${subtotalNeto.toLocaleString("es-AR")}`, 460, boxTop - 25, "/F2", 8.5, 0.15, 0.15, 0.15);

  text("IVA (21%):", 345, boxTop - 42, "/F1", 8.5, 0.33, 0.44, 0.4);
  text(`$ ${impuestosIva.toLocaleString("es-AR")}`, 460, boxTop - 42, "/F2", 8.5, 0.15, 0.15, 0.15);

  line(345, boxTop - 52, 525, boxTop - 52, 0.85, 0.85, 0.85);

  text("TOTAL:", 345, boxTop - 70, "/F2", 10, 0.067, 0.31, 0.235);
  text(
    `$ ${datos.total.toLocaleString("es-AR")}`,
    430,
    boxTop - 70,
    "/F2",
    13,
    0.067,
    0.31,
    0.235,
  );

  // 7. Pie de documento
  text(
    "Documento oficial emitido por Huellitas Felices - Sistema ERP de Gestion Veterinaria",
    115,
    90,
    "/F1",
    8,
    0.5,
    0.5,
    0.5,
  );
  text("Comprobante valido como constancia de atencion y pago en mostrador", 140, 78, "/F1", 7.5, 0.6, 0.6, 0.6);

  const streamContent = ops.join("\n");
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(streamContent);
  const streamLength = streamBytes.length;

  const pdfParts: Uint8Array[] = [];
  const appendStr = (s: string) => pdfParts.push(encoder.encode(s));

  appendStr("%PDF-1.4\n");

  const offsets: number[] = [];
  const getByteLength = () => pdfParts.reduce((acc, p) => acc + p.length, 0);

  const addObj = (objContent: string) => {
    offsets.push(getByteLength());
    appendStr(objContent + "\n");
  };

  addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
  addObj(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj`,
  );
  addObj("4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");
  addObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj");
  addObj(`6 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`);

  const startXref = getByteLength();

  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += String(offset).padStart(10, "0") + " 00000 n \n";
  }
  xref += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;

  appendStr(xref);

  return new Blob(pdfParts as BlobPart[], { type: "application/pdf" });
}

export function descargarPdfComprobante(datos: DatosComprobantePdf): void {
  const blob = construirPdfComprobanteBlob(datos);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comprobante-turno-${datos.turnoId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
