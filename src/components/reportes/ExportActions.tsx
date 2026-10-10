"use client";

import { FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { FilaReporteVenta } from "@/modules/reportes/reportes.types";

interface ExportActionsProps {
  filas: FilaReporteVenta[];
  desde: string;
  hasta: string;
  disabled?: boolean;
}

export function ExportActions({ filas, desde, hasta, disabled = false }: ExportActionsProps) {
  const { showToast } = useToast();

  const handleExportCSV = () => {
    if (filas.length === 0) return;

    try {
      const headers = ["Comprobante", "Fecha", "Sucursal", "Cliente", "Articulos / Servicios", "Total"];
      const lines = filas.map((f) =>
        [
          `"${f.comprobante}"`,
          `"${f.fecha}"`,
          `"${f.sucursalNombre.replace(/"/g, '""')}"`,
          `"${f.clienteNombre.replace(/"/g, '""')}"`,
          `"${f.itemsResumen.replace(/"/g, '""')}"`,
          f.total.toFixed(2),
        ].join(";"),
      );

      const csvContent = [headers.join(";"), ...lines].join("\r\n");
      const blob = new Blob([`\uFEFF${csvContent}`], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reporte-ventas-${desde}-a-${hasta}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("success", "Notificación de exportación exitosa");
    } catch {
      showToast("error", "Ocurrió un error al generar el archivo CSV.");
    }
  };

  const handleExportPDF = () => {
    try {
      showToast("success", "Notificación de exportación exitosa");
      // Dar breve tiempo para que el toast renderice antes del diálogo de impresión nativo
      setTimeout(() => {
        window.print();
      }, 300);
    } catch {
      showToast("error", "Ocurrió un error al preparar el documento imprimible.");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <Button
        variant="outline"
        size="md"
        onClick={handleExportCSV}
        disabled={disabled || filas.length === 0}
        aria-label="Exportar datos a formato CSV"
      >
        <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
        Exportar a CSV
      </Button>

      <Button
        variant="outline"
        size="md"
        onClick={handleExportPDF}
        disabled={disabled || filas.length === 0}
        aria-label="Exportar datos a formato PDF"
      >
        <Printer className="h-4 w-4" aria-hidden="true" />
        Exportar a PDF
      </Button>
    </div>
  );
}
