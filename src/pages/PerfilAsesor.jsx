import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import { rangoSemana } from '../lib/fechas'
import HistorialPromedios from '../components/HistorialPromedios'
import Recaudos from '../components/Recaudos'

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const TIPO_VISITA_LABEL = {
  recorrido_zona: 'Recorridos de zona',
  apoyo_entrega: 'Apoyos de entrega',
  cita_programada: 'Citas programadas',
  visita_postventa: 'Visitas de postventa',
}

const CATEGORIAS = [
  { value: 'leads', label: 'Leads' },
  { value: 'cotizaciones', label: 'Cotizaciones' },
  { value: 'ventas', label: 'Ventas' },
  { value: 'valor', label: 'Valor vendido' },
]

const PERIODOS_METAS = [
  { key: 'semanal', label: 'Semana', sufijo: 'Semana' },
  { key: 'mensual', label: 'Mes', sufijo: 'Mes' },
  { key: 'trimestral', label: 'Trimestre', sufijo: 'Trimestre' },
  { key: 'anual', label: 'Año', sufijo: 'Anio' },
]

// --- Paleta Refriartic (misma que NicoResumen.jsx) ---
const C = {
  navy: '#14213D',
  orange: '#FCA311',
  bg: '#DBDBD4',
  card: '#FFFFFF',
  border: '#E5E5E5',
  textPrimary: '#14213D',
  textSecondary: '#5F5E5A',
  textMuted: '#B4B2A9',
}

// --- Íconos SVG minimalistas (sin dependencias externas) ---
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
const IconSnowflake = (props) => (
  <IconBase {...props}>
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="4.9" y1="7" x2="19.1" y2="17" />
    <line x1="4.9" y1="17" x2="19.1" y2="7" />
  </IconBase>
)
const IconDollar = (props) => (
  <IconBase {...props}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5S9.2 9 12 9s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" />
  </IconBase>
)
const IconTrophy = (props) => (
  <IconBase {...props}>
    <path d="M8 21h8" />
    <path d="M12 17v4" />
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M17 5h3a2 2 0 0 1-2 4h-1" />
    <path d="M7 5H4a2 2 0 0 0 2 4h1" />
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
const IconTarget = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </IconBase>
)
const IconChart = (props) => (
  <IconBase {...props}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </IconBase>
)
const IconSearch = (props) => (
  <IconBase {...props}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </IconBase>
)
const IconChevron = ({ open, ...props }) => (
  <IconBase {...props} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
    <polyline points="6 9 12 15 18 9" />
  </IconBase>
)
const IconUsers = (props) => (
  <IconBase {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
    leadsProspeccionSemana: 0,
    leadsProspeccionMes: 0,
    llamadasSemana: 0,
    llamadasMes: 0,
    cotFormalSemana: 0,
    cotFormalMes: 0,
    cotInformalSemana: 0,
    cotInformalMes: 0,
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
    visitasPorTipo: { recorrido_zona: 0, apoyo_entrega: 0, cita_programada: 0, visita_postventa: 0 },
  }
}

export default function PerfilAsesor() {
  const { profile } = useAuth()
  const asesorId = profile?.id

  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [miPosicion, setMiPosicion] = useState(null)
  const [totalAsesores, setTotalAsesores] = useState(0)
  const [miFilaRanking, setMiFilaRanking] = useState(null)

  const [stats, setStats] = useState(statsVacias())
  const [statsEmpresa, setStatsEmpresa] = useState(null)
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState(CATEGORIAS.map((c) => c.value))
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const [metasComerciales, setMetasComerciales] = useState([])
  const [periodoMetas, setPeriodoMetas] = useState('mensual')

  const semana = rangoSemana(0)
  const mes = rangoMes(semana.inicio)
  const trimestre = rangoTrimestre(semana.inicio)
  const anio = rangoAnio(semana.inicio)

  const cargar = useCallback(async () => {
    if (!asesorId) return
    setCargando(true)
    setError(null)
    try {
      const inicios = [semana.inicio, mes.inicio, trimestre.inicio, anio.inicio]
      const fines = [semana.finExclusivo, mes.finExclusivo, trimestre.finExclusivo, anio.finExclusivo]
      const rangoInicio = inicios.reduce((min, v) => (v < min ? v : min))
      const rangoFinExclusivo = fines.reduce((max, v) => (v > max ? v : max))

      // Ranking completo solo se usa para calcular MI puesto — nunca se
      // muestra la lista completa de todos los asesores en pantalla.
      const [{ data: rankingData, error: e1 }, { data: metasComercialesData, error: e2 }] = await Promise.all([
        supabase.from('v_ranking_semanal').select('*').order('puntaje', { ascending: false }),
        supabase.from('metas_comerciales').select('*'),
      ])

      const primerError = e1 || e2
      if (primerError) throw primerError

      const ranking = rankingData || []
      const idx = ranking.findIndex((a) => a.asesor_id === asesorId)
      setMiPosicion(idx >= 0 ? idx + 1 : null)
      setTotalAsesores(ranking.length)
      setMiFilaRanking(idx >= 0 ? ranking[idx] : null)
      setMetasComerciales(metasComercialesData || [])

      // Leads y clientes propios (solo ids) — para anclar cotizaciones y ventas
      const [{ data: misLeads }, { data: misClientes }] = await Promise.all([
        supabase.from('leads').select('id').eq('asesor_id', asesorId),
        supabase.from('clients').select('id').eq('asesor_id', asesorId),
      ])

      const leadIds = (misLeads || []).map((l) => l.id)
      const clientIds = (misClientes || []).map((c) => c.id)

      const [{ data: leadsRango }, { data: historialCot }, { data: pedidos }, { data: manuales }] =
        await Promise.all([
          supabase
            .from('leads')
            .select('origen, created_at')
            .eq('asesor_id', asesorId)
            .in('origen', ['prospeccion_asesor', 'llamada_entrante'])
            .gte('created_at', rangoInicio)
            .lt('created_at', rangoFinExclusivo),
          leadIds.length > 0
            ? supabase
                .from('lead_stage_history')
                .select('lead_id, estado, changed_at')
                .in('lead_id', leadIds)
                .in('estado', ['cotizacion_formal', 'cotizacion_informal'])
                .gte('changed_at', rangoInicio)
                .lt('changed_at', rangoFinExclusivo)
            : Promise.resolve({ data: [] }),
          clientIds.length > 0
            ? supabase
                .from('order_ops')
                .select('created_at, valor_sin_iva, valor_con_iva')
                .in('client_id', clientIds)
                .gte('created_at', rangoInicio)
                .lt('created_at', rangoFinExclusivo)
            : Promise.resolve({ data: [] }),
          supabase
            .from('manual_tasks')
            .select('tipo_visita, completado_at')
            .eq('asesor_id', asesorId)
            .gte('fecha_programada', semana.inicio)
            .lte('fecha_programada', semana.fin),
        ])

      const enSemana = (fecha) => fecha >= semana.inicio && fecha < semana.finExclusivo
      const enMes = (fecha) => fecha >= mes.inicio && fecha < mes.finExclusivo
      const enTrimestre = (fecha) => fecha >= trimestre.inicio && fecha < trimestre.finExclusivo
      const enAnio = (fecha) => fecha >= anio.inicio && fecha < anio.finExclusivo

      const s = statsVacias()

      ;(leadsRango || []).forEach((l) => {
        const esSemana = enSemana(l.created_at)
        const esMes = enMes(l.created_at)
        if (l.origen === 'prospeccion_asesor') {
          if (esSemana) s.leadsProspeccionSemana += 1
          if (esMes) s.leadsProspeccionMes += 1
        } else if (l.origen === 'llamada_entrante') {
          if (esSemana) s.llamadasSemana += 1
          if (esMes) s.llamadasMes += 1
        }
      })

      ;(historialCot || []).forEach((h) => {
        const esSemana = enSemana(h.changed_at)
        const esMes = enMes(h.changed_at)
        if (h.estado === 'cotizacion_formal') {
          if (esSemana) s.cotFormalSemana += 1
          if (esMes) s.cotFormalMes += 1
        } else if (h.estado === 'cotizacion_informal') {
          if (esSemana) s.cotInformalSemana += 1
          if (esMes) s.cotInformalMes += 1
        }
      })

      ;(pedidos || []).forEach((p) => {
        const esSemana = enSemana(p.created_at)
        const esMes = enMes(p.created_at)
        const esTrimestre = enTrimestre(p.created_at)
        const esAnio = enAnio(p.created_at)
        const sinIva = Number(p.valor_sin_iva || 0)
        const conIva = Number(p.valor_con_iva || 0)
        if (esSemana) {
          s.ventasSemana += 1
          s.valorSemanaSinIva += sinIva
          s.valorSemanaConIva += conIva
        }
        if (esMes) {
          s.ventasMes += 1
          s.valorMesSinIva += sinIva
          s.valorMesConIva += conIva
        }
        if (esTrimestre) {
          s.ventasTrimestre += 1
          s.valorTrimestreSinIva += sinIva
          s.valorTrimestreConIva += conIva
        }
        if (esAnio) {
          s.ventasAnio += 1
          s.valorAnioSinIva += sinIva
          s.valorAnioConIva += conIva
        }
      })

      ;(manuales || []).forEach((m) => {
        if (m.tipo_visita && m.completado_at && s.visitasPorTipo[m.tipo_visita] !== undefined) {
          s.visitasPorTipo[m.tipo_visita] += 1
        }
      })

      setStats(s)

      // Totales reales de la empresa para el bloque "Empresa" — solo sumas
      // agregadas (valor y cantidad de pedidos), sin desglosar por asesor.
      const { data: pedidosEmpresa } = await supabase
        .from('order_ops')
        .select('created_at, valor_sin_iva, valor_con_iva')
        .gte('created_at', rangoInicio)
        .lt('created_at', rangoFinExclusivo)

      const sEmpresa = statsVacias()
      ;(pedidosEmpresa || []).forEach((p) => {
        const esSemana = enSemana(p.created_at)
        const esMes = enMes(p.created_at)
        const esTrimestre = enTrimestre(p.created_at)
        const esAnio = enAnio(p.created_at)
        const sinIva = Number(p.valor_sin_iva || 0)
        const conIva = Number(p.valor_con_iva || 0)
        if (esSemana) {
          sEmpresa.ventasSemana += 1
          sEmpresa.valorSemanaSinIva += sinIva
          sEmpresa.valorSemanaConIva += conIva
        }
        if (esMes) {
          sEmpresa.ventasMes += 1
          sEmpresa.valorMesSinIva += sinIva
          sEmpresa.valorMesConIva += conIva
        }
        if (esTrimestre) {
          sEmpresa.ventasTrimestre += 1
          sEmpresa.valorTrimestreSinIva += sinIva
          sEmpresa.valorTrimestreConIva += conIva
        }
        if (esAnio) {
          sEmpresa.ventasAnio += 1
          sEmpresa.valorAnioSinIva += sinIva
          sEmpresa.valorAnioConIva += conIva
        }
      })
      setStatsEmpresa(sEmpresa)
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar tus estadísticas.')
    } finally {
      setCargando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asesorId])

  useEffect(() => {
    cargar()
  }, [cargar])

  const toggleCategoria = (value) => {
    setCategoriasSeleccionadas((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]))
  }

  const mostrar = (categoria) => categoriasSeleccionadas.includes(categoria)

  const obtenerMetaComercial = (scope, periodo, id = null) =>
    metasComerciales.find((m) => m.scope === scope && m.periodo === periodo && (scope !== 'personal' || m.asesor_id === id)) || {
      meta_ventas_hechas: 0,
      meta_valor_sin_iva: 0,
      meta_valor_con_iva: 0,
    }

  const periodoInfo = PERIODOS_METAS.find((p) => p.key === periodoMetas) || PERIODOS_METAS[1]
  const metaPersonal = obtenerMetaComercial('personal', periodoMetas, asesorId)
  const metaEmpresa = obtenerMetaComercial('empresa', periodoMetas)

  const statsMeta = {
    ventasSemana: stats.ventasSemana,
    ventasMes: stats.ventasMes,
    ventasTrimestre: stats.ventasTrimestre,
    ventasAnio: stats.ventasAnio,
    valorSemanaSinIva: stats.valorSemanaSinIva,
    valorSemanaConIva: stats.valorSemanaConIva,
    valorMesSinIva: stats.valorMesSinIva,
    valorMesConIva: stats.valorMesConIva,
    valorTrimestreSinIva: stats.valorTrimestreSinIva,
    valorTrimestreConIva: stats.valorTrimestreConIva,
    valorAnioSinIva: stats.valorAnioSinIva,
    valorAnioConIva: stats.valorAnioConIva,
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg }}>
      <header
        className="px-5 pt-8 pb-9 rounded-b-3xl flex items-center justify-between"
        style={{ backgroundColor: C.navy }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: C.orange }}>
            Tu resumen
          </p>
          <h1 className="text-2xl font-bold text-white mt-0.5">{profile?.full_name || profile?.nombre || 'Perfil'}</h1>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <IconSnowflake size={20} className="text-white" />
        </div>
      </header>

      <main className="px-4 -mt-5 space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2">{error}</div>
        )}

        {cargando ? (
          <p className="text-center text-sm py-6" style={{ color: C.textMuted }}>
            Cargando...
          </p>
        ) : (
          <>
            {/* Valor vendido — la métrica más importante, arriba de todo */}
            {mostrar('valor') && (
              <section className="rounded-2xl p-5 relative z-10" style={{ backgroundColor: C.navy }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <IconDollar size={14} style={{ color: C.orange }} />
                  <p className="text-xs" style={{ color: C.orange }}>
                    Valor vendido — esta semana
                  </p>
                </div>
                <p className="text-3xl font-extrabold text-white leading-tight">
                  {formatoCOP.format(stats.valorSemanaSinIva)}
                </p>
                <p className="text-xs mt-1 mb-3.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {formatoCOP.format(stats.valorSemanaConIva)} con IVA
                </p>
                <div className="h-px mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <div className="flex justify-between items-baseline">
                  <p className="text-xs" style={{ color: C.orange }}>
                    Este mes
                  </p>
                  <p className="text-base font-bold text-white">{formatoCOP.format(stats.valorMesSinIva)}</p>
                </div>
              </section>
            )}

            {/* Ranking: solo el puesto propio, nunca el orden de los demás.
                Naranja solo si el puesto es el número 1. */}
            <section>
              <SectionTitle icon={<IconTrophy size={14} style={{ color: C.textPrimary }} />} texto="Tu puesto en el ranking semanal" />
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
                <span
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0"
                  style={
                    miPosicion === 1
                      ? { backgroundColor: C.orange, color: '#412402' }
                      : { backgroundColor: '#EDEDE7', color: C.textPrimary }
                  }
                >
                  {miPosicion ? `#${miPosicion}` : '—'}
                </span>
                <div className="flex-1">
                  <p className="font-semibold" style={{ color: C.textPrimary }}>
                    {miPosicion ? `Puesto ${miPosicion} de ${totalAsesores}` : 'Aún no hay datos esta semana'}
                  </p>
                  {miFilaRanking && (
                    <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                      {miFilaRanking.leads_semana} leads · {miFilaRanking.cotizaciones_formales_semana} cotizaciones ·{' '}
                      {miFilaRanking.ventas_semana} ventas
                    </p>
                  )}
                </div>
                {miFilaRanking && (
                  <span className="text-sm font-bold" style={{ color: C.textPrimary }}>
                    {miFilaRanking.puntaje} pts
                  </span>
                )}
              </div>
            </section>

            {/* Filtro de métricas a mostrar */}
            <section>
              <button
                onClick={() => setMostrarFiltros((v) => !v)}
                className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}`, color: C.textSecondary }}
              >
                <span className="flex items-center gap-2">
                  <IconSearch size={14} />
                  Filtros — {categoriasSeleccionadas.length} de {CATEGORIAS.length} métricas
                </span>
                <IconChevron open={mostrarFiltros} size={16} />
              </button>

              {mostrarFiltros && (
                <div className="mt-2 rounded-xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold" style={{ color: C.textSecondary }}>
                      Métricas a analizar
                    </p>
                    <button
                      onClick={() => setCategoriasSeleccionadas(CATEGORIAS.map((c) => c.value))}
                      className="text-[11px] font-medium"
                      style={{ color: C.navy }}
                    >
                      Seleccionar todas
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIAS.map((c) => {
                      const activo = categoriasSeleccionadas.includes(c.value)
                      return (
                        <label
                          key={c.value}
                          className="text-xs px-3 py-1.5 rounded-full cursor-pointer"
                          style={
                            activo
                              ? { backgroundColor: C.navy, color: '#FFFFFF', border: `0.5px solid ${C.navy}` }
                              : { backgroundColor: C.card, color: C.textSecondary, border: `0.5px solid ${C.border}` }
                          }
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={activo}
                            onChange={() => toggleCategoria(c.value)}
                          />
                          {c.label}
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* Estadísticas propias */}
            <section className="space-y-4">
              {mostrar('leads') && (
                <div>
                  <SectionTitle icon={<IconUsers size={14} style={{ color: C.textPrimary }} />} texto="Leads" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Prospección" semana={stats.leadsProspeccionSemana} mes={stats.leadsProspeccionMes} />
                    <StatCard label="Llamadas" semana={stats.llamadasSemana} mes={stats.llamadasMes} />
                  </div>
                </div>
              )}

              {mostrar('cotizaciones') && (
                <div>
                  <SectionTitle icon={<IconChart size={14} style={{ color: C.textPrimary }} />} texto="Cotizaciones" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Formales" semana={stats.cotFormalSemana} mes={stats.cotFormalMes} />
                    <StatCard label="Informales" semana={stats.cotInformalSemana} mes={stats.cotInformalMes} />
                  </div>
                </div>
              )}

              {mostrar('ventas') && (
                <div>
                  <SectionTitle icon={<IconRocket size={14} style={{ color: C.textPrimary }} />} texto="Ventas" />
                  <StatCard label="Ventas hechas" semana={stats.ventasSemana} mes={stats.ventasMes} />
                </div>
              )}
            </section>

            {/* Avance de metas: Personal + Empresa (total agregado, no por asesor) */}
            <section>
              <SectionTitle icon={<IconTarget size={14} style={{ color: C.textPrimary }} />} texto="Avance de metas" />
              <div className="space-y-4 mb-3">
                <BloqueMetaAvance titulo="Tu meta personal" sufijo={periodoInfo.sufijo} stats={statsMeta} meta={metaPersonal} />
                <BloqueMetaAvance
                  titulo="Empresa (todos los asesores)"
                  sufijo={periodoInfo.sufijo}
                  stats={statsEmpresa || statsMeta}
                  meta={metaEmpresa}
                />
              </div>

              <div className="flex gap-2 px-1">
                {PERIODOS_METAS.map((p) => {
                  const activo = periodoMetas === p.key
                  return (
                    <button
                      key={p.key}
                      onClick={() => setPeriodoMetas(p.key)}
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
            </section>

            {/* Visitas de la semana */}
            <section>
              <SectionTitle texto="Visitas de la semana" />
              <div className="rounded-2xl p-3 space-y-1.5" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
                {Object.entries(stats.visitasPorTipo).map(([tipo, cant]) => (
                  <div key={tipo} className="flex justify-between text-xs">
                    <span style={{ color: C.textSecondary }}>{TIPO_VISITA_LABEL[tipo]}</span>
                    <span className="font-semibold" style={{ color: C.textPrimary }}>
                      {cant}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <HistorialPromedios asesorId={asesorId} />

            {/* Recaudos — el propio asesor puede registrar sus pagos de
                factura y abonos, en la parte inferior de su perfil. */}
            <Recaudos asesorId={asesorId} />
          </>
        )}
      </main>
    </div>
  )
}

function SectionTitle({ icon, texto }) {
  return (
    <div className="flex items-center gap-1.5 mb-2 px-1">
      {icon}
      <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>
        {texto}
      </h2>
    </div>
  )
}

function StatCard({ label, semana, mes }) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
      <p className="text-xs font-medium mb-2" style={{ color: C.textSecondary }}>
        {label}
      </p>
      <p className="text-xl font-bold leading-tight" style={{ color: C.textPrimary }}>
        {semana}
      </p>
      <p className="text-[11px]" style={{ color: C.textMuted }}>
        esta semana
      </p>
      <div className="h-px my-2" style={{ backgroundColor: C.border }} />
      <p className="text-base font-semibold leading-tight" style={{ color: C.textSecondary }}>
        {mes}
      </p>
      <p className="text-[11px]" style={{ color: C.textMuted }}>
        este mes
      </p>
    </div>
  )
}

// Anillo de progreso circular — usado para la métrica de valor vendido dentro
// del bloque de avance de metas (más emocional que una barra plana).
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

function BloqueMetaAvance({ titulo, sufijo, stats, meta }) {
  const ventasActual = stats[`ventas${sufijo}`] || 0
  const valorActualSinIva = stats[`valor${sufijo}SinIva`] || 0
  const valorActualConIva = stats[`valor${sufijo}ConIva`] || 0

  const metaVentas = Number(meta.meta_ventas_hechas || 0)
  const metaValorSinIva = Number(meta.meta_valor_sin_iva || 0)
  const metaValorConIva = Number(meta.meta_valor_con_iva || 0)

  const pctVentas = metaVentas > 0 ? Math.min(100, Math.round((ventasActual / metaVentas) * 100)) : 0
  const pctValor = metaValorSinIva > 0 ? Math.min(100, Math.round((valorActualSinIva / metaValorSinIva) * 100)) : 0

  const faltanVentas = Math.max(0, metaVentas - ventasActual)
  const faltanValor = Math.max(0, metaValorSinIva - valorActualSinIva)

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold px-1" style={{ color: C.textPrimary }}>
        {titulo}
      </p>

      {/* Valor vendido — anillo de progreso, más visual/emocional */}
      <div className="rounded-2xl p-4 flex items-center gap-4" style={{ backgroundColor: C.navy }}>
        <AnilloMeta pct={pctValor} />
        <div className="flex-1 min-w-0">
          <p className="text-xs mb-1" style={{ color: C.orange }}>
            Valor vendido (sin IVA)
          </p>
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
            '¡Meta alcanzada! 🎉'
          )}
        </p>
      </div>
    </div>
  )
}
