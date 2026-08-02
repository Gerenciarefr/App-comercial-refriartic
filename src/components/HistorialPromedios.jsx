import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const TRIMESTRES = [
  { meses: [0, 1, 2], label: 'Ene - Feb - Mar' },
  { meses: [3, 4, 5], label: 'Abr - May - Jun' },
  { meses: [6, 7, 8], label: 'Jul - Ago - Sep' },
  { meses: [9, 10, 11], label: 'Oct - Nov - Dic' },
]

// Los 6 aspectos, en el orden confirmado con Nico.
const COLUMNAS = [
  { key: 'leadsProspeccion', label: 'Leads prospección' },
  { key: 'leadsLlamada', label: 'Leads llamada' },
  { key: 'cotFormal', label: 'Cot. formal' },
  { key: 'cotInformal', label: 'Cot. informal' },
  { key: 'ventas', label: 'Ventas hechas' },
  { key: 'valor', label: 'Valor vendido' },
]

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

function etiquetaSemana(inicio) {
  const fin = sumarDias(inicio, 6)
  const opts = { day: 'numeric', month: 'short' }
  return `${inicio.toLocaleDateString('es-CO', opts)} - ${fin.toLocaleDateString('es-CO', opts)}`
}

/**
 * Tabla trimestral de Historial de Promedios. Un asesor a la vez —
 * cuando la usa el director, ya está "eligiendo el asesor" al haber
 * entrado a la ficha de ese asesor específico (AsesorDetalle.jsx);
 * cuando la usa el propio asesor, se le pasa su propio id.
 */
export default function HistorialPromedios({ asesorId }) {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [trimestreIdx, setTrimestreIdx] = useState(Math.floor(hoy.getMonth() / 3))
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const trimestre = TRIMESTRES[trimestreIdx]

  const rango = useMemo(() => {
    const inicioMes = trimestre.meses[0]
    const finMes = trimestre.meses[2]
    const inicio = new Date(anio, inicioMes, 1)
    const finExclusivo = new Date(anio, finMes + 1, 1)
    return { inicio, finExclusivo }
  }, [anio, trimestreIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const semanas = useMemo(() => {
    const lista = []
    let cursor = lunesDeLaSemana(rango.inicio)
    while (cursor < rango.finExclusivo) {
      lista.push({ inicio: new Date(cursor), finExclusivo: sumarDias(cursor, 7) })
      cursor = sumarDias(cursor, 7)
    }
    return lista
  }, [rango])

  useEffect(() => {
    if (!asesorId) return
    let cancelado = false

    const cargar = async () => {
      setCargando(true)
      setError(null)
      try {
        const inicioISO = rango.inicio.toISOString()
        const finISO = rango.finExclusivo.toISOString()

        const [
          { data: leadsRango, error: eL },
          { data: leadsDelAsesor, error: eLid },
          { data: clientesDelAsesor, error: eCid },
        ] = await Promise.all([
          supabase
            .from('leads')
            .select('created_at, origen')
            .eq('asesor_id', asesorId)
            .in('origen', ['prospeccion_asesor', 'llamada_entrante'])
            .gte('created_at', inicioISO)
            .lt('created_at', finISO),
          // Todos los leads/clientes del asesor (solo id) — mismo criterio que
          // AsesorDetalle.jsx: ancla cotizaciones y ventas a las tablas reales
          // (lead_stage_history / order_ops), no a un conteo aparte.
          supabase.from('leads').select('id').eq('asesor_id', asesorId),
          supabase.from('clients').select('id').eq('asesor_id', asesorId),
        ])
        if (eL || eLid || eCid) throw eL || eLid || eCid

        const leadIds = (leadsDelAsesor || []).map((l) => l.id)
        const clientIds = (clientesDelAsesor || []).map((c) => c.id)

        const [{ data: historialCot, error: eHC }, { data: pedidos, error: ePed }] = await Promise.all([
          leadIds.length > 0
            ? supabase
                .from('lead_stage_history')
                .select('estado, changed_at')
                .in('lead_id', leadIds)
                .in('estado', ['cotizacion_formal', 'cotizacion_informal'])
                .gte('changed_at', inicioISO)
                .lt('changed_at', finISO)
            : Promise.resolve({ data: [], error: null }),
          clientIds.length > 0
            ? supabase
                .from('order_ops')
                .select('created_at, valor_sin_iva')
                .in('client_id', clientIds)
                .gte('created_at', inicioISO)
                .lt('created_at', finISO)
            : Promise.resolve({ data: [], error: null }),
        ])
        if (eHC || ePed) throw eHC || ePed

        if (cancelado) return

        const enSemana = (fechaStr, semana) =>
          fechaStr >= semana.inicio.toISOString() && fechaStr < semana.finExclusivo.toISOString()

        const nuevasFilas = semanas.map((semana) => {
          const fila = { leadsProspeccion: 0, leadsLlamada: 0, cotFormal: 0, cotInformal: 0, ventas: 0, valor: 0 }
          ;(leadsRango || []).forEach((l) => {
            if (!enSemana(l.created_at, semana)) return
            if (l.origen === 'prospeccion_asesor') fila.leadsProspeccion += 1
            else if (l.origen === 'llamada_entrante') fila.leadsLlamada += 1
          })
          ;(historialCot || []).forEach((h) => {
            if (!enSemana(h.changed_at, semana)) return
            if (h.estado === 'cotizacion_formal') fila.cotFormal += 1
            else if (h.estado === 'cotizacion_informal') fila.cotInformal += 1
          })
          ;(pedidos || []).forEach((p) => {
            if (!enSemana(p.created_at, semana)) return
            fila.ventas += 1
            fila.valor += Number(p.valor_sin_iva || 0)
          })
          return { semana, ...fila }
        })

        setFilas(nuevasFilas)
      } catch (err) {
        if (!cancelado) setError(err.message || 'No se pudo cargar el historial.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }

    cargar()
    return () => {
      cancelado = true
    }
  }, [asesorId, rango, semanas])

  const irAnterior = () => {
    if (trimestreIdx === 0) {
      setTrimestreIdx(3)
      setAnio((a) => a - 1)
    } else {
      setTrimestreIdx((t) => t - 1)
    }
  }

  const irSiguiente = () => {
    if (trimestreIdx === 3) {
      setTrimestreIdx(0)
      setAnio((a) => a + 1)
    } else {
      setTrimestreIdx((t) => t + 1)
    }
  }

  // El promedio solo se calcula con las semanas ya transcurridas del
  // trimestre — si el trimestre está en curso, las semanas futuras (en cero)
  // no deben "diluir" el promedio real de desempeño.
  const promedios = useMemo(() => {
    const p = { leadsProspeccion: 0, leadsLlamada: 0, cotFormal: 0, cotInformal: 0, ventas: 0, valor: 0 }
    const hoyISO = new Date().toISOString()
    const filasTranscurridas = filas.filter((f) => f.semana.inicio.toISOString() <= hoyISO)
    if (filasTranscurridas.length === 0) return p
    COLUMNAS.forEach(({ key }) => {
      const suma = filasTranscurridas.reduce((acc, f) => acc + f[key], 0)
      p[key] = suma / filasTranscurridas.length
    })
    return p
  }, [filas])

  const totales = useMemo(() => {
    const t = { leadsProspeccion: 0, leadsLlamada: 0, cotFormal: 0, cotInformal: 0, ventas: 0, valor: 0 }
    filas.forEach((f) => {
      COLUMNAS.forEach(({ key }) => {
        t[key] += f[key]
      })
    })
    return t
  }, [filas])

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 mb-2 px-1">Historial de Promedios</h2>
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={irAnterior} className="text-brand-600 text-sm font-medium px-2 py-1 active:bg-brand-50 rounded-lg">
            ‹ Anterior
          </button>
          <p className="text-sm font-semibold text-slate-700">
            {trimestre.label} {anio}
          </p>
          <button onClick={irSiguiente} className="text-brand-600 text-sm font-medium px-2 py-1 active:bg-brand-50 rounded-lg">
            Siguiente ›
          </button>
        </div>

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        {cargando ? (
          <p className="text-xs text-slate-400 text-center py-6">Cargando...</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-[11px] border-collapse min-w-[600px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left font-semibold py-1.5 pl-1 pr-2 sticky left-0 bg-white">Semana</th>
                  {COLUMNAS.map((c) => (
                    <th key={c.key} className="text-right font-semibold py-1.5 px-1.5 whitespace-nowrap">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => {
                  const esFutura = f.semana.inicio.toISOString() > new Date().toISOString()
                  return (
                    <tr key={i} className={`border-t border-slate-100 ${esFutura ? 'opacity-40' : ''}`}>
                      <td className="text-left text-slate-500 py-1.5 pl-1 pr-2 whitespace-nowrap sticky left-0 bg-white">
                        {etiquetaSemana(f.semana.inicio)}
                      </td>
                      {COLUMNAS.map((c) => (
                        <td key={c.key} className="text-right text-slate-700 py-1.5 px-1.5 whitespace-nowrap">
                          {c.key === 'valor' ? formatoCOP.format(f[c.key]) : f[c.key]}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 font-semibold">
                  <td className="text-left text-slate-500 py-1.5 pl-1 pr-2 sticky left-0 bg-white">Promedio</td>
                  {COLUMNAS.map((c) => (
                    <td key={c.key} className="text-right text-slate-700 py-1.5 px-1.5 whitespace-nowrap">
                      {c.key === 'valor' ? formatoCOP.format(promedios[c.key]) : (Math.round(promedios[c.key] * 10) / 10).toString().replace('.', ',')}
                    </td>
                  ))}
                </tr>
                <tr className="font-bold">
                  <td className="text-left text-slate-600 py-1.5 pl-1 pr-2 sticky left-0 bg-white">Total</td>
                  {COLUMNAS.map((c) => (
                    <td key={c.key} className="text-right text-slate-800 py-1.5 px-1.5 whitespace-nowrap">
                      {c.key === 'valor' ? formatoCOP.format(totales[c.key]) : totales[c.key]}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
