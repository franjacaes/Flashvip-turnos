import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle2, Calendar, Clock, User, Baby, Phone, Loader2 } from 'lucide-react'

export default function BookingConfirmation() {
  const { bookingId } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBooking()
  }, [bookingId])

  async function loadBooking() {
    const { data } = await supabase
      .from('bookings')
      .select(`
        *,
        time_slots (slot_date, start_time, end_time),
        sessions (name)
      `)
      .eq('id', bookingId)
      .single()

    setBooking(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Reserva no encontrada.</p>
          <Link to="/" className="text-brand-600 font-medium hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  const slot = booking.time_slots
  const dateFormatted = format(parseISO(slot.slot_date), "EEEE d 'de' MMMM, yyyy", { locale: es })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-center">
          <img src="/logo.jpg" alt="Flash VIP" className="h-10" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Success banner */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">¡Turno Reservado!</h2>
          <p className="text-gray-500">Tu horario quedó registrado exitosamente</p>
        </div>

        {/* Booking details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-brand-600 text-white px-5 py-3">
            <p className="font-semibold">{booking.sessions?.name}</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-brand-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Fecha</p>
                <p className="text-gray-900 font-medium capitalize">{dateFormatted}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-brand-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Horario</p>
                <p className="text-gray-900 font-medium">
                  {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                </p>
              </div>
            </div>
            <hr className="border-gray-100" />
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Padre/Madre</p>
                <p className="text-gray-900">{booking.parent_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Baby className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Hijo/a</p>
                <p className="text-gray-900">{booking.child_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Teléfono</p>
                <p className="text-gray-900">
                  {booking.phone_country_code} {booking.phone_number}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800">
            <strong>Importante:</strong> Presentate puntualmente en el horario reservado.
            Si necesitás cambiar tu turno, contactá a Flash VIP.
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          Flash VIP
        </p>
      </main>
    </div>
  )
}
