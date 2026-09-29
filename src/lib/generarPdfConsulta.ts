/**
 * Generador nativo de Historia Clínica y Ficha de Atención Médica en PDF (Pet Bliss Style)
 * Genera un PDF 1.4 binario válido sin librerías externas pesadas.
 * BACKEND: En producción este archivo puede ser sustituido por el PDF
 * generado por el backend desde GET /api/consultas/:id/pdf.
 */

export interface InsumoConsultaPdf {
  codigo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
}

export interface NotaConsultaPdf {
  profesional: string;
  fechaHora: string;
  nota: string;
}

export interface DatosConsultaPdf {
  turnoId: number;
  consultaId?: number;
  fecha: string;
  hora: string;
  estado: "abierta" | "cerrada";
  profesionalNombre: string;
  practicaNombre: string;
  clienteNombre: string;
  clienteDni?: string;
  clienteTelefono?: string;
  mascotaNombre: string;
  mascotaEspecie: string;
  mascotaRaza?: string | null;
  mascotaSexo?: string;
  mascotaPesoAnterior?: number | null;
  temperatura?: number | null;
  frecuenciaCardiaca?: number | null;
  pesoMomento?: number | null;
  estadoFisicoGeneral?: string | null;
  motivoConsulta: string;
  diagnostico: string;
  tratamiento?: string | null;
  insumos: InsumoConsultaPdf[];
  notas?: NotaConsultaPdf[];
}

function normalizarTextoPdf(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function construirPdfConsultaBlob(datos: DatosConsultaPdf): Blob {
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

  // 1. Fondo general crema suave Pet Bliss (#FFFDF8)
  rect(0, 0, width, height, 1, 0.992, 0.973, 1, 0.992, 0.973);

  // 2. Encabezado principal institucional Verde Bosque (#114F3C)
  rect(36, 755, 523.28, 56, 0.067, 0.31, 0.235, 0.067, 0.31, 0.235);

  text("HUELLITAS FELICES", 50, 786, "/F2", 15, 1, 0.98, 0.92);
  text("SISTEMA VETERINARIO INTEGRAL - HISTORIA CLINICA", 50, 771, "/F1", 8, 0.85, 0.93, 0.88);
  text("FICHA DE ATENCION MEDICA", 380, 786, "/F2", 10.5, 0.98, 0.66, 0); // Amarillo acento
  text(`Turno #${datos.turnoId} · ${datos.estado.toUpperCase()}`, 380, 771, "/F2", 9, 1, 1, 1);

  // Subbarra de metadatos clínicos
  rect(36, 730, 523.28, 20, 0.96, 0.94, 0.88, 0.87, 0.85, 0.78);
  text(`Fecha: ${datos.fecha}  ${datos.hora}`, 50, 736, "/F2", 8.5, 0.067, 0.31, 0.235);
  text(`Profesional: ${datos.profesionalNombre}`, 210, 736, "/F2", 8.5, 0.067, 0.31, 0.235);
  text(`Practica: ${datos.practicaNombre}`, 405, 736, "/F2", 8.5, 0.067, 0.31, 0.235);

  let curY = 715;

  // 3. Card: Cliente y Paciente
  rect(36, curY - 50, 523.28, 50, 1, 1, 1, 0.87, 0.85, 0.78);
  text("TITULAR / CLIENTE:", 46, curY - 14, "/F2", 7.5, 0.45, 0.45, 0.45);
  text(datos.clienteNombre, 46, curY - 27, "/F2", 9.5, 0.067, 0.31, 0.235);
  text(`DNI: ${datos.clienteDni || "—"}  |  Tel: ${datos.clienteTelefono || "—"}`, 46, curY - 40, "/F1", 8, 0.3, 0.3, 0.3);

  line(280, curY - 45, 280, curY - 5, 0.9, 0.88, 0.82);

  text("PACIENTE / MASCOTA:", 295, curY - 14, "/F2", 7.5, 0.45, 0.45, 0.45);
  text(`${datos.mascotaNombre} (${datos.mascotaEspecie})`, 295, curY - 27, "/F2", 9.5, 0.067, 0.31, 0.235);
  text(
    `Raza: ${datos.mascotaRaza || "Mestizo"}  |  Sexo: ${datos.mascotaSexo || "—"}  |  Peso ref: ${datos.mascotaPesoAnterior ? `${datos.mascotaPesoAnterior} kg` : "—"}`,
    295,
    curY - 40,
    "/F1",
    8,
    0.3,
    0.3,
    0.3,
  );

  curY -= 65;

  // 4. Card: Signos Vitales y Examen Físico
  rect(36, curY - 58, 523.28, 58, 1, 1, 1, 0.87, 0.85, 0.78);
  rect(36, curY - 15, 523.28, 15, 0.98, 0.97, 0.93, 0.87, 0.85, 0.78);
  text("SIGNOS VITALES REGISTRADOS EN CONSULTA", 46, curY - 10, "/F2", 8, 0.067, 0.31, 0.235);

  // 4 mini bloques
  text("Temperatura:", 50, curY - 28, "/F1", 8, 0.45, 0.45, 0.45);
  text(datos.temperatura ? `${datos.temperatura} C` : "No registrada", 50, curY - 40, "/F2", 9.5, 0.067, 0.31, 0.235);

  text("Frec. Cardiaca:", 160, curY - 28, "/F1", 8, 0.45, 0.45, 0.45);
  text(datos.frecuenciaCardiaca ? `${datos.frecuenciaCardiaca} lpm` : "No registrada", 160, curY - 40, "/F2", 9.5, 0.067, 0.31, 0.235);

  text("Peso al momento:", 270, curY - 28, "/F1", 8, 0.45, 0.45, 0.45);
  text(datos.pesoMomento ? `${datos.pesoMomento} kg` : "No registrado", 270, curY - 40, "/F2", 9.5, 0.067, 0.31, 0.235);

  text("Estado Fisico General:", 380, curY - 28, "/F1", 8, 0.45, 0.45, 0.45);
  text(datos.estadoFisicoGeneral || "Normal / Sin observaciones", 380, curY - 40, "/F2", 8.5, 0.15, 0.15, 0.15);

  curY -= 74;

  // 5. Card: Anamnesis y Diagnóstico
  rect(36, curY - 80, 523.28, 80, 1, 1, 1, 0.87, 0.85, 0.78);
  rect(36, curY - 15, 523.28, 15, 0.98, 0.97, 0.93, 0.87, 0.85, 0.78);
  text("ANAMNESIS Y EVALUACION CLINICA", 46, curY - 10, "/F2", 8, 0.067, 0.31, 0.235);

  text("MOTIVO DE CONSULTA:", 46, curY - 28, "/F2", 8, 0.45, 0.45, 0.45);
  text(datos.motivoConsulta, 46, curY - 40, "/F1", 8.5, 0.1, 0.1, 0.1);

  line(46, curY - 46, 545, curY - 46, 0.9, 0.88, 0.82);

  text("DIAGNOSTICO MEDICO:", 46, curY - 58, "/F2", 8, 0.067, 0.31, 0.235);
  text(datos.diagnostico, 46, curY - 70, "/F2", 8.5, 0.067, 0.31, 0.235);

  curY -= 96;

  // 6. Card: Tratamiento y Prescripciones
  rect(36, curY - 60, 523.28, 60, 1, 1, 1, 0.87, 0.85, 0.78);
  rect(36, curY - 15, 523.28, 15, 0.98, 0.97, 0.93, 0.87, 0.85, 0.78);
  text("INDICACIONES TERAPEUTICAS Y TRATAMIENTO", 46, curY - 10, "/F2", 8, 0.067, 0.31, 0.235);

  text(datos.tratamiento || "Sin tratamiento farmacologico indicado en consulta.", 46, curY - 32, "/F1", 8.5, 0.15, 0.15, 0.15);

  curY -= 76;

  // 7. Card: Medicamentos e Insumos Aplicados en Consulta
  const alturaTabla = 22 + Math.max(1, datos.insumos.length) * 16;
  rect(36, curY - alturaTabla, 523.28, alturaTabla, 1, 1, 1, 0.87, 0.85, 0.78);
  rect(36, curY - 15, 523.28, 15, 0.98, 0.97, 0.93, 0.87, 0.85, 0.78);
  text("MEDICACION E INSUMOS CLINICOS APLICADOS EN ATENCION", 46, curY - 10, "/F2", 8, 0.067, 0.31, 0.235);

  text("CODIGO", 50, curY - 24, "/F2", 7.5, 0.45, 0.45, 0.45);
  text("ARTICULO / INSUMO", 120, curY - 24, "/F2", 7.5, 0.45, 0.45, 0.45);
  text("CANTIDAD", 440, curY - 24, "/F2", 7.5, 0.45, 0.45, 0.45);

  let insY = curY - 36;
  if (datos.insumos.length === 0) {
    text("No se indicaron medicamentos o insumos adicionales durante la consulta.", 50, insY, "/F1", 8, 0.45, 0.45, 0.45);
  } else {
    datos.insumos.forEach((ins) => {
      text(ins.codigo, 50, insY, "/F2", 8, 0.2, 0.2, 0.2);
      text(ins.nombre, 120, insY, "/F1", 8, 0.1, 0.1, 0.1);
      text(`${ins.cantidad} ${ins.unidad}`, 440, insY, "/F2", 8, 0.067, 0.31, 0.235);
      line(46, insY - 4, 545, insY - 4, 0.92, 0.92, 0.9);
      insY -= 16;
    });
  }

  curY -= alturaTabla + 14;

  // 8. Notas Aclaratorias (si existen)
  if (datos.notas && datos.notas.length > 0) {
    const alturaNotas = 20 + datos.notas.length * 20;
    rect(36, curY - alturaNotas, 523.28, alturaNotas, 1, 1, 1, 0.87, 0.85, 0.78);
    rect(36, curY - 14, 523.28, 14, 0.98, 0.97, 0.93, 0.87, 0.85, 0.78);
    text("NOTAS ACLARATORIAS POST-CIERRE", 46, curY - 10, "/F2", 8, 0.067, 0.31, 0.235);

    let nY = curY - 26;
    datos.notas.forEach((n) => {
      text(`${n.fechaHora} · ${n.profesional}: ${n.nota}`, 50, nY, "/F1", 8, 0.2, 0.2, 0.2);
      nY -= 18;
    });

    curY -= alturaNotas + 12;
  }

  // 9. Bloque de Firma y Sello Profesional
  const firmaBoxTop = Math.max(curY - 10, 115);
  rect(36, firmaBoxTop - 65, 523.28, 65, 0.99, 0.99, 0.98, 0.87, 0.85, 0.78);

  text("VALIDEZ MEDICO-LEGAL:", 46, firmaBoxTop - 18, "/F2", 7.5, 0.45, 0.45, 0.45);
  text("Documento oficial de atencion clinica registrado en el ERP Huellitas Felices.", 46, firmaBoxTop - 30, "/F1", 7.5, 0.3, 0.3, 0.3);
  text("Habilita la derivacion a mostrador para facturacion y cobro (HU-VTA-01).", 46, firmaBoxTop - 42, "/F1", 7.5, 0.3, 0.3, 0.3);

  line(360, firmaBoxTop - 45, 530, firmaBoxTop - 45, 0.6, 0.6, 0.6, 1);
  text(datos.profesionalNombre, 385, firmaBoxTop - 54, "/F2", 8.5, 0.067, 0.31, 0.235);
  text("Firma y Sello Profesional Veterinario", 375, firmaBoxTop - 62, "/F1", 7, 0.45, 0.45, 0.45);

  // 10. Pie de página
  text("Huellitas Felices · Historia Clinica Digital Veterinaria · Ley de Ejercicio Profesional", 50, 32, "/F1", 7.5, 0.45, 0.45, 0.45);
  text(`Impreso / Descargado el ${new Date().toLocaleDateString("es-AR")}`, 420, 32, "/F1", 7.5, 0.45, 0.45, 0.45);

  // Armar el documento PDF binario
  const contentStream = ops.join("\n");
  const contentLength = new TextEncoder().encode(contentStream).length;

  const body = [
    "%PDF-1.4",
    "%",
    "1 0 obj",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "endobj",
    "2 0 obj",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "endobj",
    "3 0 obj",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width.toFixed(2)} ${height.toFixed(2)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`,
    "endobj",
    "4 0 obj",
    `<< /Length ${contentLength} >>`,
    "stream",
    contentStream,
    "endstream",
    "endobj",
    "5 0 obj",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "endobj",
    "6 0 obj",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "endobj",
  ];

  let offset = 0;
  const xref: number[] = [0];
  const fullTextParts: string[] = [];

  for (let i = 0; i < body.length; i++) {
    const part = body[i];
    if (part.endsWith("obj")) {
      xref.push(offset);
    }
    fullTextParts.push(part + "\n");
    offset += new TextEncoder().encode(part + "\n").length;
  }

  const startxref = offset;
  const trailer = [
    `xref`,
    `0 ${xref.length}`,
    `0000000000 65535 f `,
    ...xref.slice(1).map((pos) => `${String(pos).padStart(10, "0")} 00000 n `),
    `trailer`,
    `<< /Size ${xref.length} /Root 1 0 R >>`,
    `startxref`,
    `${startxref}`,
    `%%EOF`,
  ].join("\n");

  fullTextParts.push(trailer);

  return new Blob(fullTextParts, { type: "application/pdf" });
}

export function descargarPdfConsulta(datos: DatosConsultaPdf, nombreArchivo?: string): void {
  const blob = construirPdfConsultaBlob(datos);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const nombreLimpio = normalizarTextoPdf(datos.mascotaNombre).replace(/\s+/g, "_");
  a.download =
    nombreArchivo || `Historia_Clinica_Turno_${datos.turnoId}_${nombreLimpio}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
