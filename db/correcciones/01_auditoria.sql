-- =========================================================
-- 0002 · FALTA: bitácora de auditoría
-- =========================================================
-- QUÉ PROBLEMA RESUELVE
--   "Registra en bitácora de auditoría cada alta, modificación y baja, con
--    usuario responsable, fecha, hora y valores anterior y nuevo" es criterio
--    de aceptación de LAS 5 HU del Sprint 1. La tabla no existe, así que hoy
--    ninguna HU puede darse por terminada.
--
-- POR QUÉ POR TRIGGER Y NO DESDE LA APLICACIÓN
--   1. HU-SIS-06 exige que "ningún usuario, incluido el administrador, pueda
--      editar o eliminar entradas". Eso se garantiza en el motor.
--   2. Un trigger no se puede olvidar al agregar un endpoint nuevo.
--   3. Esta base YA usa triggers para el stock y los códigos: es coherente.
--
-- QUÉ TIENE QUE HACER LA APLICACIÓN
--   Solo una cosa: decir QUIÉN está operando, con
--   `await withAuditUser(client, usuarioId)` como primera línea de cada
--   transacción que escriba (ver src/lib/audit/audit.ts).
-- =========================================================

CREATE TABLE auditoria (
  id             serial PRIMARY KEY,
  usuario_id     int REFERENCES usuario(id),
  accion         varchar(20) NOT NULL,
  modulo         varchar(40) NOT NULL,
  entidad        varchar(40) NOT NULL,
  entidad_id     int,
  valor_anterior jsonb,
  valor_nuevo    jsonb,
  fecha_hora     timestamp NOT NULL DEFAULT now()
);

COMMENT ON TABLE  auditoria IS 'HU-SIS-06. Append-only: solo INSERT. Retencion minima 12 meses.';
COMMENT ON COLUMN auditoria.accion IS 'alta | modificacion | baja | login';
COMMENT ON COLUMN auditoria.usuario_id IS 'NULL indica un BUG: la app no llamo a withAuditUser() antes de escribir.';

CREATE INDEX idx_auditoria_entidad ON auditoria (entidad, entidad_id);
CREATE INDEX idx_auditoria_usuario ON auditoria (usuario_id);
CREATE INDEX idx_auditoria_fecha   ON auditoria (fecha_hora DESC);


-- ---------------------------------------------------------
-- Trigger genérico, sirve para cualquier tabla
-- ---------------------------------------------------------
-- TG_TABLE_NAME lo da Postgres: es el nombre de la tabla que disparó.
-- TG_ARGV[0] es el argumento que le pasamos al enganchar el trigger (el módulo).
CREATE OR REPLACE FUNCTION fn_auditar() RETURNS trigger AS $$
DECLARE
  v_usuario_id int;
  v_accion     varchar(20);
  v_modulo     varchar(40) := TG_ARGV[0];
  v_anterior   jsonb;
  v_nuevo      jsonb;
  v_entidad_id int;
BEGIN
  -- El `true` de current_setting es missing_ok: si la app no fijó el usuario,
  -- audita con NULL en vez de hacer fallar la operación entera.
  v_usuario_id := NULLIF(current_setting('app.usuario_id', true), '')::int;

  IF TG_OP = 'INSERT' THEN
    v_accion := 'alta';
    v_nuevo := to_jsonb(NEW);
    v_entidad_id := NEW.id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Una baja lógica es técnicamente un UPDATE, pero se audita como baja.
    IF to_jsonb(OLD) ? 'estado'
       AND OLD.estado::text = 'activo'
       AND NEW.estado::text = 'inactivo' THEN
      v_accion := 'baja';
    ELSE
      v_accion := 'modificacion';
    END IF;
    v_anterior := to_jsonb(OLD);
    v_nuevo := to_jsonb(NEW);
    v_entidad_id := NEW.id;

  ELSE
    v_accion := 'baja';
    v_anterior := to_jsonb(OLD);
    v_entidad_id := OLD.id;
  END IF;

  INSERT INTO auditoria (usuario_id, accion, modulo, entidad, entidad_id, valor_anterior, valor_nuevo)
  VALUES (v_usuario_id, v_accion, v_modulo, TG_TABLE_NAME, v_entidad_id, v_anterior, v_nuevo);

  RETURN NULL;  -- AFTER trigger: el valor de retorno se ignora
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------
-- Tablas auditadas — una por HU del sprint
-- ---------------------------------------------------------
CREATE TRIGGER tg_auditar_proveedor
  AFTER INSERT OR UPDATE OR DELETE ON proveedor
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('proveedores');

CREATE TRIGGER tg_auditar_articulo
  AFTER INSERT OR UPDATE OR DELETE ON articulo
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('articulos');

CREATE TRIGGER tg_auditar_deposito
  AFTER INSERT OR UPDATE OR DELETE ON deposito
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('stock');

CREATE TRIGGER tg_auditar_ficha_stock
  AFTER INSERT OR UPDATE OR DELETE ON ficha_stock
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('stock');

CREATE TRIGGER tg_auditar_movimiento
  AFTER INSERT OR UPDATE OR DELETE ON movimiento_stock
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('movimientos');

CREATE TRIGGER tg_auditar_orden_compra
  AFTER INSERT OR UPDATE OR DELETE ON orden_compra
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('compras');

CREATE TRIGGER tg_auditar_usuario
  AFTER INSERT OR UPDATE OR DELETE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('usuarios');


-- ---------------------------------------------------------
-- Append-only de verdad
-- ---------------------------------------------------------
-- Con el rol `postgres` (el que usa la app hoy) no aplica: es dueño de la base
-- y siempre puede todo. Cuando exista un rol de aplicación restringido:
--
--   REVOKE UPDATE, DELETE, TRUNCATE ON auditoria FROM app_huellitas;
--   GRANT  INSERT, SELECT                ON auditoria TO   app_huellitas;
--
-- ⚠️ OJO CON SUPABASE: el event trigger `rls_auto_enable` habilita Row Level
--    Security en toda tabla nueva de `public`, así que `auditoria` nace con RLS
--    activo. Hoy no molesta porque `postgres` tiene BYPASSRLS. Pero un rol
--    restringido sin políticas vería la tabla VACÍA, sin ningún error.
