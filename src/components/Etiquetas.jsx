import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const COLORES_SUGERIDOS = ['#14213D', '#FCA311', '#1D9E75', '#A32D2D', '#7C3AED', '#0EA5E9', '#B5590A', '#5F5E5A']

// Punto 5: etiquetas de color con texto corto para diferenciar leads y
// clientes desde afuera. Solo el director puede crear o eliminar etiquetas
// aquí; cualquier asesor puede luego asignarlas/quitarlas desde el lead o
// el cliente (eso vive en EtiquetasPicker.jsx, no en esta pantalla).
export default function Etiquetas() {
  const { profile } = useAuth()
  const [etiquetas, setEtiquetas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [texto, setTexto] = useState('')
  const [color, setColor] = useState(COLORES_SUGERIDOS[0])
  const [creando, setCreando] = useState(false)
  const [eliminandoId, setEliminandoId] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('etiquetas').select('*').order('created_at', { ascending: true })
    if (error) setError(error.message)
    else setEtiquetas(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const crear = async (e) => {
    e.preventDefault()
    if (!texto.trim()) return
    setCreando(true)
    setError(null)
    const { error } = await supabase
      .from('etiquetas')
      .insert({ texto: texto.trim(), color, created_by: profile?.id })
    setCreando(false)
    if (error) {
      setError(error.message)
      return
    }
    setTexto('')
    cargar()
  }

  const eliminar = async (etiqueta) => {
    const ok = window.confirm(
      `¿Eliminar la etiqueta "${etiqueta.texto}"? Se quitará de todos los leads y clientes que la tengan.`
    )
    if (!ok) return
    setEliminandoId(etiqueta.id)
    const { error } = await supabase.from('etiquetas').delete().eq('id', etiqueta.id)
    setEliminandoId(null)
    if (error) {
      setError(error.message)
      return
    }
    cargar()
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Crea etiquetas de color con un texto corto para diferenciar leads y clientes. Cualquier asesor puede
        asignarlas o quitarlas desde el detalle del lead o del cliente; solo el director puede crear o eliminar
        etiquetas aquí.
      </p>

      <form onSubmit={crear} className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs text-gray-500 block mb-1">Texto de la etiqueta</label>
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej: Cliente VIP"
            maxLength={30}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Color</label>
          <div className="flex items-center gap-1.5">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer"
            />
            <div className="flex gap-1">
              {COLORES_SUGERIDOS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-full border border-gray-200"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={creando || !texto.trim()}
          className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {creando ? 'Creando...' : 'Crear etiqueta'}
        </button>
      </form>

      {loading && <p className="text-sm text-gray-500 mb-3">Cargando...</p>}
      {error && <p className="text-sm text-red-600 mb-3">Error: {error}</p>}

      <div className="flex flex-wrap gap-2">
        {etiquetas.map((et) => (
          <span
            key={et.id}
            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${et.color}1A`, color: et.color, border: `1px solid ${et.color}55` }}
          >
            {et.texto}
            <button
              onClick={() => eliminar(et)}
              disabled={eliminandoId === et.id}
              className="w-4 h-4 rounded-full flex items-center justify-center disabled:opacity-50"
              style={{ backgroundColor: `${et.color}33` }}
              title="Eliminar etiqueta"
            >
              ×
            </button>
          </span>
        ))}
        {!loading && etiquetas.length === 0 && (
          <p className="text-sm text-gray-400">Todavía no hay etiquetas creadas.</p>
        )}
      </div>
    </div>
  )
}
