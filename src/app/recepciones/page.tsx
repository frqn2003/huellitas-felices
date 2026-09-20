"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RecepcionesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ordenes-compra?tab=recepciones");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream-50">
      <p className="text-sm text-text-secondary">Redirigiendo a Compras...</p>
    </div>
  );
}
