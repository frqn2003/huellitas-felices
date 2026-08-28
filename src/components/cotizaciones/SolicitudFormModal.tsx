"use client";

import { FilePlus2, PackageMinus, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { NuevaSolicitudInput } from "@/context/CotizacionesContext";
import type { CatalogosCotizacion } from "@/data/cotizaciones";
import { parseImporte } from "@/data/ordenes-compra";

interface LineaDraft {
  key: string;
  articuloId: string;
  cantidad: string;
  nota: string;
}

interface LineaErrors {
  articuloId?: string;
  cantidad?: string;
}

interface SolicitudFormModalProps {
  open: boolean;
  /** Artículos activos y fichas de stock, desde la API. */
  catalogos: CatalogosCotizacion;
  onClose: () => void;
  onSave: (input: NuevaSolicitudInput) => void;
}

function validarLinea(linea: LineaDraft, lineas: LineaDraft[]): LineaErrors {
  const errores: LineaErrors = {};
  if (!linea.articuloId) {
    errores.articuloId = "Seleccioná un artículo.";
  } else if (
    lineas.some((l) => l.key !== linea.key && l.articuloId === linea.articuloId)
  ) {
    errores.articuloId = "Ese artículo ya está en la solicitud.";
  }
  const cantidad = parseImporte(linea.cantidad);
  if (linea.cantidad.trim() === "" || Number.isNaN(cantidad)) {
    errores.cantidad = "Ingresá una cantidad estimada.";
  } else if (cantidad <= 0) {
    errores.cantidad = "Debe ser mayor a 0.";
  }
  return errores;
}

export function SolicitudFormModal({
  open,
  catalogos,
  onClose,
  onSave,
}: SolicitudFormModalProps) {
  const [lineas, setLineas] = useState<LineaDraft[]>([
    { key: "n-1", articuloId: "", cantidad: "", nota: "" },
  ]);
  const [notas, setNotas] = useState("");
  const [errors, setErrors] = useState<Record<string, LineaErrors>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const contadorLineas = useRef(1);

  // Se conserva el PEOR estado cuando un artículo tiene fichas en más de un
  // depósito: si en uno está crítico, el artículo se marca como crítico.
  const estadoStockPorArticulo = useMemo(() => {
    const estados = new Map<number, "normal" | "bajo" | "critico">();
    catalogos.fichas.forEach((f) => {
      const estado = f.estadoCalculado as "normal" | "bajo" | "critico";
      const previo = estados.get(f.articuloId);
      if (
        !previo ||
        (estado === "critico" && previo !== "critico") ||
        (estado === "bajo" && previo === "normal")
      ) {
        estados.set(f.articuloId, estado);
      }
    });
    return estados;
  }, [catalogos.fichas]);

  const showError = (key: string, field: keyof LineaErrors) =>
    touched[key] ? errors[key]?.[field] : undefined;

  const touchLinea = (key: string) =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  const validarTodo = (
    lineasActuales: LineaDraft[],
  ): Record<string, LineaErrors> => {
    const next: Record<string, LineaErrors> = {};
    lineasActuales.forEach((l) => {
      next[l.key] = validarLinea(l, lineasActuales);
    });
    return next;
  };

  const actualizarLinea = (
    key: string,
    patch: Partial<Omit<LineaDraft, "key">>,
  ) => {
    const next = lineas.map((l) => (l.key === key ? { ...l, ...patch } : l));
    setLineas(next);
    if (touched[key]) setErrors(validarTodo(next));
  };

  const agregarLinea = (preseleccion?: {
    articuloId: string;
    cantidad: string;
  }) => {
    contadorLineas.current += 1;
    const nueva: LineaDraft = {
      key: `n-${contadorLineas.current}`,
      articuloId: preseleccion?.articuloId ?? "",
      cantidad: preseleccion?.cantidad ?? "",
      nota: "",
    };
    const next = [...lineas, nueva];
    setLineas(next);
    setErrors(validarTodo(next));
    if (preseleccion) touchLinea(nueva.key);
  };

  const eliminarLinea = (key: string) => {
    // El botón se deshabilita con una sola fila: nunca llegan a cero.
    const next = lineas.filter((l) => l.key !== key);
    setLineas(next);
    setErrors(validarTodo(next));
  };

  const articuloOptions: ComboboxOption[] = catalogos.articulos.map((a) => {
      const estado = estadoStockPorArticulo.get(a.id) ?? "normal";
      const tone: ComboboxOption["tone"] =
        estado === "critico"
          ? "danger"
          : estado === "bajo"
            ? "warning"
            : "neutral";

      return {
        value: String(a.id),
        tone,
        // El texto permite encontrar rápidamente artículos escribiendo
        // "bajo stock", "crítico" o "mínimo" en el buscador.
        label: `${a.codigo} · ${a.nombre}`,
      };
    });

  // Chips de sugerencia: artículos activos cuyo stock está bajo o crítico.
  // `catalogos.articulos` ya viene filtrado por activos desde la API.
  const bajoStock = useMemo(() => {
    const sugeridos = catalogos.fichas
      .filter(
        (f) =>
          catalogos.articulos.some((a) => a.id === f.articuloId) &&
          (f.estadoCalculado === "bajo" || f.estadoCalculado === "critico"),
      )
      .map((f) => {
        const articulo = catalogos.articulos.find((a) => a.id === f.articuloId);
        return {
          articuloId: f.articuloId,
          nombre: articulo?.nombre ?? "Artículo",
          stock: f.stockActual,
          unidad: articulo?.unidadMedida ?? "unidad",
          critico: f.estadoCalculado === "critico",
        };
      });

    // Un artículo puede estar bajo en varios depósitos: se muestra una sola vez.
    return sugeridos.filter(
      (item, index, arr) =>
        arr.findIndex((otro) => otro.articuloId === item.articuloId) === index,
    );
  }, [catalogos]);

  const agregarDesdeChip = (articuloId: number) => {
    const articulo = catalogos.articulos.find((a) => a.id === articuloId);
    const cantidad = "1";
    const yaExiste = lineas.some((l) => l.articuloId === String(articuloId));

    if (yaExiste) return;

    agregarLinea({
      articuloId: String(articuloId),
      cantidad,
    });

    if (articulo && articulo.nombre) {
      setTouched((prev) => ({ ...prev, [String(articuloId)]: true }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validarTodo(lineas);
    setErrors(nextErrors);
    setTouched(Object.fromEntries(lineas.map((l) => [l.key, true])));
    const hayError = lineas.some(
      (l) => Object.values(nextErrors[l.key] ?? {}).length > 0,
    );
    if (hayError) return;
    onSave({
      lineas: lineas.map((l) => ({
        articuloId: l.articuloId,
        cantidad: l.cantidad,
        nota: l.nota,
      })),
      notas,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva solicitud de cotización"
      icon={<FilePlus2 className="h-5 w-5 text-brand-900" aria-hidden="true" />}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="solicitud-form">
            Guardar solicitud
          </Button>
        </>
      }
    >
      <form
        id="solicitud-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <fieldset className="flex flex-col gap-3 rounded-md border border-border bg-cream-50 p-4">
          <legend className="px-2 font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
            Artículos a cotizar
          </legend>

          <div className="flex flex-col gap-4">
            {lineas.map((linea) => (
              <div
                key={linea.key}
                className="flex flex-col gap-3 rounded-sm border border-border bg-surface p-3"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_140px_44px]">
                  <Combobox
                    id={`articulo-sol-${linea.key}`}
                    label="Artículo"
                    requiredMark
                    value={linea.articuloId}
                    options={articuloOptions}
                    onChange={(value) => {
                      const patch: Partial<Omit<LineaDraft, "key">> = {
                        articuloId: value,
                      };
                      // La cantidad la escribe el usuario: es una cantidad
                      // ESTIMADA a cotizar, no una reposición hasta el mínimo.
                      actualizarLinea(linea.key, patch);
                    }}
                    onBlur={() => touchLinea(linea.key)}
                    error={showError(linea.key, "articuloId")}
                    placeholder="Buscar artículo..."
                    noResultsText="Sin resultados"
                  />
                  <Input
                    id={`cantidad-sol-${linea.key}`}
                    label="Cantidad est."
                    requiredMark
                    inputMode="decimal"
                    value={linea.cantidad}
                    onChange={(e) =>
                      actualizarLinea(linea.key, { cantidad: e.target.value })
                    }
                    onBlur={() => touchLinea(linea.key)}
                    error={showError(linea.key, "cantidad")}
                  />
                  <div className="flex flex-col gap-1.5 sm:justify-self-end">
                    {/* Spacer con la altura de un label: mantiene el botón alineado
                    con los inputs aunque una celda muestre error. */}
                    <span aria-hidden="true" className="block h-5" />
                    <button
                      type="button"
                      onClick={() => eliminarLinea(linea.key)}
                      disabled={lineas.length === 1}
                      aria-label={`Quitar artículo de la fila ${lineas.indexOf(linea) + 1}`}
                      title="Quitar artículo"
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-text-secondary transition-colors duration-fast ease-out hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-text-secondary">
                    Anotación para el proveedor (opcional)
                  </span>
                  <input
                    type="text"
                    value={linea.nota}
                    onChange={(e) =>
                      actualizarLinea(linea.key, { nota: e.target.value })
                    }
                    placeholder="Ej.: presentación en cajas de 20 unidades..."
                    aria-label={`Anotación para el artículo de la fila ${lineas.indexOf(linea) + 1}`}
                    className="rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
                  />
                </label>
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="md"
            type="button"
            onClick={() => agregarLinea()}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Agregar artículo
          </Button>
        </fieldset>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-bold text-text-primary">Notas</span>
          <textarea
            id="notas-solicitud"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Contexto para los proveedores..."
            className="rounded-sm border border-border bg-surface px-4 py-2.5 text-base text-text-primary transition-colors duration-fast ease-out placeholder:text-text-secondary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20"
          />
        </label>
        <div
          className="flex flex-col gap-1 rounded-sm border border-border/60 bg-cream-50 px-4 py-3"
          role="note"
        >
          <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
            Número de solicitud
          </p>
          <p className="font-mono text-base font-bold text-brand-900">
            Se asigna automáticamente
          </p>
          <p className="text-xs font-medium text-text-secondary">
            {/* BACKEND: el número lo genera el back (secuencia SC-XXXX) al confirmar. */}
            Al confirmar se genera el número SC-XXXX; no se puede modificar.
          </p>
        </div>
        <div
          className="flex flex-col gap-2 rounded-sm border border-border/60 bg-cream-50 px-4 py-3"
          role="note"
        >
          <p className="text-xs font-extrabold uppercase tracking-wide text-text-secondary">
            Validaciones
          </p>
          <ul className="flex flex-col gap-1 text-sm font-medium text-text-secondary">
            <li>
              Cada artículo necesita una cantidad estimada mayor a 0; no se
              pueden repetir.
            </li>
            <li>
              La solicitud queda Abierta hasta que registres las cotizaciones
              recibidas.
            </li>
          </ul>
        </div>
      </form>
    </Modal>
  );
}
