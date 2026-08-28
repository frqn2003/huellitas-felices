"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageEnd: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  disabled?: boolean;
  itemLabel?: string;
}

const PAGE_SIZES = [10, 25, 50];

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled = false,
  itemLabel = "artículos",
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = pages.filter((p) => {
    if (totalPages <= 5) return true;
    return p === 1 || p === totalPages || Math.abs(p - page) <= 1;
  });
  const withGaps: (number | "…")[] = [];
  let last = 0;
  for (const p of visiblePages) {
    if (last && p - last > 1) withGaps.push("…");
    withGaps.push(p);
    last = p;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 px-2 py-3 sm:flex-row">
      <p className="text-sm font-medium text-text-secondary">
        Mostrando {pageStart}-{pageEnd} de {totalItems} {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
          Filas por página
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            disabled={disabled}
            className="h-11 cursor-pointer rounded-pill border border-border bg-surface px-3 text-sm font-semibold text-text-primary focus:border-brand-900 focus:outline-none focus:ring-2 focus:ring-brand-900/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label="Paginación" className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1 || disabled}
            aria-label="Página anterior"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill border border-border bg-surface text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          {withGaps.map((p, i) =>
            p === "…" ? (
              <span
                key={`gap-${i}`}
                className="px-1 text-sm font-semibold text-text-secondary"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={disabled}
                aria-current={p === page ? "page" : undefined}
                aria-label={`Página ${p}`}
                className={`flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-pill px-2 text-sm font-bold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-45 ${
                  p === page
                    ? "bg-brand-900 text-cream-50"
                    : "border border-border bg-surface text-brand-900 hover:bg-brand-900/5"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages || disabled}
            aria-label="Página siguiente"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill border border-border bg-surface text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </div>
    </div>
  );
}
