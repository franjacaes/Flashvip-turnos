import { Routes, Route } from 'react-router-dom'
import PublicBooking from './pages/PublicBooking'
import BookingConfirmation from './pages/BookingConfirmation'
import AdminLogin from './pages/AdminLogin'
import AdminPanel from './pages/AdminPanel'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicBooking />} />
      <Route path="/s/:sessionId" element={<PublicBooking />} />
      <Route path="/confirmacion/:bookingId" element={<BookingConfirmation />} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/panel" element={<AdminPanel />} />
    </Routes>
  )
}
