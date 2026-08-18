"use client";

import {
  ArrowLeftRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PawPrint,
  Pin,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

interface SidebarSection {
  titulo: string;
  items: SidebarItem[];
}

const SECCIONES: SidebarSection[] = [
  {
    titulo: "Operaciones",
    items: [
      { label: "Inicio", href: "/", icon: LayoutDashboard },
      { label: "Artículos", href: "/articulos", icon: Package },
      { label: "Stock", href: "/stock", icon: Warehouse },
      { label: "Lista de Precios", href: "#lista-precios", icon: Tags },
      { label: "Órdenes de Compra", href: "#ordenes-compra", icon: ShoppingCart },
      { label: "Proveedores", href: "#proveedores", icon: Truck },
      { label: "Movimientos de Stock", href: "/movimientos-stock", icon: ArrowLeftRight },
    ],
  },
  {
    titulo: "Administración",
    items: [
      { label: "Configuración", href: "#configuracion", icon: Settings },
      { label: "Auditoría", href: "#auditoria", icon: ShieldCheck },
    ],
  },
];

// BACKEND: datos de sesión desde GET /api/auth/sesion (nombre, rol).
const USUARIO_ACTUAL = { nombre: "Ana Martínez", rol: "Administradora" };

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function useItemActivo(href: string) {
  const pathname = usePathname();
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function NavItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: SidebarItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const active = useItemActivo(item.href);
  const Icon = item.icon;
  const base =
    "group flex h-11 items-center gap-3 rounded-md text-sm font-bold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50";
  const estado = active
    ? "bg-cream-50/15 text-cream-50"
    : "text-cream-50/75 hover:bg-cream-50/10 hover:text-cream-50";
  const alineacion = collapsed ? "justify-center px-0" : "px-3";

  const contenido = (
    <>
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
    </>
  );

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`${base} cursor-pointer ${estado} ${alineacion}`}
    >
      {contenido}
    </Link>
  );
}

function NavBody({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <nav className="flex flex-1 flex-col gap-3 px-3 py-4" aria-label="Menú principal">
        {SECCIONES.map((seccion) => (
          <div key={seccion.titulo} className="flex flex-col gap-1">
            {!collapsed && (
              <p className="mb-0.5 px-3 text-[10px] font-extrabold uppercase tracking-widest text-cream-50/40">
                {seccion.titulo}
              </p>
            )}
            {seccion.items.map((item) => (
              <NavItem key={item.label} item={item} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-1 border-t border-cream-50/15 p-3">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-500 font-display text-sm font-extrabold text-brand-900"
            role="img"
            aria-label={`Avatar de ${USUARIO_ACTUAL.nombre}`}
          >
            {iniciales(USUARIO_ACTUAL.nombre)}
          </span>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-cream-50">{USUARIO_ACTUAL.nombre}</p>
                <p className="truncate text-xs text-cream-50/60">{USUARIO_ACTUAL.rol}</p>
              </div>
              {/* BACKEND: cerrar sesión con POST /api/auth/logout. */}
              <button
                type="button"
                disabled
                aria-label="Cerrar sesión (disponible con backend)"
                title="Disponible en la integración con backend"
                className="flex h-11 w-11 cursor-not-allowed items-center justify-center rounded-pill text-cream-50/40 transition-colors duration-fast ease-out"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [pinned, setPinned] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  // BACKEND: el estado fijado del menú es preferencia local de sesión
  // (sessionStorage); no se persiste en la base de datos.
  useEffect(() => {
    const stored = window.sessionStorage.getItem("huellitas.sidebar.pinned") === "1";
    const id = window.setTimeout(() => setPinned(stored), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem("huellitas.sidebar.pinned", pinned ? "1" : "0");
  }, [pinned]);

  const expanded = pinned || hovering;

  useEffect(() => {
    if (!mobileOpen) return;
    const prevOverflow = document.body.style.overflow;
    const hamburger = hamburgerRef.current;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        return;
      }
      if (e.key === "Tab" && drawerRef.current) {
        const focusables = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
      hamburger?.focus();
    };
  }, [mobileOpen]);

  return (
    <>
      <aside
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onPointerEnter={() => setHovering(true)}
        onPointerLeave={() => setHovering(false)}
        className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col bg-brand-900 transition-all duration-normal ease-out lg:flex ${expanded ? "w-[264px]" : "w-[72px]"}`}
      >
        <div
          className={`flex items-center gap-2 border-b border-cream-50/15 px-4 py-4 ${expanded ? "" : "justify-center"}`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-500">
            <PawPrint className="h-5 w-5 text-brand-900" aria-hidden="true" />
          </span>
          {expanded && (
            <>
              <span className="min-w-0 flex-1 font-display text-sm font-extrabold uppercase leading-tight tracking-tight text-cream-50">
                Huellitas
                <br />
                Felices
              </span>
              <button
                type="button"
                onClick={() => setPinned((p) => !p)}
                aria-pressed={pinned}
                aria-label={pinned ? "Desfijar menú abierto" : "Fijar menú abierto"}
                title={pinned ? "Desfijar menú" : "Fijar menú"}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-cream-50/75 transition-colors duration-fast ease-out hover:bg-cream-50/10 hover:text-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50"
              >
                <Pin
                  className={`h-4 w-4 transition-transform duration-fast ease-out ${pinned ? "rotate-45" : ""}`}
                  aria-hidden="true"
                />
              </button>
            </>
          )}
        </div>
        <NavBody collapsed={!expanded} />
      </aside>

      <div className="sticky top-0 z-30 flex w-full items-center justify-between border-b border-border bg-cream-50 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-900">
            <PawPrint className="h-5 w-5 text-cream-50" aria-hidden="true" />
          </span>
          <span className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
            Huellitas Felices
          </span>
        </div>
        <button
          ref={hamburgerRef}
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
          aria-controls="menu-movil"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 h-full w-full cursor-pointer bg-brand-900/45 focus-visible:outline-none"
          />
          <div
            ref={drawerRef}
            id="menu-movil"
            className="absolute left-0 top-0 flex h-full w-[264px] flex-col bg-brand-900 shadow-card"
          >
            <div className="flex items-center justify-between border-b border-cream-50/15 px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-500">
                  <PawPrint className="h-5 w-5 text-brand-900" aria-hidden="true" />
                </span>
                <span className="font-display text-sm font-extrabold uppercase leading-tight tracking-tight text-cream-50">
                  Huellitas
                  <br />
                  Felices
                </span>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-cream-50/80 transition-colors duration-fast ease-out hover:bg-cream-50/10 hover:text-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <NavBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}