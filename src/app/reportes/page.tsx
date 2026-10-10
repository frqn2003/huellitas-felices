import { redirect } from "next/navigation";

export default function ReportesRedirect() {
  redirect("/dashboard?tab=reportes");
}
