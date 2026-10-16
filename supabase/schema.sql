-- ============================================
-- Flash VIP — Turnos Fotográficos
-- Schema para Supabase
-- ============================================
-- Instrucciones:
-- 1. Crear proyecto en https://supabase.com
-- 2. Ir a SQL Editor
-- 3. Pegar y ejecutar este archivo completo

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLAS
-- ============================================

-- Sesiones fotográficas (creadas por admin)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Horarios disponibles
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, slot_date, start_time)
);

-- Reservas de padres
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) UNIQUE,
  session_id UUID NOT NULL REFERENCES sessions(id),
  parent_name TEXT NOT NULL,
  child_name TEXT NOT NULL,
  child_group TEXT,
  phone_country_code TEXT NOT NULL CHECK (phone_country_code IN ('+595', '+55')),
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_time_slots_session ON time_slots(session_id);
CREATE INDEX idx_time_slots_date ON time_slots(slot_date);
CREATE INDEX idx_bookings_session ON bookings(session_id);
CREATE INDEX idx_bookings_status ON bookings(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Sessions: público ve activas, admin ve todas
CREATE POLICY "anon_read_active_sessions" ON sessions
  FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "auth_all_sessions" ON sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Time slots: público ve slots de sesiones activas, admin ve todos
CREATE POLICY "anon_read_slots" ON time_slots
  FOR SELECT TO anon USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND is_active = true)
  );

CREATE POLICY "auth_all_slots" ON time_slots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Bookings: público puede leer (para confirmación), admin maneja todo
CREATE POLICY "anon_read_bookings" ON bookings
  FOR SELECT TO anon USING (true);

CREATE POLICY "auth_all_bookings" ON bookings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================
-- FUNCIÓN DE RESERVA (maneja concurrencia)
-- ============================================

CREATE OR REPLACE FUNCTION book_slot(
  p_slot_id UUID,
  p_session_id UUID,
  p_parent_name TEXT,
  p_child_name TEXT,
  p_child_group TEXT,
  p_phone_country_code TEXT,
  p_phone_number TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_is_active BOOLEAN;
BEGIN
  SELECT is_active INTO v_is_active FROM sessions WHERE id = p_session_id;
  IF v_is_active IS NULL OR NOT v_is_active THEN
    RETURN json_build_object('success', false, 'error', 'La sesión no está activa');
  END IF;

  UPDATE time_slots
  SET is_booked = true
  WHERE id = p_slot_id
    AND session_id = p_session_id
    AND is_booked = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Este horario ya fue reservado');
  END IF;

  INSERT INTO bookings (time_slot_id, session_id, parent_name, child_name, child_group, phone_country_code, phone_number)
  VALUES (p_slot_id, p_session_id, p_parent_name, p_child_name, p_child_group, p_phone_country_code, p_phone_number)
  RETURNING id INTO v_booking_id;

  RETURN json_build_object('success', true, 'booking_id', v_booking_id);
END;
$$;

-- Permitir que usuarios anónimos llamen a la función
GRANT EXECUTE ON FUNCTION book_slot TO anon;
GRANT EXECUTE ON FUNCTION book_slot TO authenticated;
