import { Routes, Route, Navigate } from 'react-router-dom'
import NicoResumen from './pages/NicoResumen'
import Asesores from './pages/Asesores'
import AsesorDetalle from './pages/AsesorDetalle'
import Login from './pages/Login'
import Registro from './pages/Registro'
import CompletarPerfil from './pages/CompletarPerfil'
import AprobarUsuarios from './pages/AprobarUsuarios'
import BottomNav from './components/BottomNav'
import { useAuth } from './lib/AuthContext'
import NicoLeads from './pages/NicoLeads'
import NicoLeadDetalle from './pages/NicoLeadDetalle'
import NicoClientes from './pages/NicoClientes'
import NicoClienteDetalle from './pages/NicoClienteDetalle'
import NicoAjustes from './pages/NicoAjustes'
import HojaDeRuta from './pages/HojaDeRuta'
import PerfilAsesor from './pages/PerfilAsesor'

function Placeholder({ nombre }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm pb-24">
      Módulo de {nombre} — próximamente
    </div>
  )
}

function Cargando() {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">
      Cargando...
    </div>
  )
}

function Pendiente() {
  const { signOut } = useAuth()
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl mb-3">⏳</p>
      <h1 className="text-lg font-bold text-slate-800 mb-1">Cuenta pendiente de aprobación</h1>
      <p className="text-sm text-slate-500 mb-5 max-w-xs">
        Nico todavía no ha aprobado tu cuenta. Cuando lo haga, podrás ingresar normalmente.
      </p>
      <button onClick={signOut} className="text-sm text-brand-600 font-medium">
        Cerrar sesión
      </button>
    </div>
  )
}

function AreaProtegida() {
  const { profile } = useAuth()
  const esDirector = profile?.rol === 'director' || profile?.role === 'director'
  // Modo Apoyo: solo aplica al director (ej. para dárselo temporalmente a la
  // secretaria). Mientras está activo, solo puede usar el módulo de Leads.
  const modoApoyo = esDirector && !!profile?.modo_apoyo_activo

  if (!profile?.active) return <Pendiente />
  if (!profile.perfil_completo) return <CompletarPerfil />

  return (
    <>
      <Routes>
        {esDirector ? (
          <>
            <Route path="/" element={modoApoyo ? <Navigate to="/leads" replace /> : <NicoResumen />} />
    <Route path="/asesores" element={modoApoyo ? <Navigate to="/leads" replace /> : <Asesores />} />
    <Route path="/asesores/:id" element={modoApoyo ? <Navigate to="/leads" replace /> : <AsesorDetalle />} />
    <Route path="/leads" element={<NicoLeads />} />
    <Route path="/leads/:id" element={<NicoLeadDetalle />} />
    <Route path="/clientes" element={modoApoyo ? <Navigate to="/leads" replace /> : <NicoClientes />} />
    <Route path="/clientes/:id" element={modoApoyo ? <Navigate to="/leads" replace /> : <NicoClienteDetalle />} />
    <Route path="/hoja-de-ruta" element={modoApoyo ? <Navigate to="/leads" replace /> : <HojaDeRuta />} />
    <Route path="/ajustes" element={modoApoyo ? <Navigate to="/leads" replace /> : <NicoAjustes />} />
    <Route path="/aprobar-usuarios" element={modoApoyo ? <Navigate to="/leads" replace /> : <AprobarUsuarios />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Navigate to="/hoja-de-ruta" replace />} />
            <Route path="/leads" element={<NicoLeads />} />
            <Route path="/leads/:id" element={<NicoLeadDetalle />} />
            <Route path="/clientes" element={<NicoClientes />} />
            <Route path="/clientes/:id" element={<NicoClienteDetalle />} />
            <Route path="/hoja-de-ruta" element={<HojaDeRuta />} />
            <Route path="/perfil" element={<PerfilAsesor />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav esDirector={esDirector} modoApoyo={modoApoyo} />
    </>
  )
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <Cargando />

  return (
    <Routes>
      <Route path="/login" element={!session ? <Login /> : <Navigate to="/" replace />} />
      <Route path="/registro" element={!session ? <Registro /> : <Navigate to="/" replace />} />
      <Route
        path="/*"
        element={session ? <AreaProtegida /> : <Navigate to="/login" replace />}
      />
    </Routes>
  )
}
