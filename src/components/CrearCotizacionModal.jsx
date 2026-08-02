import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const VACIO = {
  client_id: '',
  numero_cotizacion: '',
  valor_cotizado: '',
  ubicacion: '',
  detalle: '',
}

export default function CrearCotizacionModal({ abierto, onClose, onCreada, clientIdInicial = null }) {
  const { profile } = useAuth()
  const esDirector = profile?.rol === 'director' || profile?.role === 'director'
  const [form, setForm] = useState(VACIO)
  const [clientes, setClientes] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!abierto) return

    let query = supabase
      .from('clients')
      .select('id, empresa, nombre_contacto, asesor_id')
      .order('created_at', { ascending: false })
      .limit(300)

    if (!esDirector) query = query.eq('asesor_id', profile?.id)

    query.then(({ data }) => setClientes(data || []))

    setForm({ ...VACIO, client_id: clientIdInicial || '' })
    setMsg(null)
  }, [abierto, clientIdInicial, esDirector, profile])

  if (!abierto) return null

  const clienteSeleccionado = clientes.find((c) => c.id === form.client_id) || null
  const cambiar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }))

  const guardar = async (e) => {
    e.preventDefault()
    setMsg(null)

    if (!form.client_id) return setMsg({ tipo: 'error', texto: 'Selecciona un cliente.' })
    if (!form.numero_cotizacion.trim())
      return setMsg({ tipo: 'error', texto: 'El número de cotización es obligatorio.' })
    if (!form.valor_cotizado || Number(form.valor_cotizado) <= 0)
      return setMsg({ tipo: 'error', texto: 'Ingresa un valor cotizado válido.' })
    if (!form.ubicacion.trim()) return setMsg({ tipo: 'error', texto: 'La ubicación es obligatoria.' })
    if (!clienteSeleccionado?.asesor_id)
      return setMsg({
        tipo: 'error',
        texto: 'Este cliente no tiene asesor asignado. Asígnalo primero desde Clientes.',
      })

    setGuardando(true)

    const { error } = await supabase.from('cotizaciones_clientes').insert({
      client_id: form.client_id,
      numero_cotizacion: form.numero_cotizacion.trim(),
      valor_cotizado: Number(form.valor_cotizado),
      ubicacion: form.ubicacion.trim(),
      detalle: form.detalle.trim() || null,
      asesor_id: clienteSeleccionado.asesor_id,
    })

    setGuardando(false)

    if (error) {
      setMsg({ tipo: 'error', texto: error.message })
      return
    }

    onCreada && onCreada()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">+ Cotización nueva</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={guardar} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Cliente *</label>
            <select
              value={form.client_id}
              onChange={(e) => cambiar('client_id', e.target.value)}
              disabled={!!clientIdInicial}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
            >
              <option value="">Selecciona un cliente...</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.empresa || c.nombre_contacto}
                  {c.empresa && c.nombre_contacto ? ` · ${c.nombre_contacto}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500">Número de cotización *</label>
            <input
              type="text"
              value={form.numero_cotizacion}
              onChange={(e) => cambiar('numero_cotizacion', e.target.value)}
              placeholder="Ej: COT-2026-014"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Valor cotizado (con IVA incluido) *</label>
            <input
              type="number"
              inputMode="numeric"
              value={form.valor_cotizado}
              onChange={(e) => cambiar('valor_cotizado', e.target.value)}
              placeholder="Ej: 5800000"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Ubicación *</label>
            <input
              type="text"
              value={form.ubicacion}
              onChange={(e) => cambiar('ubicacion', e.target.value)}
              placeholder="Ej: Bodega Norte, Bello"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Detalle (opcional)</label>
            <textarea
              value={form.detalle}
              onChange={(e) => cambiar('detalle', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <p className="text-[11px] text-gray-400">
            Al crearla queda en estado "Cotización enviada" y se programa automáticamente una misión de
            "Recontactar" en 2 días para el asesor asignado a este cliente.
          </p>

          {msg && (
            <p className={`text-sm ${msg.tipo === 'error' ? 'text-red-600' : 'text-green-600'}`}>{msg.texto}</p>
          )}

          <button
            type="submit"
            disabled={guardando}
            className="w-full bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-60"
          >
            {guardando ? 'Guardando...' : 'Crear cotización'}
          </button>
        </form>
      </div>
    </div>
  )
}
