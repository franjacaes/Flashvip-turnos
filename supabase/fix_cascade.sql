-- Fix: agregar ON DELETE CASCADE a bookings
-- Sin esto, no se pueden eliminar sesiones que tengan reservas

ALTER TABLE bookings DROP CONSTRAINT bookings_time_slot_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_time_slot_id_fkey
  FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE;

ALTER TABLE bookings DROP CONSTRAINT bookings_session_id_fkey;
ALTER TABLE bookings ADD CONSTRAINT bookings_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
