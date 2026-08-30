import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export type FiltroEstado = "Todos" | "Activo" | "Inactivo";

interface FiltrosProveedoresProps {
  busqueda: string;
  onBusquedaChange: (q: string) => void;
  estado: FiltroEstado;
  onEstadoChange: (e: FiltroEstado) => void;
}

export function FiltrosProveedores({
  busqueda,
  onBusquedaChange,
  estado,
  onEstadoChange,
}: FiltrosProveedoresProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="relative flex-1">
        <span className="sr-only">Buscar por razón social o CUIT</span>
        <Search
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary z-10"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={busqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
          placeholder="Buscar por razón social o CUIT..."
          className="pl-10"
        />
      </div>

      <div className="w-full sm:w-48">
        <Select
          label="Estado:"
          value={estado}
          onChange={(e) => onEstadoChange(e.target.value as FiltroEstado)}
          aria-label="Filtrar por estado"
        >
          <option value="Todos">Todos</option>
          <option value="Activo">Activos</option>
          <option value="Inactivo">Inactivos</option>
        </Select>
      </div>
    </div>
  );
}
