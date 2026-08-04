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

  const inicioSemana = useMemo(() => lunesDeLaSemana(cursor), [cursor])
  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => sumarDias(inicioSemana, i)), [inicioSemana])

  const nombreAsesorId = useCallback(
    (id) => {
      if (!esDirector) return profile?.full_name || profile?.nombre || 'Yo'
      const a = (asesores || []).find((x) => x.id === id)
      return a?.full_name || a?.nombre || '—'
    },
    [esDirector, asesores, profile]
  )

  const cargar = useCallback(async () => {
    if (!asesoresVisibles || asesoresVisibles.length === 0) {
      setEntregasPorDia({})
      setCargando(false)
      return
    }
    setCargando(true)

    const inicioStr = aYMD(inicioSemana)
    const finStr = aYMD(sumarDias(inicioSemana, 6))

    const { data: entregas } = await supabase
      .from('automated_tasks')
      .select('id, asesor_id, op_id, fecha_programada, completado_at')
      .eq('tipo', 'entrega_cliente')
      .in('asesor_id', asesoresVisibles)
      .gte('fecha_programada', inicioStr)
      .lte('fecha_programada', finStr)

    const { data: entregasManuales } = await supabase
      .from('manual_tasks')
      .select('id, asesor_id, titulo, lead_id, client_id, fecha_programada, lugar, completado_at')
      .eq('mostrar_en_entregas', true)
      .in('asesor_id', asesoresVisibles)
      .gte('fecha_programada', inicioStr)
      .lte('fecha_programada', finStr)

    const opIds = [...new Set((entregas || []).map((e) => e.op_id).filter(Boolean))]

    const [{ data: pedidos }, { data: opsPedido }] = await Promise.all([
      opIds.length > 0
        ? supabase.from('order_ops').select('id, client_id, numero_pedido, ubicacion_entrega').in('id', opIds)
        : Promise.resolve({ data: [] }),
      opIds.length > 0
        ? supabase.from('pedido_ops').select('order_op_id, codigo_op').in('order_op_id', opIds)
        : Promise.resolve({ data: [] }),
    ])

    const pedidosMap = Object.fromEntries((pedidos || []).map((p) => [p.id, p]))
    const clientIds = new Set((pedidos || []).map((p) => p.client_id).filter(Boolean))
    const leadIdsManual = [...new Set((entregasManuales || []).map((t) => t.lead_id).filter(Boolean))]
    const clientIdsManual = (entregasManuales || []).map((t) => t.client_id).filter(Boolean)
    clientIdsManual.forEach((id) => clientIds.add(id))

    const [{ data: clientes }, { data: leadsManual }] = await Promise.all([
      clientIds.size > 0
        ? supabase.from('clients').select('id, empresa, nombre_contacto').in('id', [...clientIds])
        : Promise.resolve({ data: [] }),
      leadIdsManual.length > 0
        ? supabase.from('leads').select('id, empresa, nombre_contacto').in('id', leadIdsManual)
        : Promise.resolve({ data: [] }),
    ])
    const clientesMap = Object.fromEntries((clientes || []).map((c) => [c.id, c]))
    const leadsManualMap = Object.fromEntries((leadsManual || []).map((l) => [l.id, l]))

    const opsPorPedido = {}
    ;(opsPedido || []).forEach((o) => {
      opsPorPedido[o.order_op_id] = opsPorPedido[o.order_op_id] || []
      opsPorPedido[o.order_op_id].push(o.codigo_op)
    })

    const porDia = {}
    ;(entregas || []).forEach((e) => {
      const pedido = pedidosMap[e.op_id]
      const cliente = pedido ? clientesMap[pedido.client_id] : null
      const clave = e.fecha_programada
      porDia[clave] = porDia[clave] || []
      porDia[clave].push({
        id: `auto-${e.id}`,
        cumplida: !!e.completado_at,
        iniciales: iniciales(nombreAsesorId(e.asesor_id)),
        nombreAsesor: nombreAsesorId(e.asesor_id),
        cliente: cliente?.empresa || cliente?.nombre_contacto || 'Cliente sin nombre',
        numeroPedido: pedido?.numero_pedido || '—',
        ubicacion: pedido?.ubicacion_entrega || null,
        ops: pedido ? opsPorPedido[pedido.id] || [] : [],
      })
    })

    // Misiones manuales marcadas para aparecer aquí — mismo formato de
    // tarjeta, pero sin número de pedido (se muestra el título en su lugar).
    ;(entregasManuales || []).forEach((t) => {
      const contacto = t.client_id ? clientesMap[t.client_id] : t.lead_id ? leadsManualMap[t.lead_id] : null
      const clave = t.fecha_programada
      porDia[clave] = porDia[clave] || []
      porDia[clave].push({
        id: `manual-${t.id}`,
        cumplida: !!t.completado_at,
        iniciales: iniciales(nombreAsesorId(t.asesor_id)),
        nombreAsesor: nombreAsesorId(t.asesor_id),
        cliente: contacto?.empresa || contacto?.nombre_contacto || t.titulo,
        numeroPedido: null,
        titulo: t.titulo,
        ubicacion: t.lugar || null,
        ops: [],
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
