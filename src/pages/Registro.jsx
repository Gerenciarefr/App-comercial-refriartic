import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

const ROLES = [
  { value: 'asesor', label: 'Asesor comercial' },
  { value: 'servicio_tecnico', label: 'Servicio técnico' },
]

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
      <div className="min-h-screen bg-brand-600 flex flex-col justify-center px-6">
        <div className="bg-white rounded-3xl p-6 shadow-lg max-w-sm w-full mx-auto text-center">
          <h1 className="text-lg font-bold text-slate-800 mb-2">¡Listo, {nombre.split(' ')[0]}!</h1>
          <p className="text-sm text-slate-500 mb-5">
            Tu cuenta fue creada y está pendiente de aprobación de Nico. Te avisará
            cuando puedas ingresar.
          </p>
          <Link
            to="/login"
            className="block w-full rounded-xl bg-brand-600 text-white font-medium py-2.5 active:scale-[0.98] transition"
          >
            Volver al login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-600 flex flex-col justify-center px-6">
      <div className="bg-white rounded-3xl p-6 shadow-lg max-w-sm w-full mx-auto">
        <h1 className="text-xl font-bold text-slate-800 mb-1">Crear cuenta</h1>
        <p className="text-sm text-slate-500 mb-6">Refriartic — Agenda comercial</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Nombre completo</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Ej. Juan Pérez"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">¿Cuál es tu rol?</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r.value}
                  onClick={() => setRol(r.value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                    rol === r.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="tucorreo@refriartic.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-brand-600 text-white font-medium py-2.5 mt-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            {cargando ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-xs text-slate-400 mt-4 text-center">
          ¿Ya tienes cuenta? <Link to="/login" className="text-brand-600 font-medium">Ingresa aquí</Link>
        </p>
      </div>
    </div>
  )
}
