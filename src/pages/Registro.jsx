import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const ROLES = [
  { value: 'asesor', label: 'Asesor comercial' },
  { value: 'servicio_tecnico', label: 'Servicio técnico' },
]

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

function IconCheck({ size = 22, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

const inputCls = 'mt-1 w-full rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none'
const inputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary }

export default function Registro() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('asesor')
  const [error, setError] = useState(null)
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })

    if (signUpError) {
      setCargando(false)
      setError(
        signUpError.message.includes('already registered')
          ? 'Ese correo ya tiene una cuenta.'
          : 'No se pudo crear la cuenta. Intenta de nuevo.'
      )
      return
    }

    // Guardamos nombre y rol elegido. La cuenta queda inactiva hasta que
    // Nico la apruebe manualmente.
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ full_name: nombre, role: rol, rol, active: false })
        .eq('id', data.user.id)
    }

    // Si Supabase dejó una sesión abierta automáticamente, la cerramos:
    // el usuario no debe poder entrar hasta ser aprobado.
    await supabase.auth.signOut()

    setCargando(false)
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6" style={{ backgroundColor: C.navy }}>
        <div className="rounded-3xl p-6 max-w-sm w-full mx-auto text-center" style={{ backgroundColor: C.card }}>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 mx-auto"
            style={{ backgroundColor: '#E1F5EE' }}
          >
            <IconCheck size={22} style={{ color: '#085041' }} />
          </div>
          <h1 className="text-lg font-bold mb-2" style={{ color: C.textPrimary }}>¡Listo, {nombre.split(' ')[0]}!</h1>
          <p className="text-sm mb-5" style={{ color: C.textMuted }}>
            Tu cuenta fue creada y está pendiente de aprobación de Nico. Te avisará
            cuando puedas ingresar.
          </p>
          <Link
            to="/login"
            className="block w-full rounded-xl font-medium py-2.5 active:scale-[0.98] transition"
            style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
          >
            Volver al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-10" style={{ backgroundColor: C.navy }}>
      <div className="rounded-3xl p-6 max-w-sm w-full mx-auto" style={{ backgroundColor: C.card }}>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: C.orange }}
        >
          <IconSnowflake size={24} style={{ color: '#412402' }} />
        </div>
        <h1 className="text-xl font-bold" style={{ color: C.textPrimary }}>Crear cuenta</h1>
        <p className="text-sm mb-6" style={{ color: C.textMuted }}>Refriartic — Agenda comercial</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium" style={{ color: C.textSecondary }}>Nombre completo</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <div>
            <label className="text-xs font-medium" style={{ color: C.textSecondary }}>¿Cuál es tu rol?</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {ROLES.map((r) => {
                const activo = rol === r.value
                return (
                  <button
                    type="button"
                    key={r.value}
                    onClick={() => setRol(r.value)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium transition"
                    style={
                      activo
                        ? { border: `1px solid ${C.orange}`, backgroundColor: '#FDF1DD', color: '#854F0B' }
                        : { border: `0.5px solid ${C.border}`, color: C.textSecondary }
                    }
                  >
                    {r.label}
                  </button>
                )
              })}
            </div>
          </div>

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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && <p className="text-sm" style={{ color: '#A32D2D' }}>{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl font-medium py-2.5 mt-2 active:scale-[0.98] transition disabled:opacity-60"
            style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
          >
            {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-xs mt-4 text-center" style={{ color: C.textMuted }}>
          ¿Ya tienes cuenta? <Link to="/login" className="font-medium" style={{ color: C.orange }}>Ingresa aquí</Link>
        </p>
      </div>
    </div>
  )
}
