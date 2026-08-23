-- =========================================================
-- 0005 · FALTABA: bitácora de auditoría
-- =========================================================
-- POR QUÉ: "Registra en bitácora de auditoría cada alta, modificación y baja,
-- con usuario responsable, fecha, hora y valores anterior y nuevo" es criterio
-- de aceptación de LAS 5 HU del Sprint 1. Sin esta tabla ninguna se puede
-- marcar como terminada.
--
-- Se implementa por TRIGGER y no en la aplicación por dos razones:
--   1. HU-SIS-06 exige que "ningún usuario, incluido el administrador, pueda
--      editar o eliminar entradas" → se garantiza en el motor, no por confianza.
--   2. Un trigger no se puede olvidar en un endpoint nuevo.
--
-- El usuario responsable viaja por variable de sesión (app.usuario_id), que la
-- app fija con withAuditUser() al abrir cada transacción de escritura.
-- Ver src/lib/audit/audit.ts
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

COMMENT ON TABLE auditoria IS 'HU-SIS-06. Append-only: solo INSERT. Retención mínima 12 meses.';
COMMENT ON COLUMN auditoria.accion IS 'alta | modificacion | baja | login';
COMMENT ON COLUMN auditoria.usuario_id IS 'NULL solo si el trigger no encontró app.usuario_id (indica un bug: la app no llamó a withAuditUser).';

CREATE INDEX idx_auditoria_entidad     ON auditoria (entidad, entidad_id);
CREATE INDEX idx_auditoria_usuario     ON auditoria (usuario_id);
CREATE INDEX idx_auditoria_fecha       ON auditoria (fecha_hora DESC);


-- ---------------------------------------------------------
-- Trigger genérico: sirve para cualquier tabla auditada
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_auditar() RETURNS trigger AS $$
DECLARE
  v_usuario_id int;
  v_accion     varchar(20);
  v_modulo     varchar(40) := TG_ARGV[0];
  v_anterior   jsonb;
  v_nuevo      jsonb;
  v_entidad_id int;
BEGIN
  -- current_setting con missing_ok=true: si la app no fijó el usuario,
  -- se audita con NULL en vez de romper la operación.
  v_usuario_id := NULLIF(current_setting('app.usuario_id', true), '')::int;

  IF TG_OP = 'INSERT' THEN
    v_accion := 'alta';
    v_nuevo := to_jsonb(NEW);
    v_entidad_id := NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Una baja lógica es un UPDATE de estado, pero se audita como baja.
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

  RETURN NULL; -- AFTER trigger
END;
$$ LANGUAGE plpgsql;


-- ---------------------------------------------------------
-- Tablas auditadas (una por HU del sprint)
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

CREATE TRIGGER tg_auditar_orden_compra
  AFTER INSERT OR UPDATE OR DELETE ON orden_compra
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('compras');

CREATE TRIGGER tg_auditar_usuario
  AFTER INSERT OR UPDATE OR DELETE ON usuario
  FOR EACH ROW EXECUTE FUNCTION fn_auditar('usuarios');

-- movimiento_stock se audita en 0008, después de partirlo en cabecera/detalle.


-- ---------------------------------------------------------
-- Append-only de verdad
-- ---------------------------------------------------------
-- Ejecutar con el rol de la aplicación cuando exista.
-- Con el owner de la base no aplica (el owner siempre puede todo), así que
-- el rol de app es parte del setup de producción.
--
--   REVOKE UPDATE, DELETE, TRUNCATE ON auditoria FROM app_huellitas;
--   GRANT  INSERT, SELECT                ON auditoria TO   app_huellitas;
