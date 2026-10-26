import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { format, parseISO, addMinutes, parse } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  LogOut, Plus, Trash2, ToggleLeft, ToggleRight, Clock, Calendar,
  Users, CheckCircle2, AlertCircle, Loader2, ChevronDown, RefreshCw, Copy, Check,
  ChevronLeft, Camera, Download,
} from 'lucide-react'

const DETAIL_TABS = [
  { id: 'slots', label: 'Horarios' },
  { id: 'bookings', label: 'Reservas' },
]

export default function AdminPanel() {
  const navigate = useNavigate()
  const [sessions, setSessions] = useState([])
  const [sessionSummaries, setSessionSummaries] = useState({})
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState(null)
  const [tab, setTab] = useState('slots')

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
    setLoading(false)
    loadSessionSummaries()
  }

  async function loadSessionSummaries() {
    const [{ data: allSlots }, { data: allBookings }] = await Promise.all([
      supabase.from('time_slots').select('session_id, slot_date, start_time, end_time, is_booked').order('slot_date').order('start_time'),
      supabase.from('bookings').select('session_id, status'),
    ])
    const sums = {}
    for (const slot of (allSlots || [])) {
      if (!sums[slot.session_id]) sums[slot.session_id] = { dates: {}, total: 0, booked: 0, available: 0, pending: 0, confirmed: 0 }
      const s = sums[slot.session_id]
      if (!s.dates[slot.slot_date]) s.dates[slot.slot_date] = { first: slot.start_time, last: slot.end_time }
      const d = s.dates[slot.slot_date]
      if (slot.start_time < d.first) d.first = slot.start_time
      if (slot.end_time > d.last) d.last = slot.end_time
      s.total++
      if (slot.is_booked) s.booked++
      else s.available++
    }
    for (const b of (allBookings || [])) {
      if (!sums[b.session_id]) continue
      if (b.status === 'pending') sums[b.session_id].pending++
      else if (b.status === 'confirmed') sums[b.session_id].confirmed++
    }
    setSessionSummaries(sums)
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

  function openSession(id) {
    setSelectedSession(id)
    setTab('slots')
  }

  function goBack() {
    setSelectedSession(null)
    setSlots([])
    setBookings([])
    loadSessions()
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
  const stats = selectedSession ? {
    total: slots.length,
    available: slots.filter(s => !s.is_booked).length,
    confirmed: slots.filter(s => s.is_booked).length,
    pending: bookings.filter(b => b.status === 'pending').length,
  } : null

  if (!selectedSession) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <img src="/logo.jpg" alt="Flash VIP" className="h-9" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Salir
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-6">
          <Dashboard
            sessions={sessions}
            summaries={sessionSummaries}
            onOpenSession={openSession}
            onReload={loadSessions}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="font-bold text-gray-900">{currentSession?.name}</p>
              {currentSession?.description && (
                <p className="text-xs text-gray-500">{currentSession.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refreshAll}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 pb-0">
          <div className="flex gap-1">
            {DETAIL_TABS.map(t => (
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

      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total" value={stats.total} color="gray" />
          <StatCard label="Disponibles" value={stats.available} color="blue" />
          <StatCard label="Confirmados" value={stats.confirmed} color="emerald" />
          <StatCard label="Msj. Pendiente" value={stats.pending} color="amber" />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {tab === 'slots' && (
          <SlotsTab
            sessionId={selectedSession}
            slots={slots}
            bookings={bookings}
            onReload={loadSlots}
          />
        )}
        {tab === 'bookings' && (
          <BookingsTab
            bookings={bookings}
            slots={slots}
            sessionName={currentSession?.name}
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
   DASHBOARD
   ========================================= */
function Dashboard({ sessions, summaries, onOpenSession, onReload }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [copiedLinkId, setCopiedLinkId] = useState(null)

  function copyToClipboard(text, id) {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    setCopiedLinkId(id)
    setTimeout(() => setCopiedLinkId(null), 2000)
  }

  function toSlug(text) {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  async function createSession(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    let slug = toSlug(name.trim())
    const { data: existing } = await supabase
      .from('sessions')
      .select('slug')
      .like('slug', `${slug}%`)
    if (existing?.some(s => s.slug === slug)) {
      slug = `${slug}-${existing.length}`
    }
    await supabase.from('sessions').insert({
      name: name.trim(),
      slug,
      description: desc.trim() || null,
    })
    setName('')
    setDesc('')
    setCreating(false)
    setSaving(false)
    onReload()
  }

  async function toggleActive(e, id, current) {
    e.stopPropagation()
    await supabase.from('sessions').update({ is_active: !current }).eq('id', id)
    onReload()
  }

  async function deleteSession(e, id) {
    e.stopPropagation()
    if (!confirm('¿Eliminar esta sesión y todos sus horarios/reservas?')) return
    const { error } = await supabase.from('sessions').delete().eq('id', id)
    if (error) {
      alert(`Error al eliminar: ${error.message}`)
      return
    }
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
            placeholder="Nombre del grupo (ej: 9no B - ICI)"
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

      {sessions.length === 0 && (
        <p className="text-center text-gray-400 py-8">No hay sesiones creadas todavía.</p>
      )}

      <div className="space-y-3">
        {sessions.map(s => {
          const sum = summaries[s.id]
          const dates = sum ? Object.entries(sum.dates).sort(([a], [b]) => a.localeCompare(b)) : []
          return (
            <div
              key={s.id}
              onClick={() => onOpenSession(s.id)}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:border-brand-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.is_active ? 'bg-brand-50' : 'bg-gray-100'}`}>
                    <Camera className={`w-5 h-5 ${s.is_active ? 'text-brand-600' : 'text-gray-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`font-semibold truncate ${s.is_active ? 'text-gray-900' : 'text-gray-400'}`}>{s.name}</p>
                    {s.description && <p className="text-xs text-gray-500 truncate">{s.description}</p>}
                    {!s.is_active && <p className="text-xs text-gray-400">Inactivo</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      copyToClipboard(`${window.location.origin}/s/${s.slug || s.id}`, s.id)
                    }}
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
                    onClick={(e) => toggleActive(e, s.id, s.is_active)}
                    className={`p-2 rounded-lg transition-colors ${
                      s.is_active
                        ? 'text-emerald-600 hover:bg-emerald-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={s.is_active ? 'Desactivar link' : 'Activar link'}
                  >
                    {s.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={(e) => deleteSession(e, s.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {sum && sum.total > 0 ? (
                <div className="ml-13 pl-[52px]">
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mb-2">
                    {dates.map(([date, range]) => (
                      <span key={date} className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-brand-400" />
                        {format(parseISO(date), "d MMM", { locale: es })} · {range.first.slice(0, 5)}–{range.last.slice(0, 5)}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500">{sum.total} total</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-sky-600 font-medium">{sum.available} disponibles</span>
                    <span className="text-gray-400">·</span>
                    <span className="text-emerald-600">{sum.booked} confirmados</span>
                    {sum.pending > 0 && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="flex items-center gap-1 text-amber-600 font-semibold">
                          <AlertCircle className="w-3 h-3" />
                          {sum.pending} msj. pend.
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <p className="pl-[52px] text-xs text-gray-400">Sin horarios cargados</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* =========================================
   SLOTS TAB
   ========================================= */
function SlotsTab({ sessionId, slots, bookings, onReload }) {
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('12:00')
  const [interval, setInterval_] = useState(15)
  const [saving, setSaving] = useState(false)
  const [showAddDate, setShowAddDate] = useState(false)

  const bookingBySlot = {}
  for (const b of bookings) {
    if (b.time_slot_id) bookingBySlot[b.time_slot_id] = b
  }

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
    setShowAddDate(false)
    setDate('')
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

  const hasSlots = Object.keys(grouped).length > 0

  return (
    <div className="space-y-6">
      {/* Add date button or form */}
      {!showAddDate ? (
        <button
          onClick={() => setShowAddDate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Agregar Fecha
        </button>
      ) : (
        <form onSubmit={generateSlots} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-600" />
            Agregar Fecha
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
                autoFocus
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
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={saving || !date}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Generando...' : 'Generar Horarios'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddDate(false)}
              className="px-4 py-2.5 text-gray-500 rounded-xl text-sm hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

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
              {dateSlots.map(slot => {
                const booking = bookingBySlot[slot.id]
                return (
                  <div
                    key={slot.id}
                    className={`group relative px-3 py-2 rounded-lg text-sm font-medium border ${
                      slot.is_booked
                        ? 'bg-brand-50 border-brand-200 text-brand-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                    title={booking ? `${booking.child_name} — ${booking.parent_name}` : ''}
                  >
                    <Clock className="w-3 h-3 inline mr-1 opacity-50" />
                    {slot.start_time.slice(0, 5)}
                    {slot.is_booked && (
                      <span className="ml-1 text-xs opacity-60">reservado</span>
                    )}
                    {booking && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {booking.child_name}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                      </div>
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
                )
              })}
            </div>
          </div>
        ))}

      {!hasSlots && (
        <p className="text-center text-gray-400 py-8">No hay horarios cargados. Usá "Agregar Fecha" de arriba.</p>
      )}
    </div>
  )
}

/* =========================================
   BOOKINGS TAB
   ========================================= */
function BookingsTab({ bookings, slots, sessionName, onReload }) {
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
    const hora = slot ? slot.start_time.slice(0, 5) : ''

    return [
      `Hola ${b.parent_name}, le confirmamos el turno de fotos para *${b.child_name}*`,
      '',
      `Fecha: ${fecha}`,
      `Horario: ${hora}`,
      '',
      'Por favor presentarse puntualmente.',
      '',
      'Flash VIP',
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

  function exportExcel() {
    const sorted = [...bookings].sort((a, b) => {
      const da = a.time_slots?.slot_date || '', db = b.time_slots?.slot_date || ''
      if (da !== db) return da.localeCompare(db)
      const ta = a.time_slots?.start_time || '', tb = b.time_slots?.start_time || ''
      return ta.localeCompare(tb)
    })
    const rows = sorted.map(b => {
      const slot = b.time_slots
      const fecha = slot ? format(parseISO(slot.slot_date), 'dd/MM/yyyy') : ''
      const hora = slot ? slot.start_time.slice(0, 5) : ''
      const tel = `${b.phone_country_code} ${b.phone_number}`
      const estado = b.status === 'confirmed' ? 'Confirmado' : 'Pendiente'
      return `<tr><td>${b.parent_name}</td><td>${b.child_name}</td><td>${fecha}</td><td>${hora}</td><td>${tel}</td><td>${estado}</td></tr>`
    }).join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"></head><body>
<table border="1"><thead><tr style="background:#F7931E;color:white;font-weight:bold">
<th>Padre/Madre</th><th>Alumno/a</th><th>Fecha</th><th>Horario</th><th>Teléfono</th><th>Estado</th>
</tr></thead><tbody>${rows}</tbody></table></body></html>`
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${sessionName || 'reservas'}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (bookings.length === 0) {
    return (
      <p className="text-center text-gray-400 py-8">No hay reservas todavía.</p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Legend + Export */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            Mensaje pendiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            Confirmado
          </span>
        </div>
        <button
          onClick={exportExcel}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Descargar Excel
        </button>
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
                <p className="text-xs text-gray-400">
                  Reservado el {format(new Date(b.created_at), "d MMM yyyy, HH:mm", { locale: es })}
                </p>
                {b.status === 'confirmed' && b.updated_at && (
                  <p className="text-xs text-emerald-600">
                    Confirmado el {format(new Date(b.updated_at), "d MMM yyyy, HH:mm", { locale: es })}
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
