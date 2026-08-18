"use client";

import { ArrowLeftRight } from "lucide-react";
import { useState } from "react";
import { SUCURSALES, type Deposito, type FichaStock } from "@/data/stock";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export interface TransferenciaDatos {
  fichaOrigen: FichaStock;
  fichaDestino: FichaStock | null;
  depositoDestino: Deposito | null;
  articulo: FichaStock["articulo"];
  cantidad: number;
}

interface TransferenciaFormProps {
  depositos: Deposito[];
  fichas: FichaStock[];
  inicial: { depositoId: number; articuloId: number } | null;
  onConfirm: (datos: TransferenciaDatos) => void;
  onCancel: () => void;
}

type Campo = "origenSucursal" | "origenDeposito" | "destinoSucursal" | "destinoDeposito" | "articulo" | "cantidad";

type TransferErrors = Partial<Record<Campo, string>>;

export function TransferenciaForm({
  depositos,
  fichas,
  inicial,
  onConfirm,
  onCancel,
}: TransferenciaFormProps) {
  const depositoInicial = inicial
    ? depositos.find((d) => d.id === inicial.depositoId) ?? null
    : null;

  const [origenSucursal, setOrigenSucursal] = useState(
    depositoInicial ? String(depositoInicial.sucursalId) : "",
  );
  const [origenDeposito, setOrigenDeposito] = useState(
    inicial ? String(inicial.depositoId) : "",
  );
  const [destinoSucursal, setDestinoSucursal] = useState("");
  const [destinoDeposito, setDestinoDeposito] = useState("");
  const [articuloId, setArticuloId] = useState(inicial ? String(inicial.articuloId) : "");
  const [cantidad, setCantidad] = useState("");
  const [errors, setErrors] = useState<TransferErrors>({});
  const [touched, setTouched] = useState<Partial<Record<Campo, boolean>>>({});

  const valoresActuales = {
    origenSucursal,
    origenDeposito,
    destinoSucursal,
    destinoDeposito,
    articuloId,
    cantidad,
  };

  function validar(v: typeof valoresActuales): TransferErrors {
    const next: TransferErrors = {};
    const depOrigenV = depositos.find((d) => d.id === Number(v.origenDeposito)) ?? null;
    const depDestinoV = depositos.find((d) => d.id === Number(v.destinoDeposito)) ?? null;
    const fichaOrigenV =
      fichas.find(
        (f) => f.depositoId === Number(v.origenDeposito) && f.articuloId === Number(v.articuloId),
      ) ?? null;

    if (!v.origenSucursal) {
      next.origenSucursal = "Seleccioná una sucursal de origen.";
    }
    if (!v.origenDeposito) {
      next.origenDeposito = "Seleccioná un depósito de origen.";
    }
    if (!v.destinoSucursal) {
      next.destinoSucursal = "Seleccioná una sucursal de destino.";
    }
    if (!v.destinoDeposito) {
      next.destinoDeposito = "Seleccioná un depósito de destino.";
    } else if (depOrigenV && depDestinoV && depDestinoV.id === depOrigenV.id) {
      next.destinoDeposito = "El destino debe ser distinto al origen.";
    }
    if (!v.articuloId) {
      next.articulo = "Seleccioná un artículo.";
    } else if (depOrigenV && !fichaOrigenV) {
      next.articulo = "El artículo no tiene ficha en el depósito de origen.";
    }
    const cantidadNum = Number.parseFloat(v.cantidad);
    if (v.cantidad.trim() === "") {
      next.cantidad = "La cantidad es obligatoria.";
    } else if (Number.isNaN(cantidadNum) || cantidadNum <= 0) {
      next.cantidad = "Debe ser un número positivo.";
    } else if (fichaOrigenV && cantidadNum > fichaOrigenV.stockActual) {
      next.cantidad = `No puede superar el stock del origen (${fichaOrigenV.stockActual.toFixed(2)}).`;
    }
    return next;
  }

  const showError = (campo: Campo) => (touched[campo] ? errors[campo] : undefined);

  const marcarTocado = (campo: Campo) => {
    setTouched((t) => ({ ...t, [campo]: true }));
    setErrors(validar(valoresActuales));
  };

  const depOrigen = depositos.find((d) => d.id === Number(origenDeposito)) ?? null;
  const depDestino = depositos.find((d) => d.id === Number(destinoDeposito)) ?? null;

  const fichasOrigen = depOrigen
    ? fichas.filter((f) => f.depositoId === depOrigen.id && f.articulo.estado === "activo")
    : [];

  const fichaOrigen = fichas.find(
    (f) => f.depositoId === Number(origenDeposito) && f.articuloId === Number(articuloId),
  ) ?? null;
  const fichaDestino = fichas.find(
    (f) => f.depositoId === Number(destinoDeposito) && f.articuloId === Number(articuloId),
  ) ?? null;

  const destinoNuevo = depDestino && articuloId && !fichaDestino;

  const handleOrigenSucursal = (value: string) => {
    const primerDeposito = depositos.find((d) => d.sucursalId === Number(value));
    const next = {
      ...valoresActuales,
      origenSucursal: value,
      origenDeposito: primerDeposito ? String(primerDeposito.id) : "",
      articuloId: "",
    };
    setOrigenSucursal(next.origenSucursal);
    setOrigenDeposito(next.origenDeposito);
    setArticuloId("");
    if (touched.origenSucursal || touched.origenDeposito || touched.articulo) {
      setErrors(validar(next));
    }
  };

  const handleDestinoSucursal = (value: string) => {
    const primerDeposito = depositos.find((d) => d.sucursalId === Number(value));
    const next = {
      ...valoresActuales,
      destinoSucursal: value,
      destinoDeposito: primerDeposito ? String(primerDeposito.id) : "",
    };
    setDestinoSucursal(next.destinoSucursal);
    setDestinoDeposito(next.destinoDeposito);
    if (touched.destinoSucursal || touched.destinoDeposito) {
      setErrors(validar(next));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validar(valoresActuales);
    setErrors(nextErrors);
    setTouched({
      origenSucursal: true,
      origenDeposito: true,
      destinoSucursal: true,
      destinoDeposito: true,
      articulo: true,
      cantidad: true,
    });
    if (Object.keys(nextErrors).length > 0 || !fichaOrigen) return;

    // BACKEND: enviar POST /api/transferencias con { ficha_origen_id,
    // ficha_destino_id (o null para crear ficha en 0), articulo_id, cantidad,
    // empleado_id }. El back genera el par egreso/ingreso en movimiento_stock
    // (movimiento_vinculado_id) y registra ambos en la bitácora de auditoría.
    onConfirm({
      fichaOrigen,
      fichaDestino,
      depositoDestino: depDestino,
      articulo: fichaOrigen.articulo,
      cantidad: Number.parseFloat(cantidad),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5 rounded-md border border-border bg-surface p-5 shadow-card sm:p-6"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-900/10">
          <ArrowLeftRight className="h-5 w-5 text-brand-900" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <h3 className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
            Transferencia de stock
          </h3>
          <p className="text-xs text-text-secondary">
            Trasladá stock entre depósitos; el sistema registra el egreso y el ingreso en la bitácora.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-4 rounded-sm border border-border bg-cream-50 p-4">
          <legend className="px-1 text-xs font-extrabold uppercase tracking-wide text-brand-900">
            Origen
          </legend>
          {/* BACKEND: poblar sucursales desde GET /api/sucursales. */}
          <Select
            id="origenSucursal"
            label="Sucursal"
            requiredMark
            value={origenSucursal}
            onChange={(e) => handleOrigenSucursal(e.target.value)}
            onBlur={() => marcarTocado("origenSucursal")}
            error={showError("origenSucursal")}
          >
            <option value="">[ Seleccionar ]</option>
            {SUCURSALES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </Select>
          <Select
            id="origenDeposito"
            label="Depósito"
            requiredMark
            value={origenDeposito}
            onChange={(e) => {
              const next = { ...valoresActuales, origenDeposito: e.target.value, articuloId: "" };
              setOrigenDeposito(next.origenDeposito);
              setArticuloId("");
              if (touched.origenDeposito || touched.articulo) setErrors(validar(next));
            }}
            onBlur={() => marcarTocado("origenDeposito")}
            error={showError("origenDeposito")}
            disabled={!origenSucursal}
          >
            <option value="">[ Seleccionar ]</option>
            {depositos
              .filter((d) => d.sucursalId === Number(origenSucursal))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
          </Select>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-sm border border-border bg-cream-50 p-4">
          <legend className="px-1 text-xs font-extrabold uppercase tracking-wide text-brand-900">
            Destino
          </legend>
          <Select
            id="destinoSucursal"
            label="Sucursal"
            requiredMark
            value={destinoSucursal}
            onChange={(e) => handleDestinoSucursal(e.target.value)}
            onBlur={() => marcarTocado("destinoSucursal")}
            error={showError("destinoSucursal")}
          >
            <option value="">[ Seleccionar ]</option>
            {SUCURSALES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </Select>
          <Select
            id="destinoDeposito"
            label="Depósito"
            requiredMark
            value={destinoDeposito}
            onChange={(e) => {
              const next = { ...valoresActuales, destinoDeposito: e.target.value };
              setDestinoDeposito(next.destinoDeposito);
              if (touched.destinoDeposito) setErrors(validar(next));
            }}
            onBlur={() => marcarTocado("destinoDeposito")}
            error={showError("destinoDeposito")}
            disabled={!destinoSucursal}
          >
            <option value="">[ Seleccionar ]</option>
            {depositos
              .filter((d) => d.sucursalId === Number(destinoSucursal))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
          </Select>
        </fieldset>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          id="articuloTransferencia"
          label="Artículo"
          requiredMark
          value={articuloId}
          onChange={(e) => {
            const next = { ...valoresActuales, articuloId: e.target.value };
            setArticuloId(next.articuloId);
            if (touched.articulo || touched.cantidad) setErrors(validar(next));
          }}
          onBlur={() => marcarTocado("articulo")}
          error={showError("articulo")}
          disabled={!origenDeposito}
          hint="Solo artículos con ficha de stock en el depósito de origen."
        >
          <option value="">[ Seleccionar ]</option>
          {fichasOrigen.map((f) => (
            <option key={f.id} value={f.articuloId}>
              {f.articulo.codigo} — {f.articulo.nombre}
            </option>
          ))}
        </Select>
        <Input
          id="cantidad"
          label="Cantidad"
          requiredMark
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={cantidad}
          onChange={(e) => {
            const next = { ...valoresActuales, cantidad: e.target.value };
            setCantidad(next.cantidad);
            if (touched.cantidad) setErrors(validar(next));
          }}
          onBlur={() => marcarTocado("cantidad")}
          error={showError("cantidad")}
          hint="Decimal · no puede superar el stock del origen."
        />
      </div>

      {fichaOrigen && (
        <div
          role="status"
          className="flex flex-col gap-1 rounded-sm border border-border bg-cream-50 px-4 py-3 text-sm"
        >
          <p className="font-bold text-text-primary">
            Stock origen:{" "}
            <span className="font-extrabold">
              {fichaOrigen.stockActual.toFixed(2)} {fichaOrigen.articulo.unidadMedida}
            </span>
          </p>
          <p className="font-bold text-text-primary">
            Stock destino:{" "}
            <span className="font-extrabold">
              {fichaDestino
                ? `${fichaDestino.stockActual.toFixed(2)} ${fichaDestino.articulo.unidadMedida}`
                : "0.00"}
            </span>
          </p>
          {destinoNuevo && (
            <p className="text-xs font-semibold text-brand-900" role="note">
              No existe ficha para el artículo en el destino: se creará con stock 0 antes del ingreso.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">Confirmar transferencia</Button>
      </div>
    </form>
  );
}