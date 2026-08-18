import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { rangoSemana } from '../lib/fechas'

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

// --- Paleta Refriartic ---
// Se usan valores hex directos (no clases brand-*) para que el color
// coincida exactamente con la paleta aprobada, sin depender de tailwind.config.
const C = {
  navy: '#14213D',
  navyText: '#FAC775', // texto secundario claro sobre fondo navy
  orange: '#FCA311',
  bg: '#DBDBD4', // fondo de página, gris un poco más oscuro
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
const IconChevronLeft = (props) => (
  <IconBase {...props}>
    <polyline points="15 18 9 12 15 6" />
  </IconBase>
)
const IconChevronRight = (props) => (
  <IconBase {...props}>
    <polyline points="9 18 15 12 9 6" />
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
    recaudoSemana: 0,
    recaudoMes: 0,
    visitasPorTipo: { recorrido_zona: 0, apoyo_entrega: 0, cita_programada: 0, visita_postventa: 0 },
  }
}

function statsMetaVacias() {
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

export default function NicoResumen() {
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [ranking, setRanking] = useState([])
  const [pendientes, setPendientes] = useState(0)

  const [asesores, setAsesores] = useState([])
  const [statsPorAsesor, setStatsPorAsesor] = useState({})

  const [asesoresSeleccionados, setAsesoresSeleccionados] = useState([])
  const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState(CATEGORIAS.map((c) => c.value))
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  // Avance de metas comerciales (Seleccionados / Empresa)
  const [metasComerciales, setMetasComerciales] = useState([])
  const [periodoMetas, setPeriodoMetas] = useState('mensual')

  // Navegación de semanas: 0 = semana actual, -1 = semana pasada, etc. — el
  // director puede moverse hacia atrás para ver el resultado de semanas
  // anteriores (mes/trimestre/año se recalculan también respecto a esa
  // semana, igual que en el perfil de cada asesor).
  const [offsetSemana, setOffsetSemana] = useState(0)

  const semana = rangoSemana(offsetSemana)
  const mes = rangoMes(semana.inicio)
  const trimestre = rangoTrimestre(semana.inicio)
  const anio = rangoAnio(semana.inicio)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      const inicios = [semana.inicio, mes.inicio, trimestre.inicio, anio.inicio]
      const fines = [semana.finExclusivo, mes.finExclusivo, trimestre.finExclusivo, anio.finExclusivo]
      const rangoInicio = inicios.reduce((min, v) => (v < min ? v : min))
      const rangoFinExclusivo = fines.reduce((max, v) => (v > max ? v : max))

      const [
        { data: rankingData, error: e1 },
        { count: pendientesCount, error: e3 },
        { data: asesoresData, error: e4 },
        { data: metasComercialesData, error: e6 },
      ] = await Promise.all([
        // fn_ranking_semana calcula el ranking para la semana elegida
        // (offsetSemana) y de paso el acumulado de puntos del mes que la
        // contiene — reemplaza a la vieja vista v_ranking_semanal, que
        // estaba fija a "la semana actual" y no permitía navegar semanas
        // pasadas. El orden ya viene resuelto por la función: puntaje de la
        // semana desc, y en caso de empate, más ventas hechas primero.
        supabase.rpc('fn_ranking_semana', { p_offset_semanas: offsetSemana }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('active', false),
        supabase
          .from('profiles')
          .select('id, full_name, nombre')
          .eq('rol', 'asesor')
          .eq('active', true)
          .order('full_name', { ascending: true }),
        supabase.from('metas_comerciales').select('*'),
      ])

      const primerError = e1 || e3 || e4 || e6
      if (primerError) throw primerError

      setRanking(rankingData || [])
      setPendientes(pendientesCount || 0)
      setAsesores(asesoresData || [])
      setMetasComerciales(metasComercialesData || [])

      const asesorIds = (asesoresData || []).map((a) => a.id)

      if (asesorIds.length === 0) {
        setStatsPorAsesor({})
        setCargando(false)
        return
      }

      // Todos los leads y clientes de la empresa (solo ids + asesor) — se usan
      // para anclar cotizaciones y ventas a sus fuentes reales, igual que en
      // el perfil de cada asesor.
      const [{ data: todosLeads }, { data: todosClientes }] = await Promise.all([
        supabase.from('leads').select('id, asesor_id').in('asesor_id', asesorIds),
        supabase.from('clients').select('id, asesor_id').in('asesor_id', asesorIds),
      ])

      const leadAsesorMap = Object.fromEntries((todosLeads || []).map((l) => [l.id, l.asesor_id]))
      const clientAsesorMap = Object.fromEntries((todosClientes || []).map((c) => [c.id, c.asesor_id]))
      const leadIds = (todosLeads || []).map((l) => l.id)
      const clientIds = (todosClientes || []).map((c) => c.id)

      const [{ data: leadsRango }, { data: historialCot }, { data: pedidos }, { data: manuales }, { data: abonosRango }] =
        await Promise.all([
          supabase
            .from('leads')
            .select('asesor_id, origen, created_at')
            .in('asesor_id', asesorIds)
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
                .select('client_id, created_at, valor_sin_iva, valor_con_iva')
                .in('client_id', clientIds)
                .gte('created_at', rangoInicio)
                .lt('created_at', rangoFinExclusivo)
            : Promise.resolve({ data: [] }),
          supabase
            .from('manual_tasks')
            .select('asesor_id, tipo_visita, completado_at')
            .in('asesor_id', asesorIds)
            .gte('fecha_programada', semana.inicio)
            .lte('fecha_programada', semana.fin),
          // Recaudos (abonos de factura) — se llega a asesor_id a través de
          // pagos_factura, ya que abonos_factura no tiene esa columna directa.
          supabase
            .from('abonos_factura')
            .select('valor_abonado, fecha_abono, pagos_factura!inner(asesor_id)')
            .in('pagos_factura.asesor_id', asesorIds)
            .gte('fecha_abono', rangoInicio.slice(0, 10))
            .lt('fecha_abono', rangoFinExclusivo.slice(0, 10)),
        ])

      const enSemana = (fecha) => fecha >= semana.inicio && fecha < semana.finExclusivo
      const enMes = (fecha) => fecha >= mes.inicio && fecha < mes.finExclusivo
      const enTrimestre = (fecha) => fecha >= trimestre.inicio && fecha < trimestre.finExclusivo
      const enAnio = (fecha) => fecha >= anio.inicio && fecha < anio.finExclusivo

      // fecha_abono es una columna `date` (sin hora, ej. "2026-08-10"), así que
      // no se puede comparar como texto contra los límites ISO de arriba (la
      // comparación de strings de distinto largo no da el resultado correcto).
      // Se convierte a Date real antes de comparar.
      const enSemanaFecha = (fechaStr) => {
        const d = new Date(`${fechaStr}T00:00:00`)
        return d >= new Date(semana.inicio) && d < new Date(semana.finExclusivo)
      }
      const enMesFecha = (fechaStr) => {
        const d = new Date(`${fechaStr}T00:00:00`)
        return d >= new Date(mes.inicio) && d < new Date(mes.finExclusivo)
      }

      const porAsesor = {}
      asesorIds.forEach((id) => {
        porAsesor[id] = statsVacias()
      })

      ;(leadsRango || []).forEach((l) => {
        const s = porAsesor[l.asesor_id]
        if (!s) return
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
        const asesorId = leadAsesorMap[h.lead_id]
        const s = porAsesor[asesorId]
        if (!s) return
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
        const asesorId = clientAsesorMap[p.client_id]
        const s = porAsesor[asesorId]
        if (!s) return
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
        const s = porAsesor[m.asesor_id]
        if (!s) return
        if (m.tipo_visita && m.completado_at && s.visitasPorTipo[m.tipo_visita] !== undefined) {
          s.visitasPorTipo[m.tipo_visita] += 1
        }
      })

      ;(abonosRango || []).forEach((a) => {
        const asesorId = a.pagos_factura?.asesor_id
        const s = porAsesor[asesorId]
        if (!s || !a.fecha_abono) return
        const valor = Number(a.valor_abonado || 0)
        if (enSemanaFecha(a.fecha_abono)) s.recaudoSemana += valor
        if (enMesFecha(a.fecha_abono)) s.recaudoMes += valor
      })

      setStatsPorAsesor(porAsesor)
      setAsesoresSeleccionados((prev) => (prev.length > 0 ? prev : asesorIds))
    } catch (err) {
      console.error(err)
      setError('No se pudieron cargar las estadísticas.')
    } finally {
      setCargando(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offsetSemana])

  useEffect(() => {
    cargar()
  }, [cargar])

  const toggleAsesor = (id) => {
    setAsesoresSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleCategoria = (value) => {
    setCategoriasSeleccionadas((prev) => (prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]))
  }

  // Suma las estadísticas de los asesores actualmente seleccionados en el filtro.
  const combinado = asesoresSeleccionados.reduce((acc, id) => {
    const s = statsPorAsesor[id]
    if (!s) return acc
    return {
      leadsProspeccionSemana: acc.leadsProspeccionSemana + s.leadsProspeccionSemana,
      leadsProspeccionMes: acc.leadsProspeccionMes + s.leadsProspeccionMes,
      llamadasSemana: acc.llamadasSemana + s.llamadasSemana,
      llamadasMes: acc.llamadasMes + s.llamadasMes,
      cotFormalSemana: acc.cotFormalSemana + s.cotFormalSemana,
      cotFormalMes: acc.cotFormalMes + s.cotFormalMes,
      cotInformalSemana: acc.cotInformalSemana + s.cotInformalSemana,
      cotInformalMes: acc.cotInformalMes + s.cotInformalMes,
      ventasSemana: acc.ventasSemana + s.ventasSemana,
      ventasMes: acc.ventasMes + s.ventasMes,
      valorSemanaSinIva: acc.valorSemanaSinIva + s.valorSemanaSinIva,
      valorSemanaConIva: acc.valorSemanaConIva + s.valorSemanaConIva,
      valorMesSinIva: acc.valorMesSinIva + s.valorMesSinIva,
      valorMesConIva: acc.valorMesConIva + s.valorMesConIva,
      recaudoSemana: acc.recaudoSemana + s.recaudoSemana,
      recaudoMes: acc.recaudoMes + s.recaudoMes,
      visitasPorTipo: {
        recorrido_zona: acc.visitasPorTipo.recorrido_zona + s.visitasPorTipo.recorrido_zona,
        apoyo_entrega: acc.visitasPorTipo.apoyo_entrega + s.visitasPorTipo.apoyo_entrega,
        cita_programada: acc.visitasPorTipo.cita_programada + s.visitasPorTipo.cita_programada,
        visita_postventa: acc.visitasPorTipo.visita_postventa + s.visitasPorTipo.visita_postventa,
      },
    }
  }, statsVacias())

  const mostrar = (categoria) => categoriasSeleccionadas.includes(categoria)

  // --- Avance de metas comerciales (Personal / Grupal / Empresa) — Ventas hechas + Valor vendido ---
  const sumarStatsMeta = (ids) =>
    ids.reduce((acc, id) => {
      const s = statsPorAsesor[id]
      if (!s) return acc
      return {
        ventasSemana: acc.ventasSemana + s.ventasSemana,
        ventasMes: acc.ventasMes + s.ventasMes,
        ventasTrimestre: acc.ventasTrimestre + s.ventasTrimestre,
        ventasAnio: acc.ventasAnio + s.ventasAnio,
        valorSemanaSinIva: acc.valorSemanaSinIva + s.valorSemanaSinIva,
        valorSemanaConIva: acc.valorSemanaConIva + s.valorSemanaConIva,
        valorMesSinIva: acc.valorMesSinIva + s.valorMesSinIva,
        valorMesConIva: acc.valorMesConIva + s.valorMesConIva,
        valorTrimestreSinIva: acc.valorTrimestreSinIva + s.valorTrimestreSinIva,
        valorTrimestreConIva: acc.valorTrimestreConIva + s.valorTrimestreConIva,
        valorAnioSinIva: acc.valorAnioSinIva + s.valorAnioSinIva,
        valorAnioConIva: acc.valorAnioConIva + s.valorAnioConIva,
      }
    }, statsMetaVacias())

  // "Seleccionados": usa el mismo filtro de asesores que las estadísticas globales.
  // Si hay exactamente 1 asesor elegido, se compara contra su meta personal;
  // si hay 2 o más, contra la meta grupal (configurada una sola vez en Ajustes).
  const statsSeleccionados = sumarStatsMeta(asesoresSeleccionados)
  const esSeleccionUnica = asesoresSeleccionados.length === 1
  // Empresa: todos los asesores registrados, siempre, sin filtro.
  const statsEmpresa = sumarStatsMeta(asesores.map((a) => a.id))

  const obtenerMetaComercial = (scope, periodo, asesorId = null) =>
    metasComerciales.find(
      (m) => m.scope === scope && m.periodo === periodo && (scope !== 'personal' || m.asesor_id === asesorId)
    ) || {
      meta_ventas_hechas: 0,
      meta_valor_sin_iva: 0,
      meta_valor_con_iva: 0,
    }

  const periodoInfo = PERIODOS_METAS.find((p) => p.key === periodoMetas) || PERIODOS_METAS[1]
  const metaEmpresa = obtenerMetaComercial('empresa', periodoMetas)
  const metaSeleccionados = esSeleccionUnica
    ? obtenerMetaComercial('personal', periodoMetas, asesoresSeleccionados[0])
    : obtenerMetaComercial('grupal', periodoMetas)

  const asesorUnicoNombre = esSeleccionUnica
    ? asesores.find((a) => a.id === asesoresSeleccionados[0])?.full_name ||
      asesores.find((a) => a.id === asesoresSeleccionados[0])?.nombre ||
      ''
    : ''
  const tituloSeleccionados = asesoresSeleccionados.length === 0
    ? 'Selecciona al menos un asesor'
    : esSeleccionUnica
    ? `Personal — ${asesorUnicoNombre}`
    : `Equipo (${asesoresSeleccionados.length} asesores seleccionados)`

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg }}>
      <header
        className="px-5 pt-8 pb-9 rounded-b-3xl flex items-center justify-between"
        style={{ backgroundColor: C.navy }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: C.orange }}>
            Panel de Nico
          </p>
          <h1 className="text-2xl font-bold text-white mt-0.5">Resumen general</h1>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <IconSnowflake size={20} className="text-white" />
        </div>
      </header>

      <main className="px-4 -mt-5 space-y-5">
        {/* Navegador de semana: permite ver el resumen de semanas anteriores.
            Mes/trimestre/año se recalculan también en función de la semana
            elegida, igual que en el perfil de cada asesor. */}
        <div className="rounded-2xl p-3 flex items-center justify-between" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
          <button
            onClick={() => setOffsetSemana((o) => o - 1)}
            className="p-1.5 rounded-lg flex items-center gap-1 text-sm font-medium"
            style={{ color: C.navy }}
          >
            <IconChevronLeft size={16} />
            Anterior
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{semana.etiqueta}</p>
            {offsetSemana === 0 && <p className="text-[11px]" style={{ color: C.orange }}>Semana actual</p>}
          </div>
          <button
            onClick={() => setOffsetSemana((o) => o + 1)}
            disabled={offsetSemana >= 0}
            className="p-1.5 rounded-lg flex items-center gap-1 text-sm font-medium disabled:opacity-30"
            style={{ color: C.navy }}
          >
            Siguiente
            <IconChevronRight size={16} />
          </button>
        </div>

        {pendientes > 0 && (
          <Link
            to="/aprobar-usuarios"
            className="block rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3"
          >
            Tienes <strong>{pendientes}</strong> cuenta{pendientes !== 1 ? 's' : ''} esperando aprobación →
          </Link>
        )}

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
              <section
                className="rounded-2xl p-5 relative z-10"
                style={{ backgroundColor: C.navy }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <IconDollar size={14} style={{ color: C.orange }} />
                  <p className="text-xs" style={{ color: C.orange }}>
                    Valor vendido — esta semana
                  </p>
                </div>
                <p className="text-3xl font-extrabold text-white leading-tight">
                  {formatoCOP.format(combinado.valorSemanaSinIva)}
                </p>
                <p className="text-xs mt-1 mb-3.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {formatoCOP.format(combinado.valorSemanaConIva)} con IVA
                </p>
                <div className="h-px mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <div className="flex justify-between items-baseline">
                  <p className="text-xs" style={{ color: C.orange }}>
                    Este mes
                  </p>
                  <div className="text-right">
                    <p className="text-base font-bold text-white">{formatoCOP.format(combinado.valorMesSinIva)}</p>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {formatoCOP.format(combinado.valorMesConIva)} con IVA
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Ranking de la semana — solo el puesto 1 en naranja */}
            <section>
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <IconTrophy size={14} style={{ color: C.textPrimary }} />
                <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>
                  Ranking de la semana
                </h2>
              </div>
              <div className="space-y-2">
                {ranking.map((a, i) => (
                  <div
                    key={a.asesor_id}
                    className="rounded-2xl p-4 flex items-center gap-3"
                    style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={
                        i === 0
                          ? { backgroundColor: C.orange, color: '#412402' }
                          : { backgroundColor: '#EDEDE7', color: C.textSecondary }
                      }
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold" style={{ color: C.textPrimary }}>
                        {a.full_name}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: C.textSecondary }}>
                        {a.leads_semana} leads · {a.cotizaciones_formales_semana} cotizaciones ·{' '}
                        {a.ventas_semana} ventas
                      </p>
                    </div>
                    {/* Puntos de la semana elegida y puntos acumulados del mes,
                        con la misma relevancia visual (mismo tamaño y estilo). */}
                    <div className="flex gap-1.5 shrink-0">
                      <div className="text-center rounded-xl px-2.5 py-1.5" style={{ backgroundColor: '#EEEDFE' }}>
                        <p className="text-sm font-bold leading-tight" style={{ color: '#3C3489' }}>
                          {a.puntaje_semana}
                        </p>
                        <p className="text-[9px] leading-tight" style={{ color: '#3C3489' }}>
                          pts semana
                        </p>
                      </div>
                      <div className="text-center rounded-xl px-2.5 py-1.5" style={{ backgroundColor: '#FAEEDA' }}>
                        <p className="text-sm font-bold leading-tight" style={{ color: '#854F0B' }}>
                          {a.puntaje_mes}
                        </p>
                        <p className="text-[9px] leading-tight" style={{ color: '#854F0B' }}>
                          pts mes
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {ranking.length === 0 && (
                  <p className="text-sm px-1" style={{ color: C.textMuted }}>
                    Aún no hay datos esta semana.
                  </p>
                )}
              </div>
            </section>

            {/* Filtros: qué asesores y qué métricas combinar — controla tanto las
                estadísticas globales como el avance de metas */}
            <section>
              <button
                onClick={() => setMostrarFiltros((v) => !v)}
                className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold"
                style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}`, color: C.textSecondary }}
              >
                <span className="flex items-center gap-2">
                  <IconSearch size={14} />
                  Filtros — {asesoresSeleccionados.length} de {asesores.length} asesores ·{' '}
                  {categoriasSeleccionadas.length} de {CATEGORIAS.length} métricas
                </span>
                <IconChevron open={mostrarFiltros} size={16} />
              </button>

              {mostrarFiltros && (
                <div
                  className="mt-2 rounded-xl p-4 space-y-4"
                  style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold" style={{ color: C.textSecondary }}>
                        Asesores
                      </p>
                      <button
                        onClick={() => setAsesoresSeleccionados(asesores.map((a) => a.id))}
                        className="text-[11px] font-medium"
                        style={{ color: C.navy }}
                      >
                        Seleccionar todos
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {asesores.map((a) => {
                        const activo = asesoresSeleccionados.includes(a.id)
                        return (
                          <label
                            key={a.id}
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
                              onChange={() => toggleAsesor(a.id)}
                            />
                            {a.full_name || a.nombre}
                          </label>
                        )
                      })}
                    </div>
                  </div>

                  <div>
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
                </div>
              )}
            </section>

            {/* Estadísticas combinadas de los asesores seleccionados */}
            <section className="space-y-4">
              {mostrar('leads') && (
                <div>
                  <SectionTitle icon={<IconUsers size={14} style={{ color: C.textPrimary }} />} texto="Leads" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      label="Prospección"
                      semana={combinado.leadsProspeccionSemana}
                      mes={combinado.leadsProspeccionMes}
                    />
                    <StatCard label="Llamadas" semana={combinado.llamadasSemana} mes={combinado.llamadasMes} />
                  </div>
                </div>
              )}

              {mostrar('cotizaciones') && (
                <div>
                  <SectionTitle icon={<IconChart size={14} style={{ color: C.textPrimary }} />} texto="Cotizaciones" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Formales" semana={combinado.cotFormalSemana} mes={combinado.cotFormalMes} />
                    <StatCard
                      label="Informales"
                      semana={combinado.cotInformalSemana}
                      mes={combinado.cotInformalMes}
                    />
                  </div>
                </div>
              )}

              {mostrar('ventas') && (
                <div>
                  <SectionTitle icon={<IconRocket size={14} style={{ color: C.textPrimary }} />} texto="Ventas" />
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard label="Ventas hechas" semana={combinado.ventasSemana} mes={combinado.ventasMes} />
                    <StatCard
                      label="Recaudado"
                      semana={formatoCOP.format(combinado.recaudoSemana)}
                      mes={formatoCOP.format(combinado.recaudoMes)}
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Avance de metas comerciales: Ventas hechas + Valor vendido.
                "Seleccionados" usa el mismo filtro de asesores de arriba
                (1 asesor = meta personal, 2+ = meta grupal); "Empresa" es fija. */}
            <section>
              <SectionTitle icon={<IconTarget size={14} style={{ color: C.textPrimary }} />} texto="Avance de metas" />
              <div className="space-y-4 mb-3">
                <BloqueMetaAvance
                  titulo={tituloSeleccionados}
                  sufijo={periodoInfo.sufijo}
                  stats={statsSeleccionados}
                  meta={metaSeleccionados}
                />
                <BloqueMetaAvance
                  titulo="Empresa (todos los asesores)"
                  sufijo={periodoInfo.sufijo}
                  stats={statsEmpresa}
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

            {/* Visitas — cuadro pequeño, siempre visible, respeta el filtro de asesores */}
            <section>
              <SectionTitle texto="Visitas de la semana" />
              <div
                className="rounded-2xl p-3 space-y-1.5"
                style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
              >
                {Object.entries(combinado.visitasPorTipo).map(([tipo, cant]) => (
                  <div key={tipo} className="flex justify-between text-xs">
                    <span style={{ color: C.textSecondary }}>{TIPO_VISITA_LABEL[tipo]}</span>
                    <span className="font-semibold" style={{ color: C.textPrimary }}>
                      {cant}
                    </span>
                  </div>
                ))}
              </div>
            </section>
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

// Bloque de avance de metas comerciales (Ventas hechas + Valor vendido) para
// el grupo de asesores seleccionado o para la empresa, en el periodo elegido.
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
            {ventasActual}{' '}
            <span style={{ color: C.textMuted, fontWeight: 400 }}>/ {metaVentas || '—'}</span>
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
              ¡Van muy bien! Faltan{' '}
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
