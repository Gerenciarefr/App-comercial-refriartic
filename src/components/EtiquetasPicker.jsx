import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// Punto 5: chips de etiquetas asignadas + botón para agregar/quitar. Se usa
// en el detalle de un lead (tabla="lead_etiquetas", campoId="lead_id") y en
// el detalle de un cliente (tabla="cliente_etiquetas", campoId="client_id").
// Cualquier asesor puede asignar o quitar etiquetas aquí — solo crearlas o
// eliminarlas del catálogo (en Ajustes) está restringido al director.
export default function EtiquetasPicker({ tabla, campoId, entidadId, oscuro = false }) {
  const [todas, setTodas] = useState([])
  const [asignadas, setAsignadas] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!entidadId) return
    setCargando(true)
    const [{ data: todasData }, { data: asignadasData }] = await Promise.all([
      supabase.from('etiquetas').select('*').order('created_at', { ascending: true }),
      supabase.from(tabla).select('etiqueta_id').eq(campoId, entidadId),
    ])
    setTodas(todasData || [])
    setAsignadas((asignadasData || []).map((a) => a.etiqueta_id))
    setCargando(false)
  }, [tabla, campoId, entidadId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const toggle = async (etiquetaId) => {
    const yaAsignada = asignadas.includes(etiquetaId)
    if (yaAsignada) {
      setAsignadas((prev) => prev.filter((id) => id !== etiquetaId))
      await supabase.from(tabla).delete().eq(campoId, entidadId).eq('etiqueta_id', etiquetaId)
    } else {
      setAsignadas((prev) => [...prev, etiquetaId])
      await supabase.from(tabla).insert({ [campoId]: entidadId, etiqueta_id: etiquetaId })
    }
  }

  if (cargando) return null

  const etiquetasAsignadas = todas.filter((et) => asignadas.includes(et.id))

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {etiquetasAsignadas.map((et) => (
          <span
            key={et.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ backgroundColor: `${et.color}1A`, color: et.color, border: `1px solid ${et.color}55` }}
          >
            {et.texto}
          </span>
        ))}
        <button
          onClick={() => setAbierto((v) => !v)}
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={
            oscuro
              ? { border: '1px dashed rgba(255,255,255,0.4)', color: 'rgba(255,255,255,0.8)' }
              : { border: '1px dashed #B4B2A9', color: '#5F5E5A' }
          }
        >
          + Etiqueta
        </button>
      </div>

      {abierto && (
        <div
          className="absolute z-10 mt-1.5 bg-white rounded-xl shadow-lg p-2 space-y-0.5 min-w-[180px]"
          style={{ border: '0.5px solid #E5E5E5' }}
        >
          {todas.length === 0 && <p className="text-xs text-gray-400 px-2 py-1">No hay etiquetas creadas todavía.</p>}
          {todas.map((et) => {
            const activa = asignadas.includes(et.id)
            return (
              <button
                key={et.id}
                onClick={() => toggle(et.id)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs hover:bg-gray-50"
                type="button"
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: et.color }} />
                <span className="flex-1">{et.texto}</span>
                {activa && <span style={{ color: et.color }}>✓</span>}
              </button>
            )
          })}
          <button onClick={() => setAbierto(false)} type="button" className="w-full text-center text-[11px] text-gray-400 pt-1">
            Cerrar
          </button>
        </div>
      )}
    </div>
  )
}
