import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Camera, Clock, User, Phone, Baby, Loader2, AlertCircle } from 'lucide-react'

export default function PublicBooking() {
  const navigate = useNavigate()
  const { sessionId: paramSessionId } = useParams()
  const [session, setSession] = useState(null)
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showNameModal, setShowNameModal] = useState(false)

  const [form, setForm] = useState({
    parentName: '',
    childName: '',
    phoneCountryCode: '+595',
    phoneNumber: '',
  })

  useEffect(() => {
    loadSession()
  }, [])

  async function loadSession() {
    setLoading(true)

    let activeSession = null
    if (paramSessionId) {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', paramSessionId)
        .limit(1)
      activeSession = data?.[0] || null
    } else {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('is_active', true)
        .limit(1)
      activeSession = data?.[0] || null
    }

    if (!activeSession) {
      setLoading(false)
      return
    }

    setSession(activeSession)

    const { data: slotsData } = await supabase
      .from('time_slots')
      .select('*')
      .eq('session_id', activeSession.id)
      .order('slot_date')
      .order('start_time')

    setSlots(slotsData || [])
    setLoading(false)
  }

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function slotsByDate() {
    const grouped = {}
    for (const slot of slots) {
      if (!grouped[slot.slot_date]) grouped[slot.slot_date] = []
      grouped[slot.slot_date].push(slot)
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
  }

  function formatDate(dateStr) {
    const date = parseISO(dateStr)
    return format(date, "EEEE d 'de' MMMM", { locale: es })
  }

  function formatTime(timeStr) {
    return timeStr.slice(0, 5)
  }

  function isFormValid() {
    return (
      form.parentName.trim() &&
      form.childName.trim() &&
      form.phoneNumber.trim().length >= 6 &&
      selectedSlot
    )
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!isFormValid() || submitting) return
    setShowNameModal(true)
  }

  async function confirmBooking() {
    setShowNameModal(false)
    setSubmitting(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc('book_slot', {
      p_slot_id: selectedSlot,
      p_session_id: session.id,
      p_parent_name: form.parentName.trim(),
      p_child_name: form.childName.trim(),
      p_child_group: null,
      p_phone_country_code: form.phoneCountryCode,
      p_phone_number: form.phoneNumber.trim(),
    })

    if (rpcError) {
      setError('Error al procesar la reserva. Intente nuevamente.')
      setSubmitting(false)
      return
    }

    if (!data.success) {
      setError(data.error)
      setSubmitting(false)
      // Reload slots to show updated availability
      const { data: freshSlots } = await supabase
        .from('time_slots')
        .select('*')
        .eq('session_id', session.id)
        .order('slot_date')
        .order('start_time')
      setSlots(freshSlots || [])
      setSelectedSlot(null)
      return
    }

    navigate(`/confirmacion/${data.booking_id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <img src="/logo.jpg" alt="Flash VIP" className="h-12 mx-auto mb-4" />
          <p className="text-gray-500">No hay sesiones de fotos disponibles en este momento. Volvé a intentar más tarde.</p>
        </div>
      </div>
    )
  }

  const grouped = slotsByDate()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-center">
          <img src="/logo.jpg" alt="Flash VIP" className="h-10" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Session info */}
        <div className="bg-brand-600 text-white rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Camera className="w-6 h-6 mt-0.5 shrink-0 opacity-80" />
            <div>
              <h2 className="text-lg font-semibold">{session.name}</h2>
              {session.description && (
                <p className="text-brand-100 text-sm mt-1">{session.description}</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Parent info */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Datos del padre/madre
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  required
                  value={form.parentName}
                  onChange={e => updateForm('parentName', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-gray-900"
                  placeholder="Ej: María González"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono de contacto
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.phoneCountryCode}
                    onChange={e => updateForm('phoneCountryCode', e.target.value)}
                    className="px-3 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-gray-900 bg-white shrink-0"
                  >
                    <option value="+595">🇵🇾 +595</option>
                    <option value="+55">🇧🇷 +55</option>
                  </select>
                  <input
                    type="tel"
                    required
                    value={form.phoneNumber}
                    onChange={e => updateForm('phoneNumber', e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-gray-900"
                    placeholder="981 234 567"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Child info */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Baby className="w-4 h-4" />
              Datos del hijo/a
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del hijo/a
                </label>
                <input
                  type="text"
                  required
                  value={form.childName}
                  onChange={e => updateForm('childName', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all text-gray-900"
                  placeholder="Ej: Sofía González"
                />
              </div>
            </div>
          </section>

          {/* Time slots */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Elegí tu horario
            </h3>

            {grouped.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                No hay horarios disponibles todavía.
              </p>
            ) : (
              <div className="space-y-5">
                {grouped.map(([date, dateSlots]) => (
                  <div key={date}>
                    <p className="text-sm font-semibold text-gray-700 mb-2 capitalize">
                      📅 {formatDate(date)}
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {dateSlots.map(slot => {
                        const isBooked = slot.is_booked
                        const isSelected = selectedSlot === slot.id
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={isBooked}
                            onClick={() => setSelectedSlot(isSelected ? null : slot.id)}
                            className={`
                              py-2.5 px-2 rounded-xl text-sm font-medium transition-all border-2
                              ${isBooked
                                ? 'bg-brand-100 border-brand-300 text-brand-600 cursor-not-allowed opacity-80'
                                : isSelected
                                  ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-600/25 scale-105'
                                  : 'bg-white border-gray-200 text-gray-700 hover:border-brand-400 hover:bg-brand-50 active:scale-95'
                              }
                            `}
                          >
                            {formatTime(slot.start_time)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 border-gray-200 bg-white" />
                Disponible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-brand-600" />
                Seleccionado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-brand-100 border-2 border-brand-300" />
                Ocupado
              </span>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!isFormValid() || submitting}
            className={`
              w-full py-4 rounded-2xl text-base font-semibold transition-all
              ${isFormValid() && !submitting
                ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98] shadow-lg shadow-brand-600/25'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Reservando...
              </span>
            ) : (
              'Confirmar Turno'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8 mb-4">
          Flash VIP
        </p>
      </main>

      {/* Modal verificar nombre */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-7 max-w-sm w-full shadow-2xl text-center">
            <div className="text-4xl mb-3">✍️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Verificá el nombre del alumno/a
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-3">
              Es muy importante que el nombre esté escrito <strong className="text-gray-700">correctamente</strong> ya que será utilizado en los materiales.
            </p>
            <div className="bg-brand-50 border border-brand-500 rounded-xl p-3 mb-4 text-left">
              <p className="text-brand-800 font-bold text-base mb-2">{form.childName}</p>
              <p className="text-xs text-brand-800 font-semibold mb-1">Chequeá que esté correcto:</p>
              <ul className="text-xs text-brand-800 space-y-0.5 ml-4 list-disc">
                <li>Nombre completo sin abreviar</li>
                <li>Tildes y acentos — ej: <strong>Sofía, Nicolás, María José</strong></li>
              </ul>
            </div>
            <button
              onClick={confirmBooking}
              className="w-full py-3 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/30 mb-2"
            >
              Sí, ya lo verifiqué
            </button>
            <button
              onClick={() => setShowNameModal(false)}
              className="w-full py-3 bg-white text-gray-500 border border-gray-200 rounded-xl font-medium text-sm hover:bg-gray-50 transition-colors"
            >
              Mejor lo corrijo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
