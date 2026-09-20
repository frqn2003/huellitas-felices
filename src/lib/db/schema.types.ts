// ─────────────────────────────────────────────────────────────────────────────
// GENERADO AUTOMÁTICAMENTE — NO EDITAR A MANO.
//
//   Regenerar:  npm run db:types
//   Generador:  scripts/db-types.mjs
//
// Describe el esquema REAL de la base, con los tipos que devuelve el driver
// `pg` (ojo: numeric y bigint llegan como string, no como number).
//
// Cómo se usa: los tipos `*Row` de cada módulo se derivan de acá en vez de
// escribirse a mano, así un cambio en la base rompe la compilación en vez de
// fallar en producción.
//
//   import type { Row } from "@/lib/db/schema.types";
//
//   export type ProveedorRow = Pick<
//     Row<"proveedor">,
//     "id" | "razon_social" | "cuit" | "estado"
//   >;
// ─────────────────────────────────────────────────────────────────────────────

// ── Enums ────────────────────────────────────────────────────────────────────

export type EstadoActivoInactivo = "activo" | "inactivo";

export type EstadoDocumento = "vigente" | "anulado" | "pagado";

export type ModoAbm = "INSERCION" | "EDICION" | "LECTURA";

export type TipoEventoSesion = "login" | "logout" | "login_fallido" | "bloqueado";

export type TipoMovimientoStock = "ingreso" | "egreso";

export type TipoObservacionRecepcion = "faltante" | "danado" | "error";

export type TipoOperacionAuditoria = "INSERT" | "UPDATE" | "DELETE";

export type TipoPago = "pago_proveedor";

export type TipoRecepcion = "parcial" | "total";


// ── Tablas ──────────────────────────────────────────────────────────────────

export interface DbTables {
  agenda: {
    id: number;  // auto (default)
    sucursal_id: number;
    nombre: string;  // auto (default)
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
  };
  agenda_profesional: {
    id: number;  // auto (identity)
    agenda_semanal_id: number;
    usuario_id: number;
    hora_inicio: string;
    hora_fin: string;
    estado: EstadoActivoInactivo;  // auto (default)
  };
  agenda_semanal: {
    id: number;  // auto (identity)
    agenda_id: number;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    estado: EstadoActivoInactivo;  // auto (default)
  };
  articulo: {
    id: number;  // auto (default)
    categoria_id: number;
    unidad_medida_id: number;
    codigo: string;
    nombre: string;
    descripcion: string | null;
    estado: EstadoActivoInactivo;  // auto (default)
    fabricante_id: number;
    imagen_url: string | null;
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
    contenido_neto: string;  // auto (default)
    presentacion_id: number;
  };
  auditoria: {
    id: string;  // auto (default)
    tabla: string;
    operacion: TipoOperacionAuditoria;
    registro_id: number;
    usuario_id: number | null;
    fecha_hora: Date;  // auto (default)
    valores_anteriores: unknown | null;
    valores_nuevos: unknown | null;
  };
  auditoria_sesion: {
    id: number;  // auto (identity)
    usuario_id: number | null;
    evento: TipoEventoSesion;
    fecha_hora: Date;  // auto (default)
    ip_origen: string | null;
    detalle: unknown | null;
  };
  caja: {
    id: number;  // auto (default)
    sucursal_id: number;
    nombre: string;  // auto (default)
    saldo_actual: string;  // auto (default)
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
  };
  categoria: {
    id: number;  // auto (default)
    nombre: string;
    prefijo: string;  // auto (default)
  };
  cliente: {
    id: number;  // auto (identity)
    nombre: string;
    apellido: string;
    documento: string;
    direccion: string | null;
    telefono: string;
    email: string;
    fecha_nacimiento: Date | null;
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
  };
  comprobante_proveedor: {
    id: number;  // auto (default)
    proveedor_id: number;
    tipo_comprobante_id: number;
    fecha_emision: Date;
    fecha_vencimiento: Date;
    orden_compra_id: number;
    comprobante_corregido_id: number | null;
    anula_comprobante_id: number | null;
    monto_total: string;
    estado: EstadoDocumento;  // auto (default)
    usuario_id: number;
    fecha_registro: Date;  // auto (default)
    letra: string;
    punto_venta: string;
    numero_comprobante: string;
  };
  comprobante_proveedor_detalle: {
    id: number;  // auto (default)
    comprobante_id: number;
    articulo_id: number;
    cantidad: string;
    precio_facturado: string;
    subtotal: string | null;
  };
  cotizacion: {
    id: number;  // auto (default)
    solicitud_id: number;
    proveedor_id: number;
    forma_pago_id: number;
    fecha_recepcion: Date;  // auto (default)
  };
  cotizacion_detalle: {
    id: number;  // auto (default)
    cotizacion_id: number;
    articulo_id: number;
    precio: string;
  };
  deposito: {
    id: number;  // auto (default)
    sucursal_id: number;
    nombre: string;
    ubicacion: string | null;
  };
  estado_orden_compra: {
    id: number;  // auto (default)
    nombre: string;
    es_final: boolean;  // auto (default)
  };
  estado_turno: {
    id: number;  // auto (identity)
    nombre: string;
    es_final: boolean;  // auto (default)
  };
  fabricante: {
    id: number;  // auto (default)
    nombre: string;
    pais: string | null;
    estado: EstadoActivoInactivo;  // auto (default)
  };
  ficha_stock: {
    id: number;  // auto (default)
    articulo_id: number;
    deposito_id: number;
    stock_actual: string;  // auto (default)
    stock_minimo: string;  // auto (default)
    stock_critico: string | null;
  };
  forma_pago: {
    id: number;  // auto (default)
    nombre: string;
  };
  lote_vencimiento: {
    id: number;  // auto (default)
    ficha_stock_id: number;
    numero_lote: string;
    fecha_vencimiento: Date | null;
    cantidad: string;  // auto (default)
    created_at: Date;  // auto (default)
  };
  mascota: {
    id: number;  // auto (identity)
    cliente_id: number;
    nombre: string;
    especie: string;
    raza: string | null;
    sexo: string;
    peso: string | null;
    fecha_nacimiento: Date | null;
    senas_particulares: string | null;
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
  };
  movimiento_stock_cab: {
    id: number;  // auto (default)
    numero: string;
    deposito_id: number;
    tipo: TipoMovimientoStock;
    origen_id: number;
    origen_entidad_id: number | null;
    fecha_hora: Date;  // auto (default)
    usuario_id: number;
    motivo: string | null;
    movimiento_vinculado_id: number | null;
  };
  movimiento_stock_det: {
    id: number;  // auto (default)
    movimiento_id: number;
    ficha_stock_id: number;
    cantidad: string;
  };
  notificacion_compra: {
    id: number;  // auto (default)
    orden_compra_detalle_id: number;
    usuario_responsable_id: number;
    cantidad_solicitada: string;
    cantidad_recibida: string;
    diferencia: string | null;
    mensaje: string;
    fecha_hora: Date;  // auto (default)
    leida: boolean;  // auto (default)
  };
  orden_compra: {
    id: number;  // auto (default)
    proveedor_id: number;
    cod_ord: string;
    cotizacion_id: number | null;
    usuario_id: number;
    estado_id: number;  // auto (default)
    fecha: Date;  // auto (default)
    fecha_entrega: Date | null;
    notas: string | null;
    subtotal: string | null;
    descuento: string | null;
    gastos_envio: string | null;
    total: string;
    deposito_id: number | null;
    forma_pago_id: number;
  };
  orden_compra_detalle: {
    id: number;  // auto (default)
    orden_compra_id: number;
    articulo_id: number;
    cantidad: string;
    precio_acordado: string;
    subtotal: string;
  };
  origen_movimiento: {
    id: number;  // auto (default)
    nombre: string;
  };
  pago: {
    id: number;  // auto (default)
    tipo: TipoPago;
    proveedor_id: number;
    monto: string;
    fecha: Date;  // auto (default)
    forma_pago_id: number;
    numero_comprobante: string;
    anula_pago_id: number | null;
    estado: EstadoDocumento;  // auto (default)
    usuario_id: number;
    fecha_registro: Date;  // auto (default)
  };
  pago_imputacion: {
    id: number;  // auto (default)
    pago_id: number;
    comprobante_proveedor_id: number;
    monto_imputado: string;
  };
  practica: {
    id: number;  // auto (identity)
    nombre: string;
    duracion_estimada_minutos: number | null;
    estado: EstadoActivoInactivo;  // auto (default)
  };
  presentacion: {
    id: number;  // auto (default)
    nombre: string;
  };
  proveedor: {
    id: number;  // auto (default)
    razon_social: string;
    cuit: string;
    direccion: string | null;
    telefono: string | null;
    email: string | null;
    contacto: string | null;
    plazo_entrega_dias: number | null;
    estado: EstadoActivoInactivo;  // auto (default)
    calificacion: string | null;
  };
  proveedor_forma_pago: {
    proveedor_id: number;
    forma_pago_id: number;
  };
  rol: {
    id: number;  // auto (default)
    nombre: string;
  };
  solicitud_cotizacion: {
    id: number;  // auto (default)
    usuario_id: number;
    fecha: Date;  // auto (default)
    estado: string;  // auto (default)
    notas: string | null;
  };
  solicitud_detalle: {
    id: number;  // auto (default)
    solicitud_id: number;
    articulo_id: number;
    cantidad_estimada: string;
    nota: string | null;
  };
  sucursal: {
    id: number;  // auto (default)
    nombre: string;
    direccion: string;
    telefono: string | null;
    horario_atencion: string | null;
    razon_social: string;
    cuit: string;
    ingresos_brutos: string | null;
    estado: EstadoActivoInactivo;  // auto (default)
    created_at: Date;  // auto (default)
    updated_at: Date;  // auto (default)
    condicion_iva: string | null;
  };
  tipo_comprobante: {
    id: number;  // auto (default)
    nombre: string;
    afecta_saldo: number;  // auto (default)
    prefijo: string;  // auto (default)
  };
  turno: {
    id: number;  // auto (identity)
    cliente_id: number;
    mascota_id: number;
    sucursal_id: number;
    agenda_profesional_id: number;
    practica_id: number;
    estado_id: number;  // auto (default)
    fecha: Date;
    hora_inicio: string;
    hora_fin: string;
    notas: string | null;
    usuario_id: number;
    fecha_creacion: Date;  // auto (default)
  };
  unidad_medida: {
    id: number;  // auto (default)
    nombre: string;
  };
  usuario: {
    id: number;  // auto (default)
    rol_id: number;
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    estado: EstadoActivoInactivo;  // auto (default)
    fecha_creacion: Date;  // auto (default)
    intentos_fallidos: number;  // auto (default)
    bloqueado_hasta: Date | null;
    sucursal_id: number | null;
    auth_id: string | null;
  };
}

// ── Vistas ──────────────────────────────────────────────────────────────────

export interface DbViews {
  v_movimiento_stock: {
    id: number | null;
    numero: string | null;
    ficha_stock_id: number | null;
    deposito_id: number | null;
    origen_id: number | null;
    origen_entidad_id: number | null;
    tipo: TipoMovimientoStock | null;
    cantidad: string | null;
    fecha_hora: Date | null;
    usuario_id: number | null;
    motivo: string | null;
    movimiento_vinculado_id: number | null;
    movimiento_id: number | null;
  };
  vista_cuenta_corriente_proveedor: {
    comprobante_id: number | null;
    proveedor_id: number | null;
    letra: string | null;
    punto_venta: string | null;
    numero_comprobante: string | null;
    numero_completo: string | null;
    tipo_comprobante: string | null;
    fecha_emision: Date | null;
    fecha_vencimiento: Date | null;
    monto_signado: string | null;
    monto_pagado: string | null;
    saldo_pendiente: string | null;
    estado_vencimiento: string | null;
    dias_para_vencer: number | null;
  };
  vw_huecos_disponibles: {
    agenda_profesional_id: number | null;
    usuario_id: number | null;
    fecha: Date | null;
    hueco_inicio: string | null;
    hueco_fin: string | null;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** La fila de una tabla: `Row<"proveedor">`. */
export type Row<T extends keyof DbTables> = DbTables[T];

/** La fila de una vista: `ViewRow<"vista_cuenta_corriente_proveedor">`. */
export type ViewRow<T extends keyof DbViews> = DbViews[T];
