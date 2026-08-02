import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const ROL_LABEL = {
  asesor: 'Asesor comercial',
  servicio_tecnico: 'Servicio técnico',
  director: 'Director',
}

export default function AprobarUsuarios() {
  const [pendientes, setPendientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [aprobandoId, setAprobandoId] = useState(null)

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('active', false)
      .order('created_at', { ascending: false })

    if (!error) setPendientes(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [])

  const aprobar = async (id) => {
    setAprobandoId(id)
    await supabase.from('profiles').update({ active: true }).eq('id', id)
    setPendientes((prev) => prev.filter((p) => p.id !== id))
    setAprobandoId(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-brand-600 text-white px-5 pt-8 pb-6 rounded-b-3xl shadow-sm">
        <h1 className="text-2xl font-bold">Cuentas por aprobar</h1>
        <p className="text-brand-100 text-sm mt-0.5">
          {pendientes.length} cuenta{pendientes.length !== 1 ? 's' : ''} pendiente
          {pendientes.length !== 1 ? 's' : ''}
        </p>
      </header>

      <main className="px-4 -mt-4 space-y-3">
        {cargando && (
          <p className="text-center text-slate-400 text-sm py-6">Cargando...</p>
        )}

        {!cargando && pendientes.length === 0 && (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-400 text-sm">
            No hay cuentas pendientes 🎉
          </div>
        )}

        {pendientes.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"
          >
            <p className="font-semibold text-slate-800">
              {p.full_name || '(sin nombre aún)'}
            </p>
            <p className="text-sm text-slate-500">{p.email}</p>
            <p className="text-xs text-brand-600 font-medium mt-1">
              {ROL_LABEL[p.rol] || p.rol}
            </p>
            <button
              onClick={() => aprobar(p.id)}
              disabled={aprobandoId === p.id}
              className="mt-3 w-full rounded-xl bg-brand-600 text-white text-sm font-medium py-2 active:scale-[0.98] transition disabled:opacity-60"
            >
              {aprobandoId === p.id ? 'Aprobando...' : 'Aprobar acceso'}
            </button>
          </div>
        ))}
      </main>
    </div>
  )
}
