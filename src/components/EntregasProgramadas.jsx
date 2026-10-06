import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function aYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function lunesDeLaSemana(fecha) {
  const d = new Date(fecha)
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function sumarDias(fecha, n) {
  const d = new Date(fecha)
  d.setDate(d.getDate() + n)
  return d
}

function iniciales(nombreCompleto) {
  if (!nombreCompleto) return '—'
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

export default function EntregasProgramadas({ asesoresVisibles, asesores, esDirector, profile, onClose }) {
  const [cursor, setCursor] = useState(new Date())
  const [entregasPorDia, setEntregasPorDia] = useState({})
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)

  const inicioSemana = useMemo(() => lunesDeLaSemana(cursor), [cursor])
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemana, i)), [inicioSemana])

  // Punto 10: ahora la tarjeta muestra entregas de todos los asesores a
  // cualquiera que la abra, así que ya no se puede asumir que todo es "Yo"
  // cuando quien mira no es director — solo se muestra "Yo" para las propias.
  const nombreAsesorId = useCallback(
    (id) => {
      if (id === profile?.id) return 'Yo'
      const a = (asesores || []).find((x) => x.id === id)
      return a?.full_name || a?.nombre || '—'
    },
    [asesores, profile]
  )

  // Las entregas de TODOS los asesores se piden a la función
  // fn_entregas_semana de la base de datos. Antes se consultaban las tablas
  // directamente (automated_tasks, order_ops, clients...), pero las reglas de
  // seguridad solo dejan a cada asesor leer lo suyo, así que un asesor veía
  // únicamente sus propias entregas. La función devuelve solo lo que muestra
  // esta tarjeta: asesor, cliente, pedido, OP, ubicación y si ya se entregó.
  const cargar = useCallback(async () => {
    setCargando(true)

    const inicioStr = aYMD(inicioSemana)
    const finStr = aYMD(sumarDias(inicioSemana, 6))

    const { data, error } = await supabase.rpc('fn_entregas_semana', { p_desde: inicioStr, p_hasta: finStr })

    if (error) {
      console.error(error)
      setErrorCarga('No se pudieron cargar las entregas. Intenta de nuevo.')
      setEntregasPorDia({})
      setCargando(false)
      return
    }
    setErrorCarga(null)

    // Si el director está filtrando por asesores, se respeta ese filtro.
    const visibles = asesoresVisibles && asesoresVisibles.length > 0 ? new Set(asesoresVisibles) : null

    const porDia = {}
    ;(data || []).forEach((e) => {
      if (visibles && !visibles.has(e.asesor_id)) return
      const clave = e.fecha_programada
      porDia[clave] = porDia[clave] || []
      porDia[clave].push({
        id: e.id,
        cumplida: !!e.cumplida,
        iniciales: iniciales(nombreAsesorId(e.asesor_id)),
        nombreAsesor: nombreAsesorId(e.asesor_id),
        cliente: e.cliente,
        numeroPedido: e.numero_pedido,
        titulo: e.titulo,
        ubicacion: e.ubicacion || null,
        ops: e.ops || [],
      })
    })

    setEntregasPorDia(porDia)
    setCargando(false)
  }, [asesoresVisibles, inicioSemana, nombreAsesorId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const hoyStr = aYMD(new Date())
  const totalSemana = Object.values(entregasPorDia).reduce((acc, arr) => acc + arr.length, 0)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white rounded-t-2xl md:rounded-2xl w-full md:max-w-5xl max-h-[90vh] overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-800">🚚 Entregas programadas</h2>
            <p className="text-xs text-slate-500">
              Semana del {inicioSemana.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} ·{' '}
              {totalSemana} entrega{totalSemana !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCursor((c) => sumarDias(c, -7))} className="text-slate-400 text-lg px-2">
            ‹
          </button>
          <button onClick={() => setCursor(new Date())} className="text-xs text-brand-600 font-medium">
            Semana actual
          </button>
          <button onClick={() => setCursor((c) => sumarDias(c, 7))} className="text-slate-400 text-lg px-2">
            ›
          </button>
        </div>

        {errorCarga && <p className="text-center text-xs text-red-600 py-2">{errorCarga}</p>}

        {cargando ? (
          <p className="text-center text-xs text-slate-400 py-10">Cargando entregas...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {dias.map((dia, i) => {
              const clave = aYMD(dia)
              const entregasDia = entregasPorDia[clave] || []
              const esHoy = clave === hoyStr

              return (
                <div
                  key={clave}
                  className={`rounded-xl border p-2 min-h-[100px] ${esHoy ? 'border-brand-400 bg-brand-50/40' : 'border-slate-200'}`}
                >
                  <p className={`text-[11px] font-semibold mb-1.5 ${esHoy ? 'text-brand-600' : 'text-slate-500'}`}>
                    {DIAS_SEMANA[i]} {dia.getDate()}
                  </p>

                  <div className="space-y-1.5">
                    {entregasDia.length === 0 && <p className="text-[10px] text-slate-300">Sin entregas</p>}

                    {entregasDia.map((e) => (
                      <div
                        key={e.id}
                        className={`rounded-lg border p-2 text-[11px] leading-tight ${
                          e.cumplida ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            title={e.nombreAsesor}
                            className="text-[9px] font-bold bg-brand-100 text-brand-700 rounded-full w-5 h-5 flex items-center justify-center shrink-0"
                          >
                            {e.iniciales}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">{e.cliente}</span>
                        </div>
                        <p className="text-slate-500">{e.numeroPedido != null ? `Pedido: ${e.numeroPedido}` : e.titulo}</p>
                        {e.ubicacion && <p className="text-slate-500 truncate">📍 {e.ubicacion}</p>}
                        {e.ops.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {e.ops.map((codigo, idx) => (
                              <span key={idx} className="bg-slate-100 text-slate-600 rounded-full px-1.5 py-0.5">
                                {codigo}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
