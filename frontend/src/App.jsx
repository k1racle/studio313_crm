import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'

import Clients from './pages/Clients'
import Bookings from './pages/Bookings'
import Projects from './pages/Projects'
import Helpdesk from './pages/Helpdesk'
import Services from './pages/Services'
import Payments from './pages/Payments'
import Finance from './pages/Finance'
import Tags from './pages/Tags'
import Timesheets from './pages/Timesheets'
import Chat from './pages/Chat'
import Profile from './pages/Profile'
import PublicBooking from './pages/PublicBooking'
import PublicTicket from './pages/PublicTicket'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentFail from './pages/PaymentFail'
import ClientPortal from './pages/ClientPortal'
import KnowledgeBase from './pages/KnowledgeBase'
import MediaPlan from './pages/MediaPlan'
import Production from './pages/Production'
import Files from './pages/Files'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div>Загрузка...</div>
  return isAuthenticated ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/booking" element={<PublicBooking />} />
      <Route path="/support" element={<PublicTicket />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/fail" element={<PaymentFail />} />
      <Route path="/portal/:token" element={<ClientPortal />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="production" element={<Production />} />

        <Route path="clients" element={<Clients />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="services" element={<Services />} />
        <Route path="payments" element={<Payments />} />
        <Route path="finance" element={<Finance />} />
        <Route path="tags" element={<Tags />} />
        <Route path="timesheets" element={<Timesheets />} />
        <Route path="projects" element={<Projects />} />
        <Route path="helpdesk" element={<Helpdesk />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="media-plan" element={<MediaPlan />} />
        <Route path="files" element={<Files />} />
        <Route path="chat" element={<Chat />} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App
