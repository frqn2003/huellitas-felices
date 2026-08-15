"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Truck,
  ArrowLeftRight,
  Settings,
  ShieldCheck,
  PawPrint,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

interface SidebarItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  active?: boolean;
}

const NAV_ITEMS: SidebarItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Artículos", href: "/articulos", icon: Package, active: true },
  { label: "Lista de Precios", href: "#lista-precios", icon: Tags },
  { label: "Órdenes de Compra", href: "#ordenes-compra", icon: ShoppingCart },
  { label: "Proveedores", href: "#proveedores", icon: Truck },
  { label: "Movimientos de Stock", href: "#movimientos", icon: ArrowLeftRight },
  { label: "Configuración", href: "#configuracion", icon: Settings },
  { label: "Auditoría", href: "#auditoria", icon: ShieldCheck },
];

const SESSION_KEY = "huellitas-sidebar";
const SIDEBAR_EVENT = "huellitas-sidebar-change";

function subscribeToSession(callback: () => void) {
  window.addEventListener(SIDEBAR_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function readCollapsed() {
  return window.sessionStorage.getItem(SESSION_KEY) === "collapsed";
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const collapsed = useSyncExternalStore(subscribeToSession, readCollapsed, () => false);

  const toggleCollapse = () => {
    window.sessionStorage.setItem(SESSION_KEY, collapsed ? "open" : "collapsed");
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  };

  const navContent = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Menú principal">
      <button
        type="button"
        onClick={toggleCollapse}
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        className={`mb-2 flex h-11 cursor-pointer items-center justify-center rounded-md text-cream-50/90 transition-colors duration-fast ease-out hover:bg-cream-50/10 hover:text-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50 ${collapsed ? "w-11" : "w-11 self-end"}`}
      >
        {collapsed ? <Menu className="h-5 w-5" aria-hidden="true" /> : <X className="h-5 w-5" aria-hidden="true" />}
      </button>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            title={item.label}
            className={`group flex h-11 cursor-pointer items-center gap-3 rounded-md text-sm font-bold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50 ${
              item.active
                ? "bg-cream-50/15 text-cream-50"
                : "text-cream-50/75 hover:bg-cream-50/10 hover:text-cream-50"
            } ${collapsed ? "justify-center px-0" : "px-3"}`}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <aside
        className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col bg-brand-900 transition-all duration-normal ease-out lg:flex ${collapsed ? "w-[72px]" : "w-[264px]"}`}
      >
        <div
          className={`flex items-center gap-2 border-b border-cream-50/15 px-4 py-4 ${collapsed ? "justify-center" : ""}`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-500">
            <PawPrint className="h-5 w-5 text-brand-900" aria-hidden="true" />
          </span>
          {!collapsed && (
            <span className="font-display text-sm font-extrabold uppercase leading-tight tracking-tight text-cream-50">
              Huellitas
              <br />
              Felices
            </span>
          )}
        </div>
        {navContent}
      </aside>

      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-cream-50 px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-brand-900">
            <PawPrint className="h-5 w-5 text-cream-50" aria-hidden="true" />
          </span>
          <span className="font-display text-sm font-extrabold uppercase tracking-tight text-brand-900">
            Huellitas Felices
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-brand-900 transition-colors duration-fast ease-out hover:bg-brand-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-900"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <motion.div
        className={`fixed inset-0 z-30 lg:hidden ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}
        initial={false}
        animate={{ opacity: mobileOpen ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
      >
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
          className="absolute inset-0 h-full w-full cursor-pointer bg-brand-900/45 focus-visible:outline-none"
        />
        <motion.div
          className="absolute left-0 top-0 flex h-full w-[264px] flex-col bg-brand-900 shadow-card"
          initial={false}
          animate={{ x: mobileOpen ? 0 : -264 }}
          transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between border-b border-cream-50/15 px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-500">
                <PawPrint className="h-5 w-5 text-brand-900" aria-hidden="true" />
              </span>
              <span className="font-display text-sm font-extrabold uppercase leading-tight tracking-tight text-cream-50">
                Huellitas
                <br />
                Felices
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill text-cream-50/80 transition-colors duration-fast ease-out hover:bg-cream-50/10 hover:text-cream-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Menú móvil">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={item.active ? "page" : undefined}
                  className={`flex h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm font-bold transition-colors duration-fast ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cream-50 ${
                    item.active
                      ? "bg-cream-50/15 text-cream-50"
                      : "text-cream-50/75 hover:bg-cream-50/10 hover:text-cream-50"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </motion.div>
      </motion.div>
    </>
  );
}
