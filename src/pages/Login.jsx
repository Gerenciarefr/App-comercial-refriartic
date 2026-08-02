import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

const C = {
  navy: '#14213D',
  orange: '#FCA311',
  card: '#FFFFFF',
  border: '#E5E5E5',
  textPrimary: '#14213D',
  textSecondary: '#5F5E5A',
  textMuted: '#B4B2A9',
}

function IconSnowflake({ size = 22, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="4.9" y1="7" x2="19.1" y2="17" />
      <line x1="4.9" y1="17" x2="19.1" y2="7" />
    </svg>
  )
}

const inputCls = 'mt-1 w-full rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none'
const inputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary }

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    const { error } = await signIn(email.trim(), password)
    setCargando(false)
    if (error) {
      setError('Correo o contraseña incorrectos. Verifica e intenta de nuevo.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6" style={{ backgroundColor: C.navy }}>
      <div className="rounded-3xl p-6 max-w-sm w-full mx-auto" style={{ backgroundColor: C.card }}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: C.orange }}
        >
          <IconSnowflake size={24} style={{ color: '#412402' }} />
        </div>
        <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Refriartic</h1>
        <p className="text-sm mb-6" style={{ color: C.textMuted }}>Agenda comercial</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium" style={{ color: C.textSecondary }}>Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="tucorreo@refriartic.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: C.textSecondary }}>Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ backgroundColor: '#FCEBEB', color: '#A32D2D' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl font-medium py-3 mt-2 active:scale-[0.98] transition disabled:opacity-60"
            style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-xs mt-4 text-center" style={{ color: C.textMuted }}>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="font-medium" style={{ color: C.orange }}>
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
