import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

export default function CompletarPerfil() {
  const { session, refrescarPerfil } = useAuth()
  const [form, setForm] = useState({
    nombre: '',
    cedula: '',
    celular_comercial: '',
    celular_personal: '',
    correo: session?.user?.email || '',
  })
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cambiar = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }))

  const soloNumeros = (valor) => valor.replace(/\D/g, '')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!form.nombre.trim() || !form.cedula.trim() || (!form.celular_comercial.trim() && !form.celular_personal.trim())) {
      setError('Nombre, cédula y al menos un número de celular (comercial o personal) son obligatorios.')
      return
    }

    setGuardando(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        nombre: form.nombre.trim(),
        cedula: form.cedula.trim(),
        celular_comercial: form.celular_comercial.trim(),
        celular_personal: form.celular_personal.trim(),
        email: form.correo.trim(),
        perfil_completo: true,
      })
      .eq('id', session.user.id)

    setGuardando(false)

    if (error) {
      setError('No se pudo guardar. Intenta de nuevo.')
      return
    }

    await refrescarPerfil()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center px-6 py-10">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 max-w-sm w-full mx-auto">
        <h1 className="text-lg font-bold text-slate-800">Completa tu perfil</h1>
        <p className="text-sm text-slate-500 mb-5">
          Necesitamos estos datos antes de que empieces a usar la agenda.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Campo label="Nombre completo" value={form.nombre} onChange={cambiar('nombre')} required />
          <Campo label="Cédula" value={form.cedula} onChange={(e) => setForm(f => ({ ...f, cedula: soloNumeros(e.target.value) }))} required inputMode="numeric" />
          <Campo label="Celular comercial (o el personal, con que llenes uno basta)" value={form.celular_comercial} onChange={(e) => setForm(f => ({ ...f, celular_comercial: soloNumeros(e.target.value) }))} inputMode="numeric" placeholder="3001234567" />
          <Campo label="Celular personal" value={form.celular_personal} onChange={(e) => setForm(f => ({ ...f, celular_personal: soloNumeros(e.target.value) }))} inputMode="numeric" placeholder="3001234567" />
          <Campo label="Correo" value={form.correo} onChange={cambiar('correo')} type="email" />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full rounded-xl bg-brand-600 text-white font-medium py-3 mt-2 active:scale-[0.98] transition disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Campo({ label, ...props }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">{label}</label>
      <input
        {...props}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-400"
      />
    </div>
  )
}
