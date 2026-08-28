import type { Metadata } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { CotizacionesProvider } from "@/context/CotizacionesContext";
import "./globals.css";

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Huellitas Felices",
  description:
    "Sistema de gestión veterinaria — consultas, turnos, fichas clínicas, vacunación, stock y facturación.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${baloo.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CotizacionesProvider>{children}</CotizacionesProvider>
      </body>
    </html>
  );
}
