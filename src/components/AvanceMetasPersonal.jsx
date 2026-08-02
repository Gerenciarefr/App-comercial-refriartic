import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { rangoSemana } from '../lib/fechas'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const PERIODOS_METAS = [
  { key: 'semanal', label: 'Semana', sufijo: 'Semana' },
  { key: 'mensual', label: 'Mes', sufijo: 'Mes' },
  { key: 'trimestral', label: 'Trimestre', sufijo: 'Trimestre' },
  { key: 'anual', label: 'Año', sufijo: 'Anio' },
]

// --- Paleta Refriartic (misma que el resto de la plataforma) ---
const C = {
  navy: '#14213D',
  orange: '#FCA311',
  card: '#FFFFFF',
  border: '#E5E5E5',
  textPrimary: '#14213D',
  textSecondary: '#5F5E5A',
  textMuted: '#B4B2A9',
}

function IconBase({ children, size = 16, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}
const IconTarget = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </IconBase>
)
const IconFlame = (props) => (
  <IconBase {...props}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 17a2.5 2.5 0 0 0 2.5-2.5c0-1.4-1.1-2-1.6-3.1-.4-.9-.3-1.9-.9-2.9-.3 1-1 1.6-1.7 2.4-.7.8-1.8 1.9-1.8 3.1Z" />
    <path d="M12 21c4.4 0 8-2.7 8-7 0-3.3-2-5.4-3.5-7.5C15 4.5 14 2.5 12 1c0 3-2 5-4 7s-4 4-4 6c0 4.3 3.6 7 8 7Z" />
  </IconBase>
)
const IconRocket = (props) => (
  <IconBase {...props}>
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09Z" />
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </IconBase>
)

function rangoMes(fechaReferencia) {
  const ref = new Date(fechaReferencia)
  const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1)
  const finExclusivo = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
  return { inicio: inicio.toISOString(), finExclusivo: finExclusivo.toISOString() }
}

function rangoTrimestre(fechaReferencia) {
  const ref = new Date(fechaReferencia)
  const trimestreIdx = Math.floor(ref.getMonth() / 3)
  const inicio = new Date(ref.getFullYear(), trimestreIdx * 3, 1)
  const finExclusivo = new Date(ref.getFullYear(), trimestreIdx * 3 + 3, 1)
  return { inicio: inicio.toISOString(), finExclusivo: finExclusivo.toISOString() }
}

function rangoAnio(fechaReferencia) {
  const ref = new Date(fechaReferencia)
  const inicio = new Date(ref.getFullYear(), 0, 1)
  const finExclusivo = new Date(ref.getFullYear() + 1, 0, 1)
  return { inicio: inicio.toISOString(), finExclusivo: finExclusivo.toISOString() }
}

function statsVacias() {
  return {
    ventasSemana: 0,
    ventasMes: 0,
    ventasTrimestre: 0,
    ventasAnio: 0,
    valorSemanaSinIva: 0,
    valorSemanaConIva: 0,
    valorMesSinIva: 0,
    valorMesConIva: 0,
    valorTrimestreSinIva: 0,
    valorTrimestreConIva: 0,
    valorAnioSinIva: 0,
    valorAnioConIva: 0,
  }
}

// Anillo de progreso circular — mismo componente visual que en NicoResumen.jsx
// y PerfilAsesor.jsx, para que el avance de valor vendido se vea igual en
// toda la plataforma.
function AnilloMeta({ pct }) {
  const r = 30
  const circunferencia = 2 * Math.PI * r
  const offset = circunferencia * (1 - Math.min(100, pct) / 100)
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="flex-shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="7" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke={C.orange}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circunferencia}
        strokeDashoffset={offset}
        transform="rotate(-90 36 36)"
      />
      <text x="36" y="33" textAnchor="middle" fontSize="16" fontWeight="700" fill="#FFFFFF">
        {pct}%
      </text>
      <text x="36" y="46" textAnchor="middle" fontSize="7.5" fill={C.orange}>
        de la meta
      </text>
    </svg>
  )
}

// Bloque de avance de metas personales (Ventas hechas + Valor vendido), con
// su propio filtro de periodo (semanal/mensual/trimestral/anual). Se usa
// tanto en el perfil del asesor visto por el director (AsesorDetalle.jsx)
// como en el perfil que ve el propio asesor — misma lógica en ambos lados.
export default function AvanceMetasPersonal({ asesorId }) {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(statsVacias())
  const [meta, setMeta] = useState({})
  const [periodo, setPeriodo] = useState('mensual')

  const cargar = useCallback(async () => {
    if (!asesorId) return
    setCargando(true)
    setError(null)
    try {
      const semana = rangoSemana(0)
      const mes = rangoMes(semana.inicio)
      const trimestre = rangoTrimestre(semana.inicio)
      const anio = rangoAnio(semana.inicio)

      const inicios = [semana.inicio, mes.inicio, trimestre.inicio, anio.inicio]
      const fines = [semana.finExclusivo, mes.finExclusivo, trimestre.finExclusivo, anio.finExclusivo]
      const rangoInicio = inicios.reduce((min, v) => (v < min ? v : min))
      const rangoFinExclusivo = fines.reduce((max, v) => (v > max ? v : max))

      const [{ data: clientesDelAsesor, error: eC }, { data: metasData, error: eM }] = await Promise.all([
        supabase.from('clients').select('id').eq('asesor_id', asesorId),
        supabase.from('metas_comerciales').select('*').eq('scope', 'personal').eq('asesor_id', asesorId),
      ])
      if (eC || eM) throw eC || eM

      const clientIds = (clientesDelAsesor || []).map((c) => c.id)

      const { data: pedidos, error: eP } =
        clientIds.length > 0
          ? await supabase
              .from('order_ops')
              .select('created_at, valor_sin_iva, valor_con_iva')
              .in('client_id', clientIds)
              .gte('created_at', rangoInicio)
              .lt('created_at', rangoFinExclusivo)
          : { data: [], error: null }
      if (eP) throw eP

      const enSemana = (fecha) => fecha >= semana.inicio && fecha < semana.finExclusivo
      const enMes = (fecha) => fecha >= mes.inicio && fecha < mes.finExclusivo
      const enTrimestre = (fecha) => fecha >= trimestre.inicio && fecha < trimestre.finExclusivo
      const enAnio = (fecha) => fecha >= anio.inicio && fecha < anio.finExclusivo

      const s = statsVacias()
      ;(pedidos || []).forEach((p) => {
        const sinIva = Number(p.valor_sin_iva || 0)
        const conIva = Number(p.valor_con_iva || 0)
        if (enSemana(p.created_at)) {
          s.ventasSemana += 1
          s.valorSemanaSinIva += sinIva
          s.valorSemanaConIva += conIva
        }
        if (enMes(p.created_at)) {
          s.ventasMes += 1
          s.valorMesSinIva += sinIva
          s.valorMesConIva += conIva
        }
        if (enTrimestre(p.created_at)) {
          s.ventasTrimestre += 1
          s.valorTrimestreSinIva += sinIva
          s.valorTrimestreConIva += conIva
        }
        if (enAnio(p.created_at)) {
          s.ventasAnio += 1
          s.valorAnioSinIva += sinIva
          s.valorAnioConIva += conIva
        }
      })

      setStats(s)

      const metasPorPeriodo = {}
      ;(metasData || []).forEach((m) => {
        metasPorPeriodo[m.periodo] = m
      })
      setMeta(metasPorPeriodo)
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar el avance de metas.')
    } finally {
      setCargando(false)
    }
  }, [asesorId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const periodoInfo = PERIODOS_METAS.find((p) => p.key === periodo) || PERIODOS_METAS[1]
  const metaActual = meta[periodo] || { meta_ventas_hechas: 0, meta_valor_sin_iva: 0, meta_valor_con_iva: 0 }

  const ventasActual = stats[`ventas${periodoInfo.sufijo}`] || 0
  const valorActualSinIva = stats[`valor${periodoInfo.sufijo}SinIva`] || 0
  const valorActualConIva = stats[`valor${periodoInfo.sufijo}ConIva`] || 0

  const metaVentas = Number(metaActual.meta_ventas_hechas || 0)
  const metaValorSinIva = Number(metaActual.meta_valor_sin_iva || 0)
  const metaValorConIva = Number(metaActual.meta_valor_con_iva || 0)

  const pctVentas = metaVentas > 0 ? Math.min(100, Math.round((ventasActual / metaVentas) * 100)) : 0
  const pctValor = metaValorSinIva > 0 ? Math.min(100, Math.round((valorActualSinIva / metaValorSinIva) * 100)) : 0

  const faltanVentas = Math.max(0, metaVentas - ventasActual)
  const faltanValor = Math.max(0, metaValorSinIva - valorActualSinIva)

  return (
    <section>
      <div className="flex items-center gap-1.5 mb-3 px-1">
        <IconTarget size={14} style={{ color: C.textPrimary }} />
        <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Avance de metas personales</h2>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 mb-3">{error}</div>
      )}

      {cargando ? (
        <p className="text-sm px-1" style={{ color: C.textMuted }}>Cargando avance de metas...</p>
      ) : (
        <>
          <div className="space-y-3 mb-3">
            {/* Valor vendido — anillo de progreso, mismo lenguaje que Resumen/Perfil */}
            <div className="rounded-2xl p-4 flex items-center gap-4" style={{ backgroundColor: C.navy }}>
              <AnilloMeta pct={pctValor} />
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-1" style={{ color: C.orange }}>Valor vendido (sin IVA)</p>
                <p className="text-sm font-semibold text-white mb-1.5 leading-snug">
                  {formatoCOP.format(valorActualSinIva)}
                  <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 400 }}>
                    {' '}
                    {metaValorSinIva > 0 ? `de ${formatoCOP.format(metaValorSinIva)}` : '· sin meta configurada'}
                  </span>
                </p>
                {metaValorSinIva > 0 && (
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(252,163,17,0.15)' }}
                  >
                    <IconFlame size={12} style={{ color: C.orange }} />
                    <span className="text-[11px] font-medium" style={{ color: C.orange }}>
                      {faltanValor > 0 ? `Faltan ${formatoCOP.format(faltanValor)}` : '¡Meta alcanzada!'}
                    </span>
                  </span>
                )}
                <p className="text-[11px] mt-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Con IVA: {formatoCOP.format(valorActualConIva)}
                  {metaValorConIva > 0 ? ` / ${formatoCOP.format(metaValorConIva)}` : ''}
                </p>
              </div>
            </div>

            {/* Ventas hechas — barra gruesa con mensaje motivacional */}
            <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
              <div className="flex justify-between items-baseline mb-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: C.textPrimary }}>
                  <IconRocket size={15} style={{ color: C.orange }} />
                  Ventas hechas
                </span>
                <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>
                  {ventasActual} <span style={{ color: C.textMuted, fontWeight: 400 }}>/ {metaVentas || '—'}</span>
                </span>
              </div>
              <div className="h-3.5 rounded-full overflow-hidden" style={{ backgroundColor: '#EDEDE7' }}>
                <div className="h-full rounded-full" style={{ width: `${pctVentas}%`, backgroundColor: C.orange }} />
              </div>
              <p className="text-xs mt-2" style={{ color: C.textSecondary }}>
                {metaVentas === 0 ? (
                  'Sin meta configurada'
                ) : faltanVentas > 0 ? (
                  <>
                    ¡Vas muy bien! Faltan{' '}
                    <span style={{ color: C.textPrimary, fontWeight: 600 }}>
                      {faltanVentas} venta{faltanVentas !== 1 ? 's' : ''}
                    </span>{' '}
                    para la meta
                  </>
                ) : (
                  '¡Meta alcanzada!'
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2 px-1">
            {PERIODOS_METAS.map((p) => {
              const activo = periodo === p.key
              return (
                <button
                  key={p.key}
                  onClick={() => setPeriodo(p.key)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full"
                  style={
                    activo
                      ? { backgroundColor: C.navy, color: '#FFFFFF', border: `0.5px solid ${C.navy}` }
                      : { backgroundColor: C.card, color: C.textSecondary, border: `0.5px solid ${C.border}` }
                  }
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
