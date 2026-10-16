import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO, addMinutes, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Zap, LogOut, Plus, Trash2, ToggleLeft, ToggleRight, Clock, Calendar,
  Users, CheckCircle2, AlertCircle, Loader2, ChevronDown, RefreshCw, Copy, Check,
} from 'lucide-react'

const TABS = [
  { id: 'sessions', label: 'Sesiones' },
  { id: 'slots', label: 'Horarios' },
  { id: 'bookings', label: 'Reservas' },
]

export default function AdminPanel() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('sessions')
  const [sessions, setSessions] = useState([])
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (selectedSession) {
      loadSlots()
      loadBookings()
    }
  }, [selectedSession])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      navigate('/admin')
      return
    }
    loadSessions()
  }

  async function loadSessions() {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
    setSessions(data || [])
    if (data?.length && !selectedSession) {
      setSelectedSession(data[0].id)
    }
    setLoading(false)
  }

  async function loadSlots() {
    const { data } = await supabase
      .from('time_slots')
      .select('*')
      .eq('session_id', selectedSession)
      .order('slot_date')
      .order('start_time')
    setSlots(data || [])
  }

  async function loadBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*, time_slots(slot_date, start_time, end_time)')
      .eq('session_id', selectedSession)
      .order('created_at', { ascending: false })
    setBookings(data || [])
  }

  function refreshAll() {
    loadSlots()
    loadBookings()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    )
  }

  const currentSession = sessions.find(s => s.id === selectedSession)
  const stats = {
    total: slots.length,
    available: slots.filter(s => !s.is_booked).length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900">Admin Panel</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshAll}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </div>

        {/* Session selector + tabs */}
        <div className="max-w-5xl mx-auto px-4 pb-0">
          {sessions.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-400 uppercase tracking-wider shrink-0">Sesión:</span>
              <select
                value={selectedSession || ''}
                onChange={e => setSelectedSession(e.target.value)}
                className="text-sm font-medium text-gray-900 bg-transparent border-none outline-none cursor-pointer py-1"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_active ? '(Activa)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                  tab === t.id
                    ? 'bg-gray-100 text-brand-600 border-b-2 border-brand-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
                {t.id === 'bookings' && stats.pending > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                    {stats.pending}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Stats bar */}
      {selectedSession && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Horarios" value={stats.total} color="gray" />
            <StatCard label="Disponibles" value={stats.available} color="blue" />
            <StatCard label="Msj. Pendientes" value={stats.pending} color="amber" />
            <StatCard label="Confirmados" value={stats.confirmed} color="emerald" />
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'sessions' && (
          <SessionsTab
            sessions={sessions}
            selectedSession={selectedSession}
            onReload={loadSessions}
          />
        )}
        {tab === 'slots' && selectedSession && (
          <SlotsTab
            sessionId={selectedSession}
            slots={slots}
            onReload={loadSlots}
          />
        )}
        {tab === 'bookings' && selectedSession && (
          <BookingsTab
            bookings={bookings}
            slots={slots}
            onReload={refreshAll}
          />
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    gray: 'bg-white text-gray-900',
    blue: 'bg-sky-50 text-sky-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  }
  return (
    <div className={`rounded-xl p-4 border border-gray-100 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{label}</p>
    </div>
  )
}

/* =========================================
   SESSIONS TAB
   ========================================= */
function SessionsTab({ sessions, selectedSession, onReload }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState(null)

  function copyLink(id) {
    const url = `${window.location.origin}/s/${id}`
    const ta = document.createElement('textarea')
    ta.value = url
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    setCopiedLinkId(id)
    setTimeout(() => setCopiedLinkId(null), 2000)
  }

  async function createSession(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await supabase.from('sessions').insert({
      name: name.trim(),
      description: desc.trim() || null,
    })
    setName('')
    setDesc('')
    setCreating(false)
    setSaving(false)
    onReload()
  }

  async function toggleActive(id, currentState) {
    if (!currentState) {
      await supabase.from('sessions').update({ is_active: false }).neq('id', id)
    }
    await supabase.from('sessions').update({ is_active: !currentState }).eq('id', id)
    onReload()
  }

  async function deleteSession(id) {
    if (!confirm('¿Eliminar esta sesión y todos sus horarios/reservas?')) return
    await supabase.from('sessions').delete().eq('id', id)
    onReload()
  }

  return (
    <div className="space-y-4">
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Sesión
        </button>
      ) : (
        <form onSubmit={createSession} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3">
          <input
            type="text"
            placeholder="Nombre (ej: Fotos Preescolar - Octubre 2024)"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm"
            autoFocus
          />
          <input
            type="text"
            placeholder="Descripción (opcional)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="px-4 py-2 text-gray-500 rounded-lg text-sm hover:bg-gray-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {sessions.map(s => (
          <div
            key={s.id}
            className={`bg-white rounded-xl p-4 border flex items-center justify-between gap-4 ${
              s.is_active ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'
            }`}
          >
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{s.name}</p>
              {s.description && <p className="text-sm text-gray-500 truncate">{s.description}</p>}
              <p className="text-xs text-gray-400 mt-1 truncate">
                {window.location.origin}/s/{s.id}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyLink(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  copiedLinkId === s.id
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                }`}
              >
                {copiedLinkId === s.id ? (
                  <><Check className="w-3.5 h-3.5" /> Copiado!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copiar link</>
                )}
              </button>
              <button
                onClick={() => toggleActive(s.id, s.is_active)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  s.is_active
                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={s.is_active ? 'Desactivar' : 'Activar'}
              >
                {s.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {s.is_active ? 'Activa' : 'Inactiva'}
              </button>
              <button
                onClick={() => deleteSession(s.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* =========================================
   SLOTS TAB
   ========================================= */
function SlotsTab({ sessionId, slots, onReload }) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('12:00')
  const [interval, setInterval_] = useState(15)
  const [saving, setSaving] = useState(false)

  async function generateSlots(e) {
    e.preventDefault()
    if (!date) return
    setSaving(true)

    const slotsToInsert = []
    let current = parse(startTime, 'HH:mm', new Date())
    const end = parse(endTime, 'HH:mm', new Date())

    while (current < end) {
      const next = addMinutes(current, interval)
      slotsToInsert.push({
        session_id: sessionId,
        slot_date: date,
        start_time: format(current, 'HH:mm'),
        end_time: format(next > end ? end : next, 'HH:mm'),
      })
      current = next
    }

    if (slotsToInsert.length) {
      await supabase.from('time_slots').upsert(slotsToInsert, {
        onConflict: 'session_id,slot_date,start_time',
        ignoreDuplicates: true,
      })
    }

    setSaving(false)
    onReload()
  }

  async function deleteSlot(slotId) {
    await supabase.from('time_slots').delete().eq('id', slotId)
    onReload()
  }

  async function deleteDateSlots(slotDate) {
    if (!confirm(`¿Eliminar todos los horarios del ${slotDate}?`)) return
    await supabase
      .from('time_slots')
      .delete()
      .eq('session_id', sessionId)
      .eq('slot_date', slotDate)
      .eq('is_booked', false)
    onReload()
  }

  const grouped = {}
  for (const slot of slots) {
    if (!grouped[slot.slot_date]) grouped[slot.slot_date] = []
    grouped[slot.slot_date].push(slot)
  }

  return (
    <div className="space-y-6">
      {/* Generator */}
      <form onSubmit={generateSlots} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand-600" />
          Generar Horarios
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-brand-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Cada (min)</label>
            <select
              value={interval}
              onChange={e => setInterval_(+e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:border-brand-500 outline-none bg-white"
            >
              {[10, 15, 20, 30, 45, 60].map(m => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !date}
          className="mt-4 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Generando...' : 'Generar Horarios'}
        </button>
      </form>

      {/* Existing slots by date */}
      {Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([slotDate, dateSlots]) => (
          <div key={slotDate} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 capitalize flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-500" />
                {format(parseISO(slotDate), "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <button
                onClick={() => deleteDateSlots(slotDate)}
                className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Eliminar disponibles
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {dateSlots.map(slot => (
                <div
                  key={slot.id}
                  className={`group relative px-3 py-2 rounded-lg text-sm font-medium border ${
                    slot.is_booked
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <Clock className="w-3 h-3 inline mr-1 opacity-50" />
                  {slot.start_time.slice(0, 5)}
                  {slot.is_booked && (
                    <span className="ml-1 text-xs opacity-60">reservado</span>
                  )}
                  {!slot.is_booked && (
                    <button
                      onClick={() => deleteSlot(slot.id)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

      {Object.keys(grouped).length === 0 && (
        <p className="text-center text-gray-400 py-8">No hay horarios cargados. Usá el generador de arriba.</p>
      )}
    </div>
  )
}

/* =========================================
   BOOKINGS TAB
   ========================================= */
function BookingsTab({ bookings, slots, onReload }) {
  const [copiedId, setCopiedId] = useState(null)

  async function toggleStatus(bookingId, currentStatus) {
    const newStatus = currentStatus === 'pending' ? 'confirmed' : 'pending'
    await supabase
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
    onReload()
  }

  function buildMessage(b) {
    const slot = b.time_slots
    const fecha = slot
      ? format(parseISO(slot.slot_date), "EEEE d 'de' MMMM, yyyy", { locale: es })
      : ''
    const hora = slot ? `${slot.start_time.slice(0, 5)} a ${slot.end_time.slice(0, 5)}` : ''

    return [
      `Hola ${b.parent_name}, le confirmamos el turno de fotos para *${b.child_name}*`,
      '',
      `Fecha: ${fecha}`,
      `Horario: ${hora}`,
      '',
      'Por favor presentarse puntualmente.',
      '',
      'Flash VIP Kids',
    ].join('\n')
  }

  function copyMessage(b) {
    const msg = buildMessage(b)
    const ta = document.createElement('textarea')
    ta.value = msg
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    setCopiedId(b.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (bookings.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">No hay reservas todavía.</p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-400" />
          Mensaje pendiente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          Confirmado
        </span>
      </div>

      {bookings.map(b => {
        const isPending = b.status === 'pending'
        return (
          <div
            key={b.id}
            className={`bg-white rounded-xl p-4 border-l-4 border shadow-sm ${
              isPending
                ? 'border-l-amber-400 border-gray-100'
                : 'border-l-emerald-500 border-gray-100'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-gray-900">{b.child_name}</p>
                <p className="text-sm text-gray-500">
                  Padre/Madre: {b.parent_name}
                </p>
                {b.child_group && (
                  <p className="text-sm text-gray-500">Grupo: {b.child_group}</p>
                )}
                <p className="text-sm text-gray-500">
                  Tel: {b.phone_country_code} {b.phone_number}
                </p>
                {b.time_slots && (
                  <p className="text-sm text-brand-600 font-medium">
                    {format(parseISO(b.time_slots.slot_date), "d MMM yyyy", { locale: es })} — {b.time_slots.start_time.slice(0, 5)}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex flex-col gap-2">
                <button
                  onClick={() => toggleStatus(b.id, b.status)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isPending
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  }`}
                >
                  {isPending ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      Msj. pendiente
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirmado
                    </>
                  )}
                </button>
                {isPending && (
                  <button
                    onClick={() => copyMessage(b)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      copiedId === b.id
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-brand-50 text-brand-700 hover:bg-brand-100'
                    }`}
                  >
                    {copiedId === b.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copiar mensaje
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
