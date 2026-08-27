-- =========================================================
-- 13 · La sucursal vuelve a existir (decisión D3)
-- =========================================================
-- QUÉ PROBLEMA RESUELVE
--   `deposito.sucursal_id` es `int NOT NULL` y NO apunta a ninguna tabla: no
--   existe `sucursal`. Es una foreign key huérfana. Hoy hay que inventar un
--   número al insertar un depósito, y ese número no significa nada.
--
--   Peor: `stock.repo.ts` sostiene los dos modelos a la vez con un shim
--   (`to_jsonb` para no romper si la columna no está, y una consulta a
--   `information_schema` EN CADA ESCRITURA), y `stock.mapper.ts` resuelve el
--   nombre de la sucursal contra un array hardcodeado del FRONT.
--
-- LA DECISIÓN (D3)
--   Son VARIOS depósitos por sucursal. Esto revierte D-B ("depósito =
--   sucursal") y descarta la corrección 03, que iba en la dirección opuesta.
--
--   El front ya modelaba esto: 5 depósitos sobre 3 sucursales. No se reescribe
--   el front, se le da respaldo en la base.
--
-- SOBRE EL CRITERIO
--   HU-STK-02 dice "cada sucursal tiene su propio depósito" (singular). Varios
--   depósitos por sucursal es compatible con el espíritu del criterio —lo que
--   protege es que el stock sea INDEPENDIENTE entre sucursales— pero conviene
--   asentarlo en el acta del sprint.
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. La tabla
-- ---------------------------------------------------------
-- OJO: 'activo' en MINÚSCULA. El enum es ('activo','inactivo'); con 'Activo'
-- este CREATE TABLE falla.
CREATE TABLE sucursal (
  id        serial PRIMARY KEY,
  nombre    varchar(100) NOT NULL UNIQUE,
  direccion varchar(255),
  telefono  varchar(30),
  estado    estado_activo_inactivo NOT NULL DEFAULT 'activo'
);

COMMENT ON TABLE sucursal IS
  'Sucursales de la veterinaria. Una sucursal tiene N depositos, cada uno con '
  'su stock independiente (HU-STK-02).';

INSERT INTO sucursal (nombre, direccion) VALUES
  ('Centro', 'Av. Principal 123'),
  ('Norte',  'Calle Norte 456'),
  ('Sur',    'Av. Sur 789')
ON CONFLICT (nombre) DO NOTHING;


-- ---------------------------------------------------------
-- 2. Backfill de los depósitos existentes
-- ---------------------------------------------------------
-- Los depósitos que ya están tienen un `sucursal_id` inventado, sin FK que lo
-- respalde. Lo que no matchee una sucursal real cae en la primera.
-- Va ANTES de crear la FK: si no, el ALTER falla por las filas huérfanas.
UPDATE deposito d
SET sucursal_id = COALESCE(
  (SELECT s.id FROM sucursal s WHERE s.id = d.sucursal_id),
  (SELECT min(id) FROM sucursal)
);


-- ---------------------------------------------------------
-- 3. La FK, por fin
-- ---------------------------------------------------------
ALTER TABLE deposito
  ADD CONSTRAINT deposito_sucursal_id_fkey
  FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);


-- ---------------------------------------------------------
-- 4. Nombre de depósito único DENTRO de la sucursal
-- ---------------------------------------------------------
-- No global: "Depósito Central" puede existir en Centro y en Norte. Es lo que
-- ya dice el mensaje de error de stock.service.ts:31 ("...en la sucursal
-- elegida").
--
-- ⚠️ EL NOMBRE DEL CONSTRAINT NO ES COSMÉTICO. `src/lib/http/errors.ts:118`
--    traduce el error 23505 buscando `constraint.includes("deposito_nombre")`.
--    Con `uq_deposito_nombre_sucursal` la traducción sigue andando y el usuario
--    recibe un 409 DEPOSITO_DUPLICADO con mensaje. Si se lo renombra a
--    `uq_deposito_sucursal_nombre`, ese includes() deja de matchear y el
--    usuario recibe un 409 genérico.
ALTER TABLE deposito
  ADD CONSTRAINT uq_deposito_nombre_sucursal UNIQUE (sucursal_id, nombre);

CREATE INDEX idx_deposito_sucursal ON deposito (sucursal_id);


-- ---------------------------------------------------------
-- 5. Auditoría (necesita la corrección 01 aplicada)
-- ---------------------------------------------------------
-- `fn_auditoria()` es la función genérica del equipo: toma la tabla de
-- TG_TABLE_NAME y el usuario de `app.usuario_id`, así que no lleva argumentos.
CREATE TRIGGER trg_auditoria_sucursal
  AFTER INSERT OR UPDATE ON sucursal
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

COMMIT;
