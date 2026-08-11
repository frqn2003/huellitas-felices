import { PawPrint } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-pill bg-brand-900">
          <PawPrint className="h-8 w-8 text-cream-50" aria-hidden="true" />
        </div>
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-tight text-brand-900 sm:text-5xl">
          Huellitas Felices
        </h1>
        <p className="max-w-md text-lg leading-relaxed text-text-secondary">
          Sistema de gestión veterinaria: consultas, turnos, fichas clínicas,
          vacunación, stock y facturación.
        </p>
        <a
          href="#"
          className="rounded-pill bg-accent-500 px-8 py-3 font-bold text-brand-900 transition-transform duration-fast ease-out hover:bg-accent-600 active:scale-95"
        >
          Empezar a diseñar
        </a>
      </div>
    </main>
  );
}
