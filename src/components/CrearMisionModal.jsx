import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const VACIO = {
  titulo: '',
  fecha_programada: '',
  hora_programada: '',
  lugar: '',
  descripcion: '',
  destino: 'ninguno', // 'ninguno' | 'lead' | 'cliente'
  lead_id: '',
  client_id: '',
  tipo_visita: '',
}

const TIPOS_VISITA = [
  { value: 'recorrido_zona', label: 'Recorrido de zona' },
  { value: 'apoyo_entrega', label: 'Apoyo de entrega' },
  { value: 'cita_programada', label: 'Cita programada' },
  { value: 'visita_postventa', label: 'Visita de postventa' },
]

export default function CrearMisionModal({ abierto, onClose, onCreada, leadIdInicial = null, clientIdInicial = null }) {
  const { profile } = useAuth()
  const esDirector = profile?.rol === 'director' || profile?.role === 'director'

  const [form, setForm] = useState(VACIO)
  const [asesores, setAsesores] = useState([])
  const [asesoresSeleccionados, setAsesoresSeleccionados] = useState([])
  const [leads, setLeads] = useState([])
  const [clientes, setClientes] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!abierto) return

    if (esDirector) {
      supabase
        .from('profiles')
        .select('id, full_name, nombre')
        .eq('rol', 'asesor')
        .eq('active', true)
        .then(({ data }) => setAsesores(data || []))
    } else {
      setAsesores(profile ? [{ id: profile.id, full_name: profile.full_name, nombre: profile.nombre }] : [])
    }

    let leadsQuery = supabase
      .from('leads')
      .select('id, empresa, nombre_contacto')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!esDirector) leadsQuery = leadsQuery.eq('asesor_id', profile?.id)
    leadsQuery.then(({ data }) => setLeads(data || []))

    let clientesQuery = supabase
      .from('clients')
      .select('id, empresa, nombre_contacto')
      .order('created_at', { ascending: false })
      .limit(200)
    if (!esDirector) clientesQuery = clientesQuery.eq('asesor_id', profile?.id)
    clientesQuery.then(({ data }) => setClientes(data || []))

    if (leadIdInicial) {
      setForm((prev) => ({ ...prev, destino: 'lead', lead_id: leadIdInicial }))
    } else if (clientIdInicial) {
      setForm((prev) => ({ ...prev, destino: 'cliente', client_id: clientIdInicial }))
    } else {
      setForm(VACIO)
    }
    setAsesoresSeleccionados(!esDirector && profile?.id ? [profile.id] : [])
    setMsg(null)
  }, [abierto, leadIdInicial, clientIdInicial, esDirector, profile])

  if (!abierto) return null

  const cambiar = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }))

  const toggleAsesor = (id) => {
    setAsesoresSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const guardar = async (e) => {
    e.preventDefault()
    setMsg(null)

    if (!form.titulo.trim()) return setMsg({ tipo: 'error', texto: 'El título es obligatorio.' })
    if (!form.fecha_programada) return setMsg({ tipo: 'error', texto: 'La fecha es obligatoria.' })
    if (asesoresSeleccionados.length === 0) return setMsg({ tipo: 'error', texto: 'Selecciona al menos un asesor.' })

    setGuardando(true)

    const grupoMisionId = asesoresSeleccionados.length > 1 ? crypto.randomUUID() : null

    const filas = asesoresSeleccionados.map((asesor_id) => ({
      asesor_id,
      creado_por: profile?.id || null,
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      lead_id: form.destino === 'lead' && form.lead_id ? form.lead_id : null,
      client_id: form.destino === 'cliente' && form.client_id ? form.client_id : null,
      fecha_programada: form.fecha_programada,
      hora_programada: form.hora_programada || null,
      lugar: form.lugar.trim() || null,
      estado: 'pendiente',
      grupo_mision_id: grupoMisionId,
      tipo_visita: form.tipo_visita || null,
    }))

    const { error } = await supabase.from('manual_tasks').insert(filas)

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
          <h2 className="text-lg font-bold text-gray-800">+ Nueva misión</h2>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">
            ×
          </button>
        </div>

        <form onSubmit={guardar} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Título *</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => cambiar('titulo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Fecha *</label>
              <input
                type="date"
                value={form.fecha_programada}
                onChange={(e) => cambiar('fecha_programada', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Hora (opcional)</label>
              <input
                type="time"
                value={form.hora_programada}
                onChange={(e) => cambiar('hora_programada', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Asesor(es) *</label>
            <div className="flex flex-wrap gap-2">
              {asesores.length === 0 && <p className="text-xs text-gray-400">No hay asesores activos todavía.</p>}
              {asesores.map((a) => (
                <label
                  key={a.id}
                  className={`text-xs px-2 py-1 rounded-full border cursor-pointer ${
                    asesoresSeleccionados.includes(a.id)
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={asesoresSeleccionados.includes(a.id)}
                    onChange={() => toggleAsesor(a.id)}
                  />
                  {a.full_name || a.nombre}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">¿Va dirigido a un lead o cliente? (opcional)</label>
            <div className="flex gap-2 mb-2">
              {[
                { value: 'ninguno', label: 'Ninguno' },
                { value: 'lead', label: 'Lead' },
                { value: 'cliente', label: 'Cliente' },
              ].map((o) => (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => cambiar('destino', o.value)}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    form.destino === o.value
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {form.destino === 'lead' && (
              <select
                value={form.lead_id}
                onChange={(e) => cambiar('lead_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecciona un lead...</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.empresa || l.nombre_contacto}
                  </option>
                ))}
              </select>
            )}

            {form.destino === 'cliente' && (
              <select
                value={form.client_id}
                onChange={(e) => cambiar('client_id', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Selecciona un cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.empresa || c.nombre_contacto}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Tipo de visita (opcional)</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS_VISITA.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => cambiar('tipo_visita', form.tipo_visita === t.value ? '' : t.value)}
                  className={`text-xs px-3 py-1 rounded-full border ${
                    form.tipo_visita === t.value
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {form.tipo_visita && (
              <p className="text-[11px] text-gray-400 mt-1">
                Al marcarse cumplida, esta misión se contará por separado en las estadísticas de visitas.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-500">Lugar (opcional)</label>
            <input
              type="text"
              value={form.lugar}
              onChange={(e) => cambiar('lugar', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500">Detalle (opcional)</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => cambiar('descripcion', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {msg && <p className={`text-sm ${msg.tipo === 'error' ? 'text-red-600' : 'text-green-600'}`}>{msg.texto}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 text-sm font-medium px-4 py-2 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-60"
            >
              {guardando ? 'Creando...' : 'Crear misión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
