import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

// --- Paleta Refriartic (misma que el resto de la plataforma) ---
const C = {
  navy: '#14213D',
  orange: '#FCA311',
  bg: '#DBDBD4',
  card: '#FFFFFF',
  border: '#E5E5E5',
  textPrimary: '#14213D',
  textSecondary: '#5F5E5A',
  textMuted: '#B4B2A9',
}

function IconBase({ children, size = 16, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}
const IconPhone = (props) => (
  <IconBase {...props}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z" />
  </IconBase>
)

// Iniciales del asesor para el avatar circular — mismo cálculo usado en toda
// la plataforma. Ej: "Juan Pérez Gómez" -> "JP"
function iniciales(nombreCompleto) {
  if (!nombreCompleto) return '—'
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

export default function Asesores() {
  const [asesores, setAsesores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true)
      setError(null)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('rol', 'asesor')
        .order('full_name', { ascending: true })

      if (error) setError('No se pudo cargar el listado de asesores.')
      else setAsesores(data || [])
      setCargando(false)
    }
    cargar()
  }, [])

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg }}>
      <header className="px-5 pt-8 pb-6 rounded-b-3xl" style={{ backgroundColor: C.navy }}>
        <p className="text-sm font-medium" style={{ color: C.orange }}>Panel de Nico</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Asesores</h1>
      </header>

      <main className="px-4 -mt-2 space-y-3">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2">{error}</div>
        )}

        {cargando && <p className="text-center text-sm py-6" style={{ color: C.textMuted }}>Cargando...</p>}

        {!cargando && asesores.length === 0 && (
          <div className="rounded-2xl p-6 text-center text-sm" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}`, color: C.textMuted }}>
            Todavía no hay asesores registrados y aprobados.
          </div>
        )}

        {asesores.map((a) => (
          <Link
            key={a.id}
            to={`/asesores/${a.id}`}
            className="rounded-2xl p-4 flex items-center gap-3 transition active:scale-[0.99]"
            style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
          >
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
            >
              {iniciales(a.full_name)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold" style={{ color: C.textPrimary }}>{a.full_name || '(sin nombre)'}</p>
              <p className="text-sm" style={{ color: C.textSecondary }}>{a.email}</p>
              {a.celular_comercial && (
                <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: C.textMuted }}>
                  <IconPhone size={11} />
                  {a.celular_comercial}
                </p>
              )}
            </div>
          </Link>
        ))}
      </main>
    </div>
  )
}
