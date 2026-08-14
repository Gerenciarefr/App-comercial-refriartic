import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import CrearMisionModal from '../components/CrearMisionModal'
import EntregasProgramadas from '../components/EntregasProgramadas'

// --- Paleta Refriartic (misma que el resto de la plataforma) ---
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

// ---------------------------------------------------------------------------
// Clasificación de misiones en grupos ("burbujas") — definida junto a Nico.
// Cada grupo conserva su color e incorpora un ícono propio para la línea de
// tiempo del detalle del día.
// ---------------------------------------------------------------------------
const GRUPOS = {
  llamadas: { label: 'Llamadas', color: 'bg-blue-500', hex: '#0C6ABF', icon: 'phone' },
  seguimiento: { label: 'Seguimiento', color: 'bg-yellow-400', hex: '#EAB308', icon: 'clock' },
  gestion: { label: 'Gestión leads/clientes', color: 'bg-orange-500', hex: '#FCA311', icon: 'search' },
  visitas: { label: 'Visitas', color: 'bg-emerald-600', hex: '#15803D', icon: 'pin' },
  entregas: { label: 'Entregas y postventa', color: 'bg-lime-400', hex: '#84CC16', icon: 'truck' },
}

const TIPOS_SEGUIMIENTO = [
  'contactar_lead',
  'seguimiento_cotizacion',
  'recordatorio_etapa',
  'recontactar_1',
  'recontactar_2',
  'recontactar_3',
]

const TIPOS_ENTREGAS = [
  'entrega_cliente',
  'confirmar_entrega',
  'postventa_35_dias',
  'postventa_70_dias',
  'postventa_270_dias',
  'bodegaje_alerta_1',
  'bodegaje_alerta_2',
]

// Misiones que se marcan con el badge "Atender de inmediato".
const TIPOS_URGENTES = ['llamada_entrante', 'bodegaje_alerta_1', 'bodegaje_alerta_2', 'confirmar_entrega']

// Misiones "simples": solo botón de completada, sin estado editable con
// mensajes/WhatsApp (entrega_cliente automática, y todo lo de manual_tasks
// -- visitas incluidas, que llegan con tabla 'manual_tasks').
function esMisionSimple(m) {
  if (m.tabla === 'manual_tasks') return true
  if (m.tipoOriginal === 'entrega_cliente') return true
  if (m.tipoOriginal === 'visita_programada') return true
  return false
}

function esMisionUrgente(m) {
  return TIPOS_URGENTES.includes(m.tipoOriginal)
}

const TIPO_TAREA_LABELS = {
  llamada_entrante: 'Llamada entrante',
  contactar_lead: 'Contactar lead nuevo',
  seguimiento_cotizacion: 'Seguimiento de cotización',
  recordatorio_etapa: 'Recordatorio de etapa',
  postventa_35_dias: 'Postventa · 35 días',
  postventa_70_dias: 'Postventa · 70 días',
  postventa_270_dias: 'Postventa · 270 días',
  entrega_cliente: 'Entrega al cliente',
  confirmar_entrega: 'Confirmar entrega (10 días antes)',
  visita_programada: 'Visita programada',
  recontactar_1: 'Recontactar',
  recontactar_2: 'Recontactar 2',
  recontactar_3: 'Recontactar 3',
  bodegaje_alerta_1: 'Alerta de inicio de bodegaje',
  bodegaje_alerta_2: 'Bodegaje · aviso de seguimiento',
}

const TIPO_VISITA_LABELS = {
  recorrido_zona: 'Recorrido de zona',
  apoyo_entrega: 'Apoyo de entrega',
  cita_programada: 'Cita programada',
  visita_postventa: 'Visita de postventa',
}

// Estados "rápidos" editables desde la Hoja de Ruta. "Venta hecha" queda
// fuera a propósito: ese cambio exige correo, teléfono, valor cotizado y
// código de cotización — se hace desde la ficha completa del lead.
const ESTADOS_RAPIDOS = [
  { value: 'no_responde', label: 'No responde' },
  { value: 'contactado', label: 'Contactado' },
  { value: 'cotizacion_informal', label: 'Cotización informal' },
  { value: 'cotizacion_formal', label: 'Cotización formal' },
  { value: 'proximo_a_vender', label: 'Próximo a vender' },
  { value: 'venta_perdida', label: 'Venta perdida' },
]

// Color de fondo/texto del selector de estado, según valor actual — misma
// paleta semántica usada en NicoLeads.jsx / NicoLeadDetalle.jsx.
const ESTADO_COLOR = {
  no_responde: { bg: '#EDEDE7', text: '#5F5E5A' },
  contactado: { bg: '#E6F1FB', text: '#0C447C' },
  cotizacion_informal: { bg: '#FAEEDA', text: '#854F0B' },
  cotizacion_formal: { bg: '#EEEDFE', text: '#3C3489' },
  proximo_a_vender: { bg: '#FBEAF0', text: '#993556' },
  venta_hecha: { bg: '#E1F5EE', text: '#085041' },
  venta_perdida: { bg: '#FCEBEB', text: '#A32D2D' },
}

const TIPOS_SEGUIMIENTO_LEAD = [
  'contactar_lead',
  'seguimiento_cotizacion',
  'recordatorio_etapa',
  'recontactar_1',
  'recontactar_2',
  'recontactar_3',
]

function esDomingo(fechaStr) {
  return new Date(fechaStr + 'T00:00:00').getDay() === 0
}

function domingoDeLaSemana(fechaStr) {
  // fechaStr ya es domingo — devuelve viernes, sábado y lunes de esa misma semana
  const d = new Date(fechaStr + 'T00:00:00')
  const viernes = sumarDias(d, -2)
  const sabado = sumarDias(d, -1)
  const lunes = sumarDias(d, 1)
  return { viernes, sabado, lunes }
}

function soloNumeros(telefono) {
  return (telefono || '').replace(/\D/g, '')
}

function waLink(telefono) {
  const numeros = soloNumeros(telefono)
  if (!numeros) return null
  const conPrefijo = numeros.startsWith('57') ? numeros : `57${numeros}`
  return `https://wa.me/${conPrefijo}`
}

function grupoDeAutomatica(tipo) {
  if (tipo === 'llamada_entrante') return 'llamadas'
  if (TIPOS_SEGUIMIENTO.includes(tipo)) return 'seguimiento'
  if (TIPOS_ENTREGAS.includes(tipo)) return 'entregas'
  if (tipo === 'visita_programada') return 'visitas'
  return 'seguimiento'
}

function grupoDeManual(m) {
  if (m.tipo_visita) return 'visitas'
  if (!m.lead_id && !m.client_id) return 'visitas' // "Ninguno" -> Visitas
  return 'gestion'
}

// Solo prospección de asesor queda como burbuja directa del lead — la
// llamada entrante ahora se crea como automated_task ('llamada_entrante')
// para poder marcarse como completada y llevar WhatsApp/mensajes propios.
function grupoDeLead(origen) {
  if (origen === 'prospeccion_asesor') return 'gestion'
  return null
}

// ---------------------------------------------------------------------------
// Helpers de fecha (mismo criterio lunes-domingo que fechas.js)
// ---------------------------------------------------------------------------
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

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

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
const IconTruck = (props) => (
  <IconBase {...props}>
    <rect x="1" y="6" width="15" height="12" rx="1" />
    <path d="M16 10h4l3 3v5h-7z" />
    <circle cx="6" cy="19" r="2" />
    <circle cx="17.5" cy="19" r="2" />
  </IconBase>
)
const IconPlus = (props) => (
  <IconBase {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
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
const IconX = (props) => (
  <IconBase {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </IconBase>
)
const IconCheck = (props) => (
  <IconBase {...props}>
    <polyline points="20 6 9 17 4 12" />
  </IconBase>
)
const IconMessage = (props) => (
  <IconBase {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
  </IconBase>
)
const IconBan = (props) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="9" />
    <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" />
  </IconBase>
)
const IconCalendar = (props) => (
  <IconBase {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </IconBase>
)

// Íconos por grupo, usados en los círculos de la línea de tiempo del día.
function IconGrupo({ grupo, size = 15, ...props }) {
  const tipo = GRUPOS[grupo]?.icon
  if (tipo === 'phone') {
    return (
      <IconBase size={size} {...props}>
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z" />
      </IconBase>
    )
  }
  if (tipo === 'clock') {
    return (
      <IconBase size={size} {...props}>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 16 14" />
      </IconBase>
    )
  }
  if (tipo === 'search') {
    return (
      <IconBase size={size} {...props}>
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </IconBase>
    )
  }
  if (tipo === 'pin') {
    return (
      <IconBase size={size} {...props}>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </IconBase>
    )
  }
  return <IconTruck size={size} {...props} />
}

export default function HojaDeRuta() {
  const { profile } = useAuth()
  const esDirector = profile?.rol === 'director' || profile?.role === 'director'

  const [vista, setVista] = useState('mes') // 'mes' | 'semana'
  const [cursor, setCursor] = useState(new Date()) // fecha ancla de la vista actual
  const [asesores, setAsesores] = useState([])
  const [asesorFiltro, setAsesorFiltro] = useState('todos') // solo aplica si esDirector

  const [misionesPorDia, setMisionesPorDia] = useState({}) // { 'YYYY-MM-DD': [misión, ...] }
  const [diasPicoPlaca, setDiasPicoPlaca] = useState({}) // { 'YYYY-MM-DD': nota }
  const [cargando, setCargando] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState(null)
  const [modalMisionAbierto, setModalMisionAbierto] = useState(false)
  const [modalEntregasAbierto, setModalEntregasAbierto] = useState(false)

  // -- Rango de fechas visible según la vista --------------------------------
  const rango = useMemo(() => {
    if (vista === 'semana') {
      const inicio = lunesDeLaSemana(cursor)
      const fin = sumarDias(inicio, 6)
      return { inicio, fin }
    }
    // Vista mes: cuadrícula completa (lunes de la semana del día 1 -> domingo
    // de la semana del último día del mes)
    const primerDiaMes = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const ultimoDiaMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const inicio = lunesDeLaSemana(primerDiaMes)
    const finSemanaUltimo = lunesDeLaSemana(ultimoDiaMes)
    const fin = sumarDias(finSemanaUltimo, 6)
    return { inicio, fin }
  }, [vista, cursor])

  // -- Cargar asesores (solo director los necesita para filtrar) ------------
  useEffect(() => {
    if (!esDirector) return
    supabase
      .from('profiles')
      .select('id, full_name, nombre')
      .eq('rol', 'asesor')
      .eq('active', true)
      .order('full_name', { ascending: true })
      .then(({ data }) => setAsesores(data || []))
  }, [esDirector])

  const asesoresVisibles = useMemo(() => {
    if (!esDirector) return profile?.id ? [profile.id] : []
    if (asesorFiltro === 'todos') return asesores.map((a) => a.id)
    return [asesorFiltro]
  }, [esDirector, profile, asesorFiltro, asesores])

  const nombreAsesorId = useCallback(
    (id) => {
      if (!esDirector) return profile?.full_name || profile?.nombre || 'Yo'
      const a = asesores.find((x) => x.id === id)
      return a?.full_name || a?.nombre || '—'
    },
    [esDirector, asesores, profile]
  )

  // -- Cargar misiones del rango visible --------------------------------------
  const cargar = useCallback(async () => {
    if (asesoresVisibles.length === 0) {
      setMisionesPorDia({})
      setCargando(false)
      return
    }
    setCargando(true)

    const inicioStr = aYMD(rango.inicio)
    const finStr = aYMD(rango.fin)

    const [autoRes, manualRes, leadsRes, picoPlacaRes] = await Promise.all([
      supabase
        .from('automated_tasks')
        .select('id, asesor_id, lead_id, client_id, op_id, tipo, fecha_programada, hora_programada, completado_at, mensaje_sugerido')
        .in('asesor_id', asesoresVisibles)
        .gte('fecha_programada', inicioStr)
        .lte('fecha_programada', finStr),
      supabase
        .from('manual_tasks')
        .select('id, asesor_id, titulo, descripcion, lead_id, client_id, fecha_programada, hora_programada, completado_at, lugar, tipo_visita')
        .in('asesor_id', asesoresVisibles)
        .gte('fecha_programada', inicioStr)
        .lte('fecha_programada', finStr),
      supabase
        .from('leads')
        .select('id, asesor_id, empresa, nombre_contacto, origen, created_at, completado_at')
        .in('asesor_id', asesoresVisibles)
        .in('origen', ['prospeccion_asesor'])
        .gte('created_at', inicioStr)
        .lte('created_at', finStr + 'T23:59:59'),
      supabase.from('dias_pico_placa').select('fecha, nota').gte('fecha', inicioStr).lte('fecha', finStr),
    ])

    const mapaPico = {}
    ;(picoPlacaRes.data || []).forEach((d) => {
      const clave = String(d.fecha).slice(0, 10)
      mapaPico[clave] = d.nota || 'Pico y placa'
    })
    setDiasPicoPlaca(mapaPico)

    // -- Prefetch de nombre/empresa de contacto, para mostrarlo en el
    // encabezado de la tarjeta sin esperar a que se expanda ---------------
    const leadIdsSet = new Set()
    const clientIdsSet = new Set()
    ;[...(autoRes.data || []), ...(manualRes.data || [])].forEach((t) => {
      if (t.lead_id) leadIdsSet.add(t.lead_id)
      if (t.client_id) clientIdsSet.add(t.client_id)
    })

    const [leadsContactoRes, clientsContactoRes] = await Promise.all([
      leadIdsSet.size > 0
        ? supabase.from('leads').select('id, empresa, nombre_contacto').in('id', [...leadIdsSet])
        : Promise.resolve({ data: [] }),
      clientIdsSet.size > 0
        ? supabase.from('clients').select('id, empresa, nombre_contacto').in('id', [...clientIdsSet])
        : Promise.resolve({ data: [] }),
    ])

    const leadsContactoMap = Object.fromEntries((leadsContactoRes.data || []).map((l) => [l.id, l]))
    const clientsContactoMap = Object.fromEntries((clientsContactoRes.data || []).map((c) => [c.id, c]))

    const contactoDeTarea = (t) =>
      (t.client_id && clientsContactoMap[t.client_id]) || (t.lead_id && leadsContactoMap[t.lead_id]) || null

    const porDia = {}
    const agregar = (fecha, mision) => {
      if (!fecha) return
      const clave = fecha.slice(0, 10)
      porDia[clave] = porDia[clave] || []
      porDia[clave].push(mision)
    }

    ;(autoRes.data || []).forEach((t) => {
      const contacto = contactoDeTarea(t)
      agregar(t.fecha_programada, {
        id: `auto-${t.id}`,
        origenTarea: 'auto',
        grupo: grupoDeAutomatica(t.tipo),
        tipoOriginal: t.tipo,
        titulo: TIPO_TAREA_LABELS[t.tipo] || t.tipo,
        cliente: contacto?.nombre_contacto || null,
        empresa: contacto?.empresa || null,
        hora: t.hora_programada,
        cumplida: !!t.completado_at,
        asesor_id: t.asesor_id,
        lead_id: t.lead_id,
        client_id: t.client_id,
        tabla: 'automated_tasks',
        idOriginal: t.id,
      })
    })
    ;(manualRes.data || []).forEach((t) => {
      const contacto = contactoDeTarea(t)
      agregar(t.fecha_programada, {
        id: `manual-${t.id}`,
        origenTarea: 'manual',
        grupo: grupoDeManual(t),
        tipoOriginal: null,
        titulo: t.tipo_visita ? TIPO_VISITA_LABELS[t.tipo_visita] || t.titulo : t.titulo,
        cliente: contacto?.nombre_contacto || null,
        empresa: contacto?.empresa || t.lugar || null,
        hora: t.hora_programada,
        cumplida: !!t.completado_at,
        asesor_id: t.asesor_id,
        lead_id: t.lead_id,
        client_id: t.client_id,
        tabla: 'manual_tasks',
        idOriginal: t.id,
      })
    })
    ;(leadsRes.data || []).forEach((l) => {
      const grupo = grupoDeLead(l.origen)
      if (!grupo) return
      agregar(l.created_at, {
        id: `lead-${l.id}`,
        origenTarea: 'lead',
        grupo,
        tipoOriginal: null,
        titulo: 'Prospección de asesor',
        cliente: l.nombre_contacto || null,
        empresa: l.empresa || null,
        hora: null,
        cumplida: !!l.completado_at,
        asesor_id: l.asesor_id,
        lead_id: l.id,
        client_id: null,
        tabla: 'leads',
        idOriginal: l.id,
      })
    })

    setMisionesPorDia(porDia)
    setCargando(false)
  }, [asesoresVisibles, rango])

  useEffect(() => {
    cargar()
  }, [cargar])

  // -- Navegación --------------------------------------------------------------
  const irAnterior = () => setCursor((c) => (vista === 'semana' ? sumarDias(c, -7) : new Date(c.getFullYear(), c.getMonth() - 1, 1)))
  const irSiguiente = () => setCursor((c) => (vista === 'semana' ? sumarDias(c, 7) : new Date(c.getFullYear(), c.getMonth() + 1, 1)))
  const irHoy = () => setCursor(new Date())

  // -- Construir celdas de la cuadrícula ---------------------------------------
  const celdas = useMemo(() => {
    const dias = []
    let d = new Date(rango.inicio)
    while (d <= rango.fin) {
      dias.push(new Date(d))
      d = sumarDias(d, 1)
    }
    return dias
  }, [rango])

  const hoyStr = aYMD(new Date())
  const mesVisible = cursor.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })

  const misionesDelDia = (fecha) => misionesPorDia[aYMD(fecha)] || []
  const pendientesDelDia = (fecha) => misionesDelDia(fecha).filter((m) => !m.cumplida)

  const conteosPorGrupo = (fecha) => {
    const pendientes = pendientesDelDia(fecha)
    const conteos = {}
    pendientes.forEach((m) => {
      conteos[m.grupo] = (conteos[m.grupo] || 0) + 1
    })
    return conteos
  }

  // -- Marcar cumplida desde el modal de día -----------------------------------
  const toggleCumplida = async (mision) => {
    const ahora = mision.cumplida ? null : new Date().toISOString()
    const { error } = await supabase.from(mision.tabla).update({ completado_at: ahora }).eq('id', mision.idOriginal)
    if (error) {
      alert('No se pudo actualizar: ' + error.message)
      return
    }
    cargar()
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg }}>
      <header className="px-5 pt-8 pb-6 rounded-b-3xl" style={{ backgroundColor: C.navy }}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium" style={{ color: C.orange }}>{esDirector ? 'Panel de Nico' : 'Mi semana'}</p>
            <h1 className="text-2xl font-bold text-white mt-0.5">Hoja de Ruta</h1>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setModalEntregasAbierto(true)}
              className="text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap flex items-center gap-1.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFFFFF' }}
            >
              <IconTruck size={13} />
              Entregas
            </button>
            <button
              onClick={() => setModalMisionAbierto(true)}
              className="text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap flex items-center gap-1.5"
              style={{ backgroundColor: C.orange, color: '#412402' }}
            >
              <IconPlus size={13} />
              Misión
            </button>
          </div>
        </div>
      </header>

      <CrearMisionModal abierto={modalMisionAbierto} onClose={() => setModalMisionAbierto(false)} onCreada={cargar} />

      {modalEntregasAbierto && (
        <EntregasProgramadas
          asesoresVisibles={asesoresVisibles}
          asesores={asesores}
          esDirector={esDirector}
          profile={profile}
          onClose={() => setModalEntregasAbierto(false)}
        />
      )}

      <main className="px-4 -mt-2 space-y-4">
        {/* Controles: vista, navegación, filtro de asesor */}
        <div className="rounded-2xl p-3 space-y-3" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
          <div className="flex items-center justify-between">
            <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: '#F4F4F2' }}>
              <button
                onClick={() => setVista('mes')}
                className="text-xs font-medium px-3 py-1.5 rounded-md"
                style={vista === 'mes' ? { backgroundColor: C.card, color: C.navy } : { color: C.textSecondary }}
              >
                Mes
              </button>
              <button
                onClick={() => {
                  setVista('semana')
                  setCursor(new Date())
                }}
                className="text-xs font-medium px-3 py-1.5 rounded-md"
                style={vista === 'semana' ? { backgroundColor: C.card, color: C.navy } : { color: C.textSecondary }}
              >
                Semana
              </button>
            </div>
            <button onClick={irHoy} className="text-xs font-medium" style={{ color: C.navy }}>
              Hoy
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={irAnterior} className="p-1" style={{ color: C.textMuted }}>
              <IconChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold capitalize" style={{ color: C.textPrimary }}>
              {vista === 'mes' ? mesVisible : `Semana del ${rango.inicio.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`}
            </p>
            <button onClick={irSiguiente} className="p-1" style={{ color: C.textMuted }}>
              <IconChevronRight size={18} />
            </button>
          </div>

          {esDirector && (
            <select
              value={asesorFiltro}
              onChange={(e) => setAsesorFiltro(e.target.value)}
              className="w-full rounded-lg px-2 py-1.5 text-xs bg-white"
              style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
            >
              <option value="todos">Todos los asesores</option>
              {asesores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.full_name || a.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Leyenda de colores */}
        <div className="flex flex-wrap gap-2 px-1">
          {Object.entries(GRUPOS).map(([key, g]) => (
            <span key={key} className="flex items-center gap-1 text-[10px]" style={{ color: C.textSecondary }}>
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.hex }} />
              {g.label}
            </span>
          ))}
          <span className="flex items-center gap-1 text-[10px]" style={{ color: C.textSecondary }}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#FCEBEB', border: '1px solid #F5C6C6' }} />
            Pico y placa
          </span>
        </div>

        {/* Cuadrícula */}
        <div className="rounded-2xl p-2" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
          <div className="grid grid-cols-7 text-center text-[10px] font-semibold mb-1" style={{ color: C.textMuted }}>
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {cargando ? (
            <p className="text-center text-xs py-10" style={{ color: C.textMuted }}>Cargando misiones...</p>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {celdas.map((dia) => {
                const enMesActual = vista === 'semana' || dia.getMonth() === cursor.getMonth()
                const esHoy = aYMD(dia) === hoyStr
                const conteos = conteosPorGrupo(dia)
                const totalPendientes = Object.values(conteos).reduce((a, b) => a + b, 0)
                const notaPico = diasPicoPlaca[aYMD(dia)]

                return (
                  <button
                    key={aYMD(dia)}
                    onClick={() => setDiaSeleccionado(dia)}
                    title={notaPico ? `Pico y placa: ${notaPico}` : undefined}
                    className={`relative rounded-lg p-1.5 text-left transition ${vista === 'semana' ? 'min-h-[110px]' : 'min-h-[64px]'} ${enMesActual ? '' : 'opacity-30'}`}
                    style={{
                      backgroundColor: notaPico ? '#FCEBEB' : esHoy ? '#FDF1DD' : 'transparent',
                      border: esHoy ? `1px solid ${C.orange}` : '1px solid transparent',
                    }}
                  >
                    {notaPico && <IconBan size={10} style={{ position: 'absolute', top: 4, right: 4, color: '#A32D2D' }} />}
                    <p className="text-[11px] font-semibold" style={{ color: esHoy ? C.navy : C.textSecondary }}>{dia.getDate()}</p>
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {Object.entries(conteos).map(([grupo, n]) => (
                        <span
                          key={grupo}
                          className="text-[9px] leading-none text-white rounded-full px-1.5 py-0.5"
                          style={{ backgroundColor: GRUPOS[grupo].hex }}
                        >
                          {n}
                        </span>
                      ))}
                    </div>
                    {totalPendientes === 0 && vista === 'semana' && (
                      <p className="text-[10px] mt-2" style={{ color: C.textMuted }}>Sin misiones</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de detalle del día */}
      {diaSeleccionado && (
        <DiaDetalleModal
          fecha={diaSeleccionado}
          misiones={misionesDelDia(diaSeleccionado)}
          esDirector={esDirector}
          profile={profile}
          nombreAsesorId={nombreAsesorId}
          onClose={() => setDiaSeleccionado(null)}
          onToggleCumplida={toggleCumplida}
          onReprogramada={cargar}
          onMisionEliminada={cargar}
        />
      )}
    </div>
  )
}

function DiaDetalleModal({ fecha, misiones, esDirector, profile, nombreAsesorId, onClose, onToggleCumplida, onReprogramada, onMisionEliminada }) {
  const [expandidoId, setExpandidoId] = useState(null)
  const [extra, setExtra] = useState({}) // { [misionId]: { telefono, nombreContacto, estadoLead, tareaCompletable, cargando } }
  const [mensajes, setMensajes] = useState([])
  const [copiadoId, setCopiadoId] = useState(null)
  const [reprogramando, setReprogramando] = useState(null)
  const [eliminandoMision, setEliminandoMision] = useState(null)

  // Estado "venta perdida" pendiente de motivo — reemplaza al viejo
  // window.prompt(), que no funciona en la PWA instalada (iOS/Android lo
  // bloquean o lo ignoran silenciosamente). Mientras el motivo no se
  // confirme, el cambio de estado no se guarda en la base de datos.
  const [motivoPendiente, setMotivoPendiente] = useState({}) // { [misionId]: { estadoAnterior, texto } }
  const [guardandoMotivo, setGuardandoMotivo] = useState(null)

  // Fecha propuesta al reprogramar una misión manual desde su tarjeta.
  const [fechaReprogramar, setFechaReprogramar] = useState({}) // { [misionId]: 'YYYY-MM-DD' }

  const esteDiaEsDomingo = esDomingo(aYMD(fecha))

  const reprogramarDesdeDomingo = async (mision, nuevaFecha) => {
    setReprogramando(mision.id)
    const { error } = await supabase
      .from('automated_tasks')
      .update({ fecha_programada: aYMD(nuevaFecha) })
      .eq('id', mision.idOriginal)
    setReprogramando(null)
    if (error) {
      alert('No se pudo reprogramar: ' + error.message)
      return
    }
    onReprogramada?.()
    onClose()
  }

  // Reprogramar una misión manual a cualquier otra fecha, desde su propia
  // tarjeta en la Hoja de Ruta. Disponible para el asesor asignado y el
  // director (mismo criterio que "marcar cumplida").
  const reprogramarManual = async (mision, nuevaFechaStr) => {
    if (!nuevaFechaStr) return
    setReprogramando(mision.id)
    const { error } = await supabase
      .from('manual_tasks')
      .update({ fecha_programada: nuevaFechaStr })
      .eq('id', mision.idOriginal)
    setReprogramando(null)
    if (error) {
      alert('No se pudo reprogramar la misión: ' + error.message)
      return
    }
    onReprogramada?.()
    onClose()
  }

  const puedeReprogramar = (mision) => esDirector || mision.asesor_id === profile?.id

  useEffect(() => {
    supabase
      .from('message_templates')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })
      .then(({ data }) => setMensajes(data || []))
  }, [])

  const ordenadas = [...misiones].sort((a, b) => {
    if (a.hora && b.hora) return a.hora.localeCompare(b.hora)
    if (a.hora) return -1
    if (b.hora) return 1
    return 0
  })

  // Para el director: agrupar las misiones del día por asesor, mostrando
  // primero todas las misiones de un asesor, luego las del siguiente, en
  // orden alfabético por nombre — con un pequeño título por grupo. Para el
  // asesor normal se mantiene un solo grupo sin título (comportamiento
  // anterior, sin cambios visuales).
  const grupos = esDirector
    ? Object.values(
        ordenadas.reduce((acc, m) => {
          const clave = m.asesor_id || 'sin_asesor'
          if (!acc[clave]) {
            acc[clave] = { asesorId: clave, nombre: nombreAsesorId(m.asesor_id) || 'Sin asesor', items: [] }
          }
          acc[clave].items.push(m)
          return acc
        }, {})
      ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    : [{ asesorId: null, nombre: null, items: ordenadas }]

  const copiarMensaje = async (m) => {
    try {
      await navigator.clipboard.writeText(m.contenido || '')
      setCopiadoId(m.id)
      setTimeout(() => setCopiadoId(null), 1500)
    } catch {
      alert('No se pudo copiar automáticamente. Aquí está el mensaje:\n\n' + m.contenido)
    }
  }

  const abrirDetalle = async (mision) => {
    if (expandidoId === mision.id) {
      setExpandidoId(null)
      return
    }
    setExpandidoId(mision.id)
    if (extra[mision.id]) return // ya cargado

    setExtra((prev) => ({ ...prev, [mision.id]: { cargando: true } }))

    let contacto = null
    let estadoLead = null
    // "Prospección de asesor" ahora se completa marcando directamente el
    // lead (columna leads.completado_at) — igual que las misiones auto/
    // manuales se completan marcando su propia fila.
    let tareaCompletable = { tabla: mision.tabla, id: mision.idOriginal, cumplida: mision.cumplida }

    if (mision.lead_id) {
      const { data: lead } = await supabase
        .from('leads')
        .select('telefono, telefono_2, nombre_contacto, empresa, estado')
        .eq('id', mision.lead_id)
        .single()
      if (lead) {
        contacto = { telefono: lead.telefono, telefono_2: lead.telefono_2, nombre: lead.nombre_contacto, empresa: lead.empresa }
        estadoLead = lead.estado
      }
    } else if (mision.client_id) {
      const { data: cliente } = await supabase
        .from('clients')
        .select('telefono, nombre_contacto, empresa')
        .eq('id', mision.client_id)
        .single()
      if (cliente) contacto = { telefono: cliente.telefono, nombre: cliente.nombre_contacto, empresa: cliente.empresa }
    }

    setExtra((prev) => ({
      ...prev,
      [mision.id]: { cargando: false, contacto, estadoLead, leadId: mision.lead_id, tareaCompletable },
    }))
  }

  const cambiarEstadoLead = async (misionId, leadId, nuevoEstado) => {
    if (nuevoEstado === 'venta_perdida') {
      // No se guarda todavía: se muestra un campo en pantalla para escribir
      // el motivo (obligatorio) y se confirma con el botón "Guardar motivo".
      const estadoAnterior = extra[misionId]?.estadoLead
      setMotivoPendiente((prev) => ({ ...prev, [misionId]: { estadoAnterior, texto: '' } }))
      setExtra((prev) => ({ ...prev, [misionId]: { ...prev[misionId], estadoLead: nuevoEstado } }))
      return
    }
    const { error } = await supabase.from('leads').update({ estado: nuevoEstado }).eq('id', leadId)
    if (error) return alert('No se pudo actualizar: ' + error.message)
    setExtra((prev) => ({ ...prev, [misionId]: { ...prev[misionId], estadoLead: nuevoEstado } }))
  }

  const cancelarMotivoPendiente = (misionId) => {
    const pendiente = motivoPendiente[misionId]
    setExtra((prev) => ({ ...prev, [misionId]: { ...prev[misionId], estadoLead: pendiente?.estadoAnterior ?? prev[misionId]?.estadoLead } }))
    setMotivoPendiente((prev) => {
      const siguiente = { ...prev }
      delete siguiente[misionId]
      return siguiente
    })
  }

  const guardarMotivoPerdida = async (misionId, leadId) => {
    const texto = (motivoPendiente[misionId]?.texto || '').trim()
    if (!texto) {
      alert('El motivo de la venta perdida es obligatorio.')
      return
    }
    setGuardandoMotivo(misionId)
    const { error } = await supabase
      .from('leads')
      .update({ estado: 'venta_perdida', motivo_perdida: texto })
      .eq('id', leadId)
    setGuardandoMotivo(null)
    if (error) {
      alert('No se pudo actualizar: ' + error.message)
      return
    }
    setMotivoPendiente((prev) => {
      const siguiente = { ...prev }
      delete siguiente[misionId]
      return siguiente
    })
  }

  // Solo se pueden eliminar misiones creadas manualmente (tabla manual_tasks)
  // — las automáticas las genera el sistema y no se deben borrar a mano.
  const eliminarMision = async (mision) => {
    const ok = window.confirm(`¿Eliminar la misión "${mision.titulo}"? Esta acción no se puede deshacer.`)
    if (!ok) return

    setEliminandoMision(mision.id)
    const { error } = await supabase.from('manual_tasks').delete().eq('id', mision.idOriginal)
    setEliminandoMision(null)

    if (error) {
      alert('No se pudo eliminar la misión: ' + error.message)
      return
    }
    onMisionEliminada?.()
    onClose()
  }

  const completarTarea = async (misionId, tarea) => {
    const ahora = tarea.cumplida ? null : new Date().toISOString()
    const { error } = await supabase.from(tarea.tabla).update({ completado_at: ahora }).eq('id', tarea.id)
    if (error) return alert('No se pudo actualizar: ' + error.message)
    setExtra((prev) => ({ ...prev, [misionId]: { ...prev[misionId], tareaCompletable: { ...tarea, cumplida: !tarea.cumplida } } }))
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[85vh] overflow-y-auto p-4" style={{ backgroundColor: C.card }}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-bold capitalize" style={{ color: C.textPrimary }}>
            {fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h2>
          <button onClick={onClose} style={{ color: C.textMuted }}>
            <IconX size={20} />
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: C.textMuted }}>
          {ordenadas.length} misión{ordenadas.length !== 1 ? 'es' : ''} ·{' '}
          {ordenadas.filter((m) => !m.cumplida).length} pendiente{ordenadas.filter((m) => !m.cumplida).length !== 1 ? 's' : ''}
        </p>

        {ordenadas.length === 0 && <p className="text-sm py-6 text-center" style={{ color: C.textMuted }}>Sin misiones este día.</p>}

        {/* Línea de tiempo: círculo de color por grupo conectado por una línea
            vertical, con hora, título y contacto a la derecha del círculo.
            Como director, las misiones se agrupan por asesor (grupos[]),
            cada uno con su propio título y su propia línea vertical. */}
        {grupos.map((grupo) => (
          <div key={grupo.asesorId ?? 'todos'} className="mb-4 last:mb-0">
            {esDirector && grupo.nombre && (
              <p className="text-[11px] font-bold uppercase tracking-wide mb-2 px-1" style={{ color: C.textMuted }}>
                {grupo.nombre}
              </p>
            )}
            <div className="relative">
              {grupo.items.length > 1 && (
                <div
                  className="absolute top-2 bottom-2 w-0.5"
                  style={{ left: 16, backgroundColor: '#EDEDE7' }}
                />
              )}

              {grupo.items.map((m, idx) => {
                const abierto = expandidoId === m.id
                const datos = extra[m.id]
                const simple = esMisionSimple(m)
                const urgente = esMisionUrgente(m) && !m.cumplida
                const esUltimo = idx === grupo.items.length - 1
                const pendienteMotivo = motivoPendiente[m.id]

                return (
              <div key={m.id} className="relative flex gap-3" style={{ paddingBottom: esUltimo ? 0 : 20 }}>
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 relative z-10"
                  style={{ backgroundColor: GRUPOS[m.grupo].hex, opacity: m.cumplida ? 0.55 : 1 }}
                >
                  {m.cumplida ? (
                    <IconCheck size={15} style={{ color: '#FFFFFF' }} />
                  ) : (
                    <IconGrupo grupo={m.grupo} size={15} style={{ color: m.grupo === 'gestion' ? '#412402' : '#FFFFFF' }} />
                  )}
                </span>

                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-start justify-between gap-2 cursor-pointer" onClick={() => abrirDetalle(m)}>
                    <div className="min-w-0" style={{ opacity: m.cumplida ? 0.55 : 1 }}>
                      <p className="text-[11px]" style={{ color: C.textMuted }}>{m.hora ? m.hora.slice(0, 5) : 'Sin hora'}</p>
                      <p
                        className="text-sm font-semibold mt-0.5"
                        style={{ color: C.textPrimary, textDecoration: m.cumplida ? 'line-through' : 'none' }}
                      >
                        {m.titulo}
                      </p>
                      {m.cliente && <p className="text-xs mt-0.5 truncate" style={{ color: C.textSecondary }}>{m.cliente}</p>}
                      {m.empresa && <p className="text-[11px] truncate" style={{ color: C.textMuted }}>{m.empresa}</p>}
                      <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                        {GRUPOS[m.grupo].label}
                        {esDirector ? ` · ${nombreAsesorId(m.asesor_id)}` : ''}
                      </p>
                    </div>
                    {urgente && (
                      <span
                        className="shrink-0 text-[9px] font-semibold px-2 py-1 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: '#FCEBEB', color: '#A32D2D' }}
                      >
                        Inmediato
                      </span>
                    )}
                  </div>

                  {abierto && (
                    <div className="mt-3 rounded-xl p-3 space-y-3" style={{ backgroundColor: '#F4F4F2' }}>
                      {datos?.cargando && <p className="text-xs" style={{ color: C.textMuted }}>Cargando...</p>}

                      {/* Estado del lead: editable, con color según valor */}
                      {!datos?.cargando && datos?.leadId && (
                        <div>
                          <label className="text-[11px] block mb-1" style={{ color: C.textSecondary }}>Estado del lead</label>
                          <select
                            value={datos.estadoLead || ''}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => cambiarEstadoLead(m.id, datos.leadId, e.target.value)}
                            className="w-full rounded-lg px-2 py-1.5 text-xs font-medium"
                            style={{
                              border: `0.5px solid ${C.border}`,
                              backgroundColor: ESTADO_COLOR[datos.estadoLead]?.bg || '#FFFFFF',
                              color: ESTADO_COLOR[datos.estadoLead]?.text || C.textSecondary,
                            }}
                          >
                            <option value="" disabled>
                              Selecciona...
                            </option>
                            {ESTADOS_RAPIDOS.map((s) => (
                              <option key={s.value} value={s.value}>
                                {s.label}
                              </option>
                            ))}
                            {datos.estadoLead === 'venta_hecha' && <option value="venta_hecha">Venta hecha</option>}
                          </select>

                          {/* Motivo de venta perdida — reemplaza el viejo prompt() nativo,
                              que no funciona en la PWA instalada. El estado no se guarda
                              hasta confirmar el motivo. */}
                          {pendienteMotivo && (
                            <div
                              className="mt-2 rounded-lg p-2.5 space-y-2"
                              style={{ backgroundColor: '#FCEBEB', border: '0.5px solid #F5C6C6' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <p className="text-[11px] font-medium" style={{ color: '#A32D2D' }}>
                                Motivo de la venta perdida (obligatorio)
                              </p>
                              <textarea
                                autoFocus
                                value={pendienteMotivo.texto}
                                onChange={(e) =>
                                  setMotivoPendiente((prev) => ({ ...prev, [m.id]: { ...prev[m.id], texto: e.target.value } }))
                                }
                                rows={2}
                                className="w-full rounded-lg px-2 py-1.5 text-xs bg-white"
                                style={{ border: '0.5px solid #F5C6C6', color: C.textPrimary }}
                                placeholder="Ej: precio, se fue con la competencia, ya no lo necesita..."
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => cancelarMotivoPendiente(m.id)}
                                  className="flex-1 text-[11px] font-medium py-1.5 rounded-lg"
                                  style={{ backgroundColor: '#FFFFFF', color: C.textSecondary, border: `0.5px solid ${C.border}` }}
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => guardarMotivoPerdida(m.id, datos.leadId)}
                                  disabled={guardandoMotivo === m.id}
                                  className="flex-1 text-[11px] font-medium py-1.5 rounded-lg disabled:opacity-60"
                                  style={{ backgroundColor: '#A32D2D', color: '#FFFFFF' }}
                                >
                                  {guardandoMotivo === m.id ? 'Guardando...' : 'Guardar motivo'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Mensajes predeterminados: solo en misiones completas */}
                      {!datos?.cargando && !simple && mensajes.length > 0 && (
                        <div>
                          <p className="text-[11px] mb-1 flex items-center gap-1" style={{ color: C.textSecondary }}>
                            <IconMessage size={11} />
                            Mensajes predeterminados
                          </p>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {mensajes.map((msg) => (
                              <div
                                key={msg.id}
                                className="flex items-center justify-between gap-2 rounded-lg p-1.5"
                                style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
                              >
                                <p className="text-[11px] truncate" style={{ color: C.textSecondary }}>{msg.titulo || msg.clave}</p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    copiarMensaje(msg)
                                  }}
                                  className="shrink-0 text-[10px] font-medium px-2 py-1 rounded-md"
                                  style={{ backgroundColor: '#EEEDFE', color: '#3C3489' }}
                                >
                                  {copiadoId === msg.id ? 'Copiado ✓' : 'Copiar'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!datos?.cargando && esteDiaEsDomingo && m.tabla === 'automated_tasks' && !m.cumplida && (
                        <div className="rounded-lg p-2.5" style={{ backgroundColor: '#FAEEDA', border: '0.5px solid #F0D9AE' }}>
                          <p className="text-[11px] mb-2" style={{ color: '#854F0B' }}>
                            Esta misión cae un día domingo. ¿La programamos para otro día?
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(() => {
                              const { viernes, sabado, lunes } = domingoDeLaSemana(aYMD(fecha))
                              const opciones = [
                                { label: 'Viernes', valor: viernes },
                                { label: 'Sábado', valor: sabado },
                                { label: 'Lunes', valor: lunes },
                              ]
                              return opciones.map((o) => (
                                <button
                                  key={o.label}
                                  disabled={reprogramando === m.id}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    reprogramarDesdeDomingo(m, o.valor)
                                  }}
                                  className="text-[11px] font-medium rounded-md py-1.5 disabled:opacity-50"
                                  style={{ backgroundColor: C.card, border: '0.5px solid #F0D9AE', color: '#854F0B' }}
                                >
                                  {o.label}
                                </button>
                              ))
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Reprogramar misión manual a otra fecha — visible para el
                          asesor asignado y para el director. */}
                      {!datos?.cargando && m.tabla === 'manual_tasks' && puedeReprogramar(m) && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <label className="text-[11px] flex items-center gap-1 mb-1" style={{ color: C.textSecondary }}>
                            <IconCalendar size={11} />
                            Cambiar fecha de esta misión
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={fechaReprogramar[m.id] ?? aYMD(fecha)}
                              onChange={(e) => setFechaReprogramar((prev) => ({ ...prev, [m.id]: e.target.value }))}
                              className="flex-1 rounded-lg px-2 py-1.5 text-xs bg-white"
                              style={{ border: `0.5px solid ${C.border}`, color: C.textPrimary }}
                            />
                            <button
                              disabled={reprogramando === m.id}
                              onClick={() => reprogramarManual(m, fechaReprogramar[m.id] || aYMD(fecha))}
                              className="text-[11px] font-medium px-3 py-1.5 rounded-lg disabled:opacity-60"
                              style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                            >
                              {reprogramando === m.id ? 'Moviendo...' : 'Mover'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Botones inferiores: simples = solo completada (ancho completo);
                          completas = WhatsApp + Completada, 50/50 */}
                      {!datos?.cargando && datos?.tareaCompletable && (
                        simple ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              completarTarea(m.id, datos.tareaCompletable)
                            }}
                            className="w-full text-xs font-medium py-2 rounded-lg"
                            style={
                              datos.tareaCompletable.cumplida
                                ? { backgroundColor: '#EDEDE7', color: C.textSecondary }
                                : { backgroundColor: '#1D9E75', color: '#FFFFFF' }
                            }
                          >
                            {datos.tareaCompletable.cumplida ? 'Marcada como completada (click para revertir)' : 'Marcar misión completada'}
                          </button>
                        ) : (
                          <div className="flex gap-2">
                            {datos?.contacto?.telefono && waLink(datos.contacto.telefono) && (
                              <a
                                href={waLink(datos.contacto.telefono)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-center rounded-lg text-xs font-medium py-2 flex items-center justify-center gap-1"
                                style={{ backgroundColor: '#1D9E75', color: '#FFFFFF' }}
                              >
                                <IconMessage size={12} />
                                WhatsApp
                              </a>
                            )}
                            {datos?.contacto?.telefono_2 && waLink(datos.contacto.telefono_2) && (
                              <a
                                href={waLink(datos.contacto.telefono_2)}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-center rounded-lg text-xs font-medium py-2 flex items-center justify-center gap-1"
                                style={{ backgroundColor: '#0F6E56', color: '#FFFFFF' }}
                              >
                                <IconMessage size={12} />
                                WhatsApp 2
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                completarTarea(m.id, datos.tareaCompletable)
                              }}
                              className="flex-1 text-xs font-medium py-2 rounded-lg"
                              style={
                                datos.tareaCompletable.cumplida
                                  ? { backgroundColor: '#EDEDE7', color: C.textSecondary }
                                  : { backgroundColor: C.navy, color: '#FFFFFF' }
                              }
                            >
                              {datos.tareaCompletable.cumplida ? 'Completada ✓' : 'Completada'}
                            </button>
                          </div>
                        )
                      )}

                      {/* Eliminar misión: solo el director, y solo para
                          misiones creadas manualmente (no automáticas). */}
                      {esDirector && m.tabla === 'manual_tasks' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            eliminarMision(m)
                          }}
                          disabled={eliminandoMision === m.id}
                          className="w-full text-xs font-medium py-2 rounded-lg disabled:opacity-60"
                          style={{ border: '1px solid #F5C6C6', color: '#A32D2D', backgroundColor: '#FCEBEB' }}
                        >
                          {eliminandoMision === m.id ? 'Eliminando...' : 'Eliminar misión'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
