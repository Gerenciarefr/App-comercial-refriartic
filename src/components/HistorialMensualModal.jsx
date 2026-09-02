import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const C = {
  navy: '#14213D',
  orange: '#FCA311',
  card: '#FFFFFF',
  border: '#E5E5E5',
  textPrimary: '#14213D',
  textSecondary: '#5F5E5A',
  textMuted: '#B4B2A9',
}

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function etiquetaMes(mesIso) {
  const d = new Date(`${mesIso}T00:00:00`)
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`
}

function IconX(props) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
function IconChevron({ open, ...props }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Historial de meses cerrados — cada fila es una "foto fija" congelada en
// resumenes_mensuales al momento en que se cerró ese mes (no cambia aunque
// después se edite o borre algo con fecha de ese mes). El total de empresa
// es la fila con asesor_id = null; al expandir un mes se muestra el
// desglose por cada asesor que tuvo ventas ese mes.
// ---------------------------------------------------------------------------
export default function HistorialMensualModal({ abierto, onClose, asesores = [] }) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [mesAbierto, setMesAbierto] = useState(null)
  const [detallePorMes, setDetallePorMes] = useState({})

  useEffect(() => {
    if (!abierto) return
    setCargando(true)
    setError(null)
    supabase
      .from('resumenes_mensuales')
      .select('*')
      .is('asesor_id', null)
      .order('mes', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setFilas(data || [])
        setCargando(false)
      })
  }, [abierto])

  const nombreAsesor = (id) => {
    const a = asesores.find((x) => x.id === id)
    return a ? a.full_name || a.nombre : 'Asesor'
  }

  const toggleMes = async (mes) => {
    if (mesAbierto === mes) {
      setMesAbierto(null)
      return
    }
    setMesAbierto(mes)
    if (!detallePorMes[mes]) {
      const { data } = await supabase
        .from('resumenes_mensuales')
        .select('*')
        .eq('mes', mes)
        .not('asesor_id', 'is', null)
        .order('valor_con_iva', { ascending: false })
      setDetallePorMes((prev) => ({ ...prev, [mes]: data || [] }))
    }
  }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="rounded-t-2xl md:rounded-2xl w-full md:max-w-md max-h-[85vh] overflow-y-auto p-4" style={{ backgroundColor: C.card }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: C.textPrimary }}>Meses anteriores</h2>
          <button onClick={onClose} style={{ color: C.textMuted }}>
            <IconX />
          </button>
        </div>
        <p className="text-[11px] mb-3" style={{ color: C.textMuted }}>
          Totales congelados al cerrar cada mes — no cambian aunque después edites o borres algo de esas fechas.
        </p>

        {cargando && <p className="text-sm py-4 text-center" style={{ color: C.textMuted }}>Cargando...</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!cargando && !error && filas.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: C.textMuted }}>
            Todavía no hay meses cerrados. El mes anterior se cierra automáticamente la próxima vez que entres al resumen.
          </p>
        )}

        <div className="space-y-2">
          {filas.map((f) => {
            const abiertoAqui = mesAbierto === f.mes
            return (
              <div key={f.mes} className="rounded-xl" style={{ border: `0.5px solid ${C.border}` }}>
                <button onClick={() => toggleMes(f.mes)} className="w-full flex items-center justify-between p-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{etiquetaMes(f.mes)}</p>
                    <p className="text-xs" style={{ color: C.textMuted }}>
                      {f.ventas_count} {f.ventas_count === 1 ? 'venta' : 'ventas'} · {f.llamadas_count || 0} {f.llamadas_count === 1 ? 'llamada' : 'llamadas'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-bold" style={{ color: C.navy }}>{formatoCOP.format(f.valor_con_iva)}</p>
                      <p className="text-[11px]" style={{ color: C.textMuted }}>con IVA</p>
                    </div>
                    <IconChevron open={abiertoAqui} style={{ color: C.textMuted }} />
                  </div>
                </button>
                {abiertoAqui && (
                  <div className="px-3 pb-3 space-y-1.5" style={{ borderTop: `0.5px solid ${C.border}` }}>
                    {(detallePorMes[f.mes] || []).length === 0 ? (
                      <p className="text-xs pt-2" style={{ color: C.textMuted }}>Sin desglose por asesor.</p>
                    ) : (
                      (detallePorMes[f.mes] || []).map((d) => (
                        <div key={d.id} className="flex justify-between text-xs pt-2">
                          <span style={{ color: C.textSecondary }}>{nombreAsesor(d.asesor_id)}</span>
                          <span className="font-medium" style={{ color: C.textPrimary }}>{formatoCOP.format(d.valor_con_iva)}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between text-xs pt-2" style={{ borderTop: `0.5px solid ${C.border}` }}>
                      <span style={{ color: C.textSecondary }}>Recaudo del mes</span>
                      <span className="font-medium" style={{ color: C.textPrimary }}>{formatoCOP.format(f.recaudo_mes)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
