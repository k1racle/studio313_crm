import { Navigate, Route, Routes } from 'react-router-dom'

import Layout from './components/Layout'
import { useAuth } from './contexts/AuthContext'
import { PageHeaderProvider } from './contexts/PageHeaderContext'
import Bookings from './pages/Bookings'
import Approvals from './pages/Approvals'
import Chat from './pages/Chat'
import ClientPortal from './pages/ClientPortal'
import Clients from './pages/Clients'
import Contacts from './pages/Contacts'
import Dashboard from './pages/Dashboard'
import Files from './pages/Files'
import Finance from './pages/Finance'
import Helpdesk from './pages/Helpdesk'
import Integrations from './pages/Integrations'
import KnowledgeBase from './pages/KnowledgeBase'
import Login from './pages/Login'
import MediaPlan from './pages/MediaPlan'
import PasswordVault from './pages/PasswordVault'
import PaymentFail from './pages/PaymentFail'
import PaymentCalendar from './pages/PaymentCalendar'
import Payments from './pages/Payments'
import PaymentSuccess from './pages/PaymentSuccess'
import Production from './pages/Production'
import Profile from './pages/Profile'
import Projects from './pages/Projects'
import RolesPermissions from './pages/RolesPermissions'
import PublicBooking from './pages/PublicBooking'
import PublicTicket from './pages/PublicTicket'
import Services from './pages/Services'
import Tags from './pages/Tags'
import Tasks from './pages/Tasks'
import Timesheets from './pages/Timesheets'

function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <div>Загрузка...</div>
  return isAuthenticated ? children : <Navigate to="/login" />
}

function CapabilityRoute({ capability, children }) {
  const { user, loading } = useAuth()
  if (loading || !user?.capabilities) return null
  return user.capabilities.includes(capability) ? children : <Navigate to="/" replace />
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
      <Route path="/" element={<PrivateRoute><PageHeaderProvider><Layout /></PageHeaderProvider></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="production" element={<Production />} />
        <Route path="clients" element={<Clients />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="services" element={<Services />} />
        <Route path="payments" element={<Payments />} />
        <Route path="payment-calendar" element={<PaymentCalendar />} />
        <Route path="finance" element={<Finance />} />
        <Route path="tags" element={<Tags />} />
        <Route path="timesheets" element={<Timesheets />} />
        <Route path="projects" element={<Projects />} />
        <Route path="helpdesk" element={<Helpdesk />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="knowledge" element={<KnowledgeBase />} />
        <Route path="media-plan" element={<MediaPlan />} />
        <Route path="files" element={<Files />} />
        <Route path="contacts" element={<Contacts />} />
        <Route path="password-vault" element={<PasswordVault />} />
        <Route path="chat" element={<Chat />} />
        <Route path="approvals" element={<CapabilityRoute capability="approvals.view"><Approvals /></CapabilityRoute>} />
        <Route path="roles" element={<CapabilityRoute capability="roles.manage"><RolesPermissions /></CapabilityRoute>} />
        <Route path="profile" element={<Profile />} />
      </Route>
    </Routes>
  )
}

export default App
