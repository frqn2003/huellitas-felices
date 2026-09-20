/**
 * IP de origen del request (criterio de HU-SIS-04: "...e IP de origen").
 *
 * Node no expone el socket en el `Request` de las Route Handlers, así que la IP
 * solo puede venir de los headers que pone el proxy de adelante (Vercel, nginx,
 * el load balancer). No hay otra fuente.
 *
 * ⚠️ ESTOS HEADERS LOS PONE EL CLIENTE SI NO HAY PROXY. O sea: no son
 *    confiables para tomar decisiones de seguridad (no sirven para "bloquear
 *    esta IP"). Para la bitácora sí sirven, que es para lo que el criterio los
 *    pide: es un dato de contexto para investigar después, no un control.
 *
 * Devuelve null si no hay header, y eso es lo normal en `next dev`: no hay
 * proxy. La columna `auditoria_sesion.ip_origen` es nullable justo por esto.
 */
export function ipDelRequest(req: Request): string | null {
  // x-forwarded-for puede traer la cadena completa de proxies:
  //   "cliente, proxy1, proxy2"
  // El primero es el cliente original.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const primera = xff.split(",")[0]?.trim();
    if (primera) return normalizar(primera);
  }

  const alternativos = ["x-real-ip", "cf-connecting-ip", "x-vercel-forwarded-for"];
  for (const header of alternativos) {
    const valor = req.headers.get(header)?.trim();
    if (valor) return normalizar(valor);
  }

  return null;
}

/**
 * La columna es de tipo `inet`, que rechaza cualquier cosa que no sea una IP
 * válida — y un header inventado llegaría a la base y haría fallar el INSERT
 * con un 22P02. Un dato de contexto malformado no puede tumbar el login, así
 * que lo que no parece IP se descarta acá.
 *
 * Se saca el puerto de "1.2.3.4:5678" (algunos proxies lo agregan) y los
 * corchetes de "[::1]".
 */
function normalizar(valor: string): string | null {
  let ip = valor;

  if (ip.startsWith("[")) {
    const cierre = ip.indexOf("]");
    if (cierre > 0) ip = ip.slice(1, cierre);
  } else if ((ip.match(/:/g) ?? []).length === 1) {
    ip = ip.split(":")[0]!;
  }

  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;

  if (ipv4.test(ip)) {
    return ip.split(".").every((o) => Number(o) <= 255) ? ip : null;
  }
  return ipv6.test(ip) && ip.includes(":") ? ip : null;
}
