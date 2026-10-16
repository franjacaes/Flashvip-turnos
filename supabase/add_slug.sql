-- Migración: agregar slug a sessions
-- Ejecutar en Supabase SQL Editor

ALTER TABLE sessions ADD COLUMN slug TEXT UNIQUE;

-- Generar slugs para sesiones existentes
UPDATE sessions SET slug = lower(
  regexp_replace(
    regexp_replace(
      regexp_replace(name, '[áàäâ]', 'a', 'gi'),
      '[éèëê]', 'e', 'gi'
    ),
    '[^a-z0-9]+', '-', 'gi'
  )
);

-- Eliminar guiones al inicio/final
UPDATE sessions SET slug = trim(BOTH '-' FROM slug);

-- Hacer NOT NULL después de llenar los existentes
ALTER TABLE sessions ALTER COLUMN slug SET NOT NULL;
