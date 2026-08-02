import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

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
    <div className="min-h-screen bg-brand-600 flex flex-col justify-center px-6">
      <div className="bg-white rounded-3xl shadow-lg p-6 max-w-sm w-full mx-auto">
        <h1 className="text-xl font-bold text-slate-800 mb-1">Refriartic</h1>
        <p className="text-sm text-slate-500 mb-6">Agenda comercial</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="tucorreo@refriartic.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full rounded-xl bg-brand-600 text-white font-medium py-3 mt-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-xs text-slate-400 mt-4 text-center">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-brand-600 font-medium">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
