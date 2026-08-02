import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function MensajesRapidos() {
  const [mensajes, setMensajes] = useState([])
  const [copiadoId, setCopiadoId] = useState(null)
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .eq('activo', true)
        .order('orden', { ascending: true })

      if (!error) setMensajes(data || [])
    }
    cargar()
  }, [])

  const copiar = async (m) => {
    try {
      await navigator.clipboard.writeText(m.contenido || '')
      setCopiadoId(m.id)
      setTimeout(() => setCopiadoId(null), 1500)
    } catch {
      alert('No se pudo copiar automáticamente. Aquí está el mensaje:\n\n' + m.contenido)
    }
  }

  if (mensajes.length === 0) return null

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-700"
      >
        <span>💬 Mensajes rápidos</span>
        <span className="text-gray-400">{abierto ? '▲' : '▼'}</span>
      </button>

      {abierto && (
        <div className="mt-3 space-y-2">
          {mensajes.map((m) => (
            <div key={m.id} className="border border-gray-200 rounded-lg p-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-600">{m.titulo || m.clave}</p>
                <p className="text-sm text-gray-500 truncate">{m.contenido}</p>
              </div>
              <button
                onClick={() => copiar(m)}
                className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100"
              >
                {copiadoId === m.id ? 'Copiado ✓' : 'Copiar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
