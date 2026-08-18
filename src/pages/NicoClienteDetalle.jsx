import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

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

const ORIGEN_LABEL = {
  prospeccion_asesor: 'Prospección asesor',
  llamada_entrante: 'Llamada entrante',
  otro: 'Otro',
}

const ESTADOS_ENTREGA = [
  { value: 'en_produccion', label: 'En producción', bg: '#FAEEDA', text: '#854F0B' },
  { value: 'entregado', label: 'Entregado', bg: '#E1F5EE', text: '#085041' },
]

const TIPO_TAREA_LABELS = {
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

function estadoInfo(estado) {
  return ESTADOS_ENTREGA.find((e) => e.value === estado) || { label: 'Sin estado', bg: '#EDEDE7', text: '#888780' }
}

const ESTADO_COTIZACION_INFO = {
  cotizacion_enviada: { label: 'Cotización enviada', bg: '#E6F1FB', text: '#0C447C' },
  pendiente: { label: 'Pendiente', bg: '#FAEEDA', text: '#854F0B' },
  venta_hecha: { label: 'Venta hecha', bg: '#E1F5EE', text: '#085041' },
  rechazada: { label: 'Rechazada', bg: '#FCEBEB', text: '#A32D2D' },
}

function estadoCotizacionInfo(estado) {
  return ESTADO_COTIZACION_INFO[estado] || { label: estado, bg: '#EDEDE7', text: '#888780' }
}

function soloNumeros(telefono) {
  return (telefono || '').replace(/\D/g, '')
}

function nombreAsesor(asesores, id) {
  const a = (asesores || []).find((x) => x.id === id)
  if (!a) return '—'
  return a.full_name || a.nombre || '—'
}

// Iniciales del asesor calculadas al vuelo desde el nombre completo — no se
// guarda ningún campo nuevo. Ej: "Juan Pérez Gómez" -> "JP"
function iniciales(nombreCompleto) {
  if (!nombreCompleto || nombreCompleto === '—') return '—'
  const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean)
  return partes.slice(0, 2).map((p) => p[0].toUpperCase()).join('')
}

function waLink(telefono) {
  const numeros = soloNumeros(telefono)
  if (!numeros) return null
  const conPrefijo = numeros.startsWith('57') ? numeros : `57${numeros}`
  return `https://wa.me/${conPrefijo}`
}

function fmtFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleDateString('es-CO')
}

const PEDIDO_VACIO = { numero_pedido: '', valor_sin_iva: '', valor_con_iva: '', fecha_entrega: '', ubicacion_entrega: '' }

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
const IconArrowLeft = (props) => (
  <IconBase {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </IconBase>
)
const IconMessage = (props) => (
  <IconBase {...props}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
  </IconBase>
)
const IconMapPin = (props) => (
  <IconBase {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </IconBase>
)
const IconMail = (props) => (
  <IconBase {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m2 7 10 6 10-6" />
  </IconBase>
)
const IconPhone = (props) => (
  <IconBase {...props}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2Z" />
  </IconBase>
)
const IconTag = (props) => (
  <IconBase {...props}>
    <path d="M12.6 2H4a2 2 0 0 0-2 2v8.6a2 2 0 0 0 .6 1.4l9 9a2 2 0 0 0 2.8 0l7.6-7.6a2 2 0 0 0 0-2.8l-9-9A2 2 0 0 0 12.6 2Z" />
    <circle cx="7.5" cy="7.5" r="1" />
  </IconBase>
)
const IconEdit = (props) => (
  <IconBase {...props}>
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
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
const IconPackage = (props) => (
  <IconBase {...props}>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </IconBase>
)
const IconAlertTriangle = (props) => (
  <IconBase {...props}>
    <path d="m21.7 18-8.6-15a2 2 0 0 0-3.5 0l-8.6 15A2 2 0 0 0 2.7 21h18.6a2 2 0 0 0 1.7-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </IconBase>
)
const IconPlus = (props) => (
  <IconBase {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </IconBase>
)
const IconClipboard = (props) => (
  <IconBase {...props}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" />
    <line x1="8" y1="11" x2="16" y2="11" />
    <line x1="8" y1="15" x2="16" y2="15" />
  </IconBase>
)
const IconHistory = (props) => (
  <IconBase {...props}>
    <path d="M3 12a9 9 0 1 0 2.6-6.3" />
    <polyline points="3 5 3 12 8 12" />
    <polyline points="12 8 12 12 15 14" />
  </IconBase>
)
const IconDollar = (props) => (
  <IconBase {...props}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5S9.2 9 12 9s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" />
  </IconBase>
)
const IconBox = (props) => (
  <IconBase {...props}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
  </IconBase>
)

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm bg-white focus:outline-none'
const inputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary }
const smallInputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary, borderRadius: 8 }

export default function NicoClienteDetalle() {
  const { id } = useParams()
  const { profile } = useAuth()
  const esDirector = profile?.rol === 'director' || profile?.role === 'director'

  const [cliente, setCliente] = useState(null)
  const [asesores, setAsesores] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [opsPorPedido, setOpsPorPedido] = useState({})
  const [misiones, setMisiones] = useState([])
  const [misionesLead, setMisionesLead] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [editandoIdentidad, setEditandoIdentidad] = useState(false)
  const [formIdentidad, setFormIdentidad] = useState({ nombre_contacto: '', empresa: '' })
  const [guardandoIdentidad, setGuardandoIdentidad] = useState(false)
  const [identidadMsg, setIdentidadMsg] = useState(null)

  const [editandoContacto, setEditandoContacto] = useState(false)
  const [formContacto, setFormContacto] = useState({ telefono: '', correo: '', ciudad: '' })
  const [guardandoContacto, setGuardandoContacto] = useState(false)
  const [contactoMsg, setContactoMsg] = useState(null)

  const [nuevoPedido, setNuevoPedido] = useState(PEDIDO_VACIO)
  const [creandoPedido, setCreandoPedido] = useState(false)
  const [pedidoMsg, setPedidoMsg] = useState(null)
  const [ivaPorcentaje, setIvaPorcentaje] = useState(19)

  const [nuevaOp, setNuevaOp] = useState({})

  const [bodegajePorPedido, setBodegajePorPedido] = useState({})
  const [formBodegajeAbierto, setFormBodegajeAbierto] = useState(null)
  const [formBodegaje, setFormBodegaje] = useState({ valor_dia: '', detalle: '' })
  const [guardandoBodegaje, setGuardandoBodegaje] = useState(false)
  const [tarjetaAbierta, setTarjetaAbierta] = useState(null)

  const [cotizaciones, setCotizaciones] = useState([])
  const [cotizacionMsg, setCotizacionMsg] = useState(null)
  const [procesandoCotizacionId, setProcesandoCotizacionId] = useState(null)
  const [pidiendoFechaPara, setPidiendoFechaPara] = useState(null)
  const [fechaEntregaVenta, setFechaEntregaVenta] = useState('')

  const cargarTodo = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [clienteRes, asesoresRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('profiles').select('id, full_name, nombre').eq('rol', 'asesor').eq('active', true),
    ])

    if (clienteRes.error) {
      setError(clienteRes.error.message)
      setLoading(false)
      return
    }

    setCliente(clienteRes.data)
    if (!asesoresRes.error) setAsesores(asesoresRes.data || [])

    const [pedidosRes, autoRes, manualClienteRes, cotizacionesRes] = await Promise.all([
      supabase.from('order_ops').select('*').eq('client_id', id).order('created_at', { ascending: false }),
      supabase.from('automated_tasks').select('*').eq('client_id', id).order('fecha_programada', { ascending: true }),
      supabase.from('manual_tasks').select('*').eq('client_id', id).order('fecha_programada', { ascending: true }),
      supabase.from('cotizaciones_clientes').select('*').eq('client_id', id).order('created_at', { ascending: false }),
    ])

    if (pedidosRes.error) {
      setError(pedidosRes.error.message)
      setLoading(false)
      return
    }

    setPedidos(pedidosRes.data || [])
    setCotizaciones(cotizacionesRes.data || [])

    const pedidoIds = (pedidosRes.data || []).map((p) => p.id)
    const ubicacionPorPedido = Object.fromEntries((pedidosRes.data || []).map((p) => [p.id, p.ubicacion_entrega]))
    const ubicacionPorCotizacion = Object.fromEntries(
      (cotizacionesRes.data || []).map((c) => [c.id, c.ubicacion])
    )

    if (pedidoIds.length > 0) {
      const { data: ops } = await supabase.from('pedido_ops').select('*').in('order_op_id', pedidoIds)
      const agrupadas = (ops || []).reduce((acc, o) => {
        acc[o.order_op_id] = acc[o.order_op_id] || []
        acc[o.order_op_id].push(o)
        return acc
      }, {})
      setOpsPorPedido(agrupadas)

      const { data: bodegajes } = await supabase.from('bodegaje').select('*').in('order_op_id', pedidoIds)
      const bodegajeMap = (bodegajes || []).reduce((acc, b) => {
        acc[b.order_op_id] = b
        return acc
      }, {})
      setBodegajePorPedido(bodegajeMap)
    } else {
      setOpsPorPedido({})
      setBodegajePorPedido({})
    }

    // Punto 5: cada misión debe traer nombre/empresa del cliente, ubicación
    // (la del pedido si la misión está ligada a uno vía op_id, la de la
    // cotización si viene de una "Recontactar", o si no, el "lugar" manual
    // o la ciudad del cliente) e iniciales del asesor.
    const enriquecerMision = (t) => ({
      nombreContacto: clienteRes.data.nombre_contacto || null,
      empresa: clienteRes.data.empresa || null,
      ubicacion:
        (t.op_id && ubicacionPorPedido[t.op_id]) ||
        (t.cotizacion_id && ubicacionPorCotizacion[t.cotizacion_id]) ||
        t.lugar ||
        clienteRes.data.ciudad ||
        null,
      iniciales: iniciales(nombreAsesor(asesoresRes.data, t.asesor_id || clienteRes.data.asesor_id)),
    })

    const auto = (autoRes.data || []).map((t) => ({
      ...t,
      origenTarea: 'auto',
      titulo: TIPO_TAREA_LABELS[t.tipo] || t.tipo,
      detalle: t.mensaje_sugerido,
      ...enriquecerMision(t),
    }))
    const manualCliente = (manualClienteRes.data || []).map((t) => ({
      ...t,
      origenTarea: 'manual',
      titulo: t.titulo,
      detalle: t.descripcion,
      ...enriquecerMision(t),
    }))
    setMisiones([...auto, ...manualCliente])

    // Historial de cuando era lead (contexto, no se edita desde aquí)
    if (clienteRes.data.lead_id) {
      const [{ data: autoLead }, { data: manualLead }] = await Promise.all([
        supabase.from('automated_tasks').select('*').eq('lead_id', clienteRes.data.lead_id),
        supabase.from('manual_tasks').select('*').eq('lead_id', clienteRes.data.lead_id),
      ])
      const combinadas = [
        ...(autoLead || []).map((t) => ({ ...t, origenTarea: 'auto', titulo: TIPO_TAREA_LABELS[t.tipo] || t.tipo, detalle: t.mensaje_sugerido })),
        ...(manualLead || []).map((t) => ({ ...t, origenTarea: 'manual', titulo: t.titulo, detalle: t.descripcion })),
      ]
      setMisionesLead(combinadas)
    } else {
      setMisionesLead([])
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    cargarTodo()
    supabase
      .from('configuracion_general')
      .select('iva_porcentaje')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) setIvaPorcentaje(Number(data.iva_porcentaje))
      })
  }, [cargarTodo])

  const empezarEdicionIdentidad = () => {
    setFormIdentidad({
      nombre_contacto: cliente.nombre_contacto || '',
      empresa: cliente.empresa || '',
    })
    setIdentidadMsg(null)
    setEditandoIdentidad(true)
  }

  const cambiarIdentidad = (campo, valor) => setFormIdentidad((prev) => ({ ...prev, [campo]: valor }))

  const guardarIdentidad = async (e) => {
    e.preventDefault()
    setIdentidadMsg(null)

    if (!formIdentidad.nombre_contacto.trim()) {
      setIdentidadMsg({ tipo: 'error', texto: 'El nombre del contacto es obligatorio.' })
      return
    }

    setGuardandoIdentidad(true)
    const { error } = await supabase
      .from('clients')
      .update({
        nombre_contacto: formIdentidad.nombre_contacto.trim(),
        empresa: formIdentidad.empresa.trim() || null,
      })
      .eq('id', id)
    setGuardandoIdentidad(false)

    if (error) {
      setIdentidadMsg({ tipo: 'error', texto: error.message })
    } else {
      setEditandoIdentidad(false)
      cargarTodo()
    }
  }

  const empezarEdicionContacto = () => {
    setFormContacto({
      telefono: cliente.telefono || '',
      correo: cliente.correo || '',
      ciudad: cliente.ciudad || '',
    })
    setContactoMsg(null)
    setEditandoContacto(true)
  }

  const cambiarContacto = (campo, valor) => setFormContacto((prev) => ({ ...prev, [campo]: valor }))

  const guardarContacto = async (e) => {
    e.preventDefault()
    setContactoMsg(null)
    setGuardandoContacto(true)

    const { error } = await supabase
      .from('clients')
      .update({
        telefono: formContacto.telefono.trim(),
        correo: formContacto.correo.trim() || null,
        ciudad: formContacto.ciudad.trim() || null,
      })
      .eq('id', id)

    setGuardandoContacto(false)

    if (error) {
      setContactoMsg({ tipo: 'error', texto: error.message })
    } else {
      setEditandoContacto(false)
      cargarTodo()
    }
  }

  const crearPedido = async (e) => {
    e.preventDefault()
    setPedidoMsg(null)

    if (!nuevoPedido.numero_pedido.trim() || !nuevoPedido.fecha_entrega || !nuevoPedido.valor_sin_iva) {
      setPedidoMsg({ tipo: 'error', texto: 'Número de pedido, fecha de entrega y valor son obligatorios.' })
      return
    }

    setCreandoPedido(true)

    const { error } = await supabase.from('order_ops').insert({
      client_id: id,
      numero_pedido: nuevoPedido.numero_pedido.trim(),
      valor_sin_iva: nuevoPedido.valor_sin_iva === '' ? null : Number(nuevoPedido.valor_sin_iva),
      valor_con_iva: nuevoPedido.valor_con_iva === '' ? null : Number(nuevoPedido.valor_con_iva),
      fecha_entrega: nuevoPedido.fecha_entrega,
      ubicacion_entrega: nuevoPedido.ubicacion_entrega.trim() || null,
      estado: 'en_produccion',
    })

    setCreandoPedido(false)

    if (error) {
      setPedidoMsg({ tipo: 'error', texto: error.message })
    } else {
      setPedidoMsg({ tipo: 'ok', texto: 'Pedido creado. Se programaron sus misiones de entrega.' })
      setNuevoPedido(PEDIDO_VACIO)
      cargarTodo()
    }
  }

  const actualizarPedido = async (pedidoId, cambios) => {
    const { error } = await supabase.from('order_ops').update(cambios).eq('id', pedidoId)
    if (error) {
      alert('No se pudo actualizar el pedido: ' + error.message)
      return
    }
    cargarTodo()
  }

  // Número de cotización editable — tanto el director como el asesor
  // asignado pueden corregirlo (por ejemplo, si se digitó mal al crearla).
  const actualizarNumeroCotizacion = async (cotizacionId, nuevoNumero) => {
    const numero = (nuevoNumero || '').trim()
    if (!numero) {
      setCotizacionMsg({ tipo: 'error', texto: 'El número de cotización no puede quedar vacío.' })
      cargarTodo()
      return
    }
    const { error } = await supabase
      .from('cotizaciones_clientes')
      .update({ numero_cotizacion: numero })
      .eq('id', cotizacionId)
    if (error) {
      setCotizacionMsg({ tipo: 'error', texto: 'No se pudo actualizar el número de cotización: ' + error.message })
      cargarTodo()
      return
    }
    cargarTodo()
  }

  const marcarEntregado = async (pedido) => {
    if (!confirm(`¿Marcar el pedido ${pedido.numero_pedido} como entregado? Esto genera las 3 misiones de postventa.`)) return

    const { error: errorPedido } = await supabase.from('order_ops').update({ estado: 'entregado' }).eq('id', pedido.id)
    if (errorPedido) {
      alert('No se pudo actualizar el pedido: ' + errorPedido.message)
      return
    }

    // Si "Entrega al cliente" o "Confirmar entrega" seguían pendientes, ya no
    // tienen sentido — el pedido ya quedó entregado.
    const { error: errorMisiones } = await supabase
      .from('automated_tasks')
      .delete()
      .eq('op_id', pedido.id)
      .in('tipo', ['confirmar_entrega', 'entrega_cliente'])
      .is('completado_at', null)
    if (errorMisiones) {
      console.error('No se pudieron limpiar las misiones de entrega pendientes:', errorMisiones.message)
    }

    cargarTodo()
  }

  const marcarAunNoRecibe = async (pedido) => {
    if (!confirm(`¿Avisar al cliente que aún no ha retirado el equipo del pedido ${pedido.numero_pedido}? Esto crea una misión de alerta de bodegaje en 12 días.`)) return

    const { data: plantilla } = await supabase
      .from('message_templates')
      .select('contenido')
      .eq('clave', 'bodegaje_alerta_1')
      .limit(1)
      .single()

    // La alerta de inicio de bodegaje se programa 12 días después de marcar
    // "aún no recibe", no el mismo día — le da margen al cliente antes de
    // empezar a cobrarle bodegaje.
    const fechaAlerta = new Date()
    fechaAlerta.setDate(fechaAlerta.getDate() + 12)

    const { error } = await supabase.from('automated_tasks').insert({
      asesor_id: cliente.asesor_id,
      client_id: cliente.id,
      op_id: pedido.id,
      tipo: 'bodegaje_alerta_1',
      fecha_programada: fechaAlerta.toISOString().slice(0, 10),
      mensaje_sugerido: plantilla?.contenido || null,
    })

    if (error) {
      alert('No se pudo crear la alerta de bodegaje: ' + error.message)
      return
    }

    cargarTodo()
  }

  const agregarOp = async (pedidoId) => {
    const codigo = (nuevaOp[pedidoId] || '').trim()
    if (!codigo) return
    const { error } = await supabase.from('pedido_ops').insert({ order_op_id: pedidoId, codigo_op: codigo })
    if (error) {
      alert('No se pudo agregar la OP: ' + error.message)
      return
    }
    setNuevaOp((prev) => ({ ...prev, [pedidoId]: '' }))
    cargarTodo()
  }

  const eliminarOp = async (opId) => {
    const { error } = await supabase.from('pedido_ops').delete().eq('id', opId)
    if (error) {
      alert('No se pudo eliminar: ' + error.message)
      return
    }
    cargarTodo()
  }

  const marcarCumplida = async (mision) => {
    const tabla = mision.origenTarea === 'auto' ? 'automated_tasks' : 'manual_tasks'
    const { error } = await supabase.from(tabla).update({ completado_at: new Date().toISOString() }).eq('id', mision.id)
    if (error) {
      alert('No se pudo marcar como cumplida: ' + error.message)
      return
    }
    cargarTodo()
  }

  const rechazarCotizacion = async (cotizacion) => {
    if (!confirm(`¿Rechazar la cotización ${cotizacion.numero_cotizacion}? Se eliminará por completo, junto con sus misiones de recontacto pendientes.`)) {
      return
    }
    setCotizacionMsg(null)
    setProcesandoCotizacionId(cotizacion.id)

    const { error } = await supabase
      .from('cotizaciones_clientes')
      .update({ estado: 'rechazada' })
      .eq('id', cotizacion.id)

    setProcesandoCotizacionId(null)

    if (error) {
      setCotizacionMsg({ tipo: 'error', texto: error.message })
      return
    }
    cargarTodo()
  }

  // Paso 1: pedir la fecha de entrega antes de convertir la cotización en pedido
  const iniciarVentaHecha = (cotizacion) => {
    setCotizacionMsg(null)
    setFechaEntregaVenta('')
    setPidiendoFechaPara(cotizacion)
  }

  // Paso 2: con la fecha ya elegida, crear el pedido y cerrar la cotización
  const confirmarVentaHecha = async () => {
    const cotizacion = pidiendoFechaPara
    if (!cotizacion) return

    if (!fechaEntregaVenta) {
      setCotizacionMsg({ tipo: 'error', texto: 'Selecciona la fecha de entrega para crear el pedido.' })
      return
    }

    setProcesandoCotizacionId(cotizacion.id)
    setCotizacionMsg(null)

    // El valor cotizado ya incluye IVA (confirmado). El "sin IVA" se calcula
    // hacia atrás con el % vigente, solo para que las estadísticas de valor
    // comprado (que suman sin_iva y con_iva) queden consistentes.
    const valorConIva = Number(cotizacion.valor_cotizado)
    const valorSinIva = Math.round(valorConIva / (1 + ivaPorcentaje / 100))

    const { data: nuevoPedidoRow, error: errorPedido } = await supabase
      .from('order_ops')
      .insert({
        client_id: id,
        numero_pedido: cotizacion.numero_cotizacion,
        valor_sin_iva: valorSinIva,
        valor_con_iva: valorConIva,
        fecha_entrega: fechaEntregaVenta,
        ubicacion_entrega: cotizacion.ubicacion,
      })
      .select()
      .single()

    if (errorPedido) {
      setProcesandoCotizacionId(null)
      setCotizacionMsg({ tipo: 'error', texto: 'No se pudo crear el pedido: ' + errorPedido.message })
      return
    }

    const { error: errorCotizacion } = await supabase
      .from('cotizaciones_clientes')
      .update({ estado: 'venta_hecha', order_op_id: nuevoPedidoRow.id })
      .eq('id', cotizacion.id)

    setProcesandoCotizacionId(null)
    setPidiendoFechaPara(null)

    if (errorCotizacion) {
      setCotizacionMsg({ tipo: 'error', texto: errorCotizacion.message })
      return
    }
    cargarTodo()
  }

  const abrirFormBodegaje = async (pedidoId) => {
    const { data } = await supabase.from('message_templates').select('contenido').eq('clave', 'bodegaje').limit(1).single()
    setFormBodegaje({ valor_dia: '', detalle: data?.contenido || '' })
    setFormBodegajeAbierto(pedidoId)
  }

  const guardarBodegaje = async (pedidoId) => {
    const valor = Number(formBodegaje.valor_dia)
    if (!formBodegaje.valor_dia || isNaN(valor) || valor <= 0) {
      alert('Ingresa un valor por día válido.')
      return
    }
    setGuardandoBodegaje(true)
    const { error } = await supabase.from('bodegaje').insert({
      order_op_id: pedidoId,
      valor_dia: valor,
      detalle: formBodegaje.detalle.trim() || null,
      creado_por: profile?.id || null,
    })
    setGuardandoBodegaje(false)
    if (error) {
      alert('No se pudo iniciar el bodegaje: ' + error.message)
      return
    }
    setFormBodegajeAbierto(null)
    await cargarTodo()
    // La ventana de detalle se abre sola al confirmar, sin que Nico tenga
    // que buscar y tocar "Ver detalle" por separado.
    setTarjetaAbierta(pedidoId)
  }

  const cerrarBodegaje = async (bodegajeId) => {
    if (!confirm('¿Cerrar el bodegaje? Deja de contar días desde ahora. Puedes reabrirlo después si es necesario.')) return
    const { error } = await supabase
      .from('bodegaje')
      .update({ fecha_fin: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', bodegajeId)
    if (error) {
      alert('No se pudo cerrar: ' + error.message)
      return
    }
    cargarTodo()
  }

  const reabrirBodegaje = async (bodegajeId) => {
    const { error } = await supabase
      .from('bodegaje')
      .update({ fecha_fin: null, updated_at: new Date().toISOString() })
      .eq('id', bodegajeId)
    if (error) {
      alert('No se pudo reabrir: ' + error.message)
      return
    }
    cargarTodo()
  }

  if (loading)
    return (
      <p className="p-4 text-sm" style={{ color: C.textSecondary, backgroundColor: C.bg, minHeight: '100vh' }}>
        Cargando cliente...
      </p>
    )
  if (error) return <p className="p-4 text-sm text-red-600">Error: {error}</p>
  if (!cliente) return null

  if (!esDirector && cliente.asesor_id !== profile?.id) {
    return (
      <div className="p-4 pb-24 max-w-3xl mx-auto min-h-screen" style={{ backgroundColor: C.bg }}>
        <Link to="/clientes" className="text-sm font-medium hover:underline" style={{ color: C.navy }}>
          ← Volver a Clientes
        </Link>
        <p className="mt-4 text-sm text-red-600">Este cliente no está asignado a ti, no tienes acceso a su ficha.</p>
      </div>
    )
  }

  const link = waLink(cliente.telefono)
  const asesor = asesores.find((a) => a.id === cliente.asesor_id)
  const misionesPendientes = misiones.filter((m) => !m.completado_at)
  const misionesCumplidas = misiones.filter((m) => m.completado_at)

  const seisMesesAtras = new Date()
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6)
  const inicioMes = new Date()
  inicioMes.setDate(1)
  inicioMes.setHours(0, 0, 0, 0)

  // Los pedidos entregados quedan "cerrados" — ya no se editan, así que se
  // envían al final de la lista para dejar arriba lo que sigue activo.
  const pedidosOrdenados = [...pedidos].sort(
    (a, b) => (a.estado === 'entregado' ? 1 : 0) - (b.estado === 'entregado' ? 1 : 0)
  )

  const totalSinIva = pedidos.reduce((acc, p) => acc + Number(p.valor_sin_iva || 0), 0)
  const totalConIva = pedidos.reduce((acc, p) => acc + Number(p.valor_con_iva || 0), 0)
  const seisMesesSinIva = pedidos
    .filter((p) => new Date(p.created_at) >= seisMesesAtras)
    .reduce((acc, p) => acc + Number(p.valor_sin_iva || 0), 0)
  const seisMesesConIva = pedidos
    .filter((p) => new Date(p.created_at) >= seisMesesAtras)
    .reduce((acc, p) => acc + Number(p.valor_con_iva || 0), 0)
  const mesSinIva = pedidos
    .filter((p) => new Date(p.created_at) >= inicioMes)
    .reduce((acc, p) => acc + Number(p.valor_sin_iva || 0), 0)
  const mesConIva = pedidos
    .filter((p) => new Date(p.created_at) >= inicioMes)
    .reduce((acc, p) => acc + Number(p.valor_con_iva || 0), 0)

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg }}>
      <div className="p-4 max-w-3xl mx-auto">
        <Link to="/clientes" className="inline-flex items-center gap-1.5 text-sm font-medium mb-3" style={{ color: C.textPrimary }}>
          <IconArrowLeft size={14} />
          Volver a Clientes
        </Link>

        {/* Presentación del cliente */}
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.navy }}>
          {!editandoIdentidad ? (
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-white leading-tight">{cliente.nombre_contacto}</h1>
                  <button onClick={empezarEdicionIdentidad} style={{ color: C.orange }}>
                    <IconEdit size={13} />
                  </button>
                </div>
                <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{cliente.empresa || 'Sin nombre de empresa'}</p>
              </div>
              <span
                title={asesor ? asesor.full_name || asesor.nombre : 'Sin asesor'}
                className="text-[11px] font-bold rounded-full w-7 h-7 flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#FFFFFF' }}
              >
                {iniciales(asesor ? asesor.full_name || asesor.nombre : null)}
              </span>
            </div>
          ) : (
            <form onSubmit={guardarIdentidad} className="rounded-xl p-4 space-y-3" style={{ backgroundColor: C.card }}>
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Nombre del contacto</label>
                <input
                  type="text"
                  value={formIdentidad.nombre_contacto}
                  onChange={(e) => cambiarIdentidad('nombre_contacto', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Empresa</label>
                <input
                  type="text"
                  value={formIdentidad.empresa}
                  onChange={(e) => cambiarIdentidad('empresa', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              {identidadMsg && (
                <p className={`text-sm ${identidadMsg.tipo === 'error' ? 'text-red-600' : ''}`} style={identidadMsg.tipo === 'ok' ? { color: '#0F6E56' } : undefined}>
                  {identidadMsg.texto}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditandoIdentidad(false)}
                  className="flex-1 rounded-xl text-sm font-medium px-4 py-2"
                  style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoIdentidad}
                  className="flex-1 rounded-xl text-sm font-medium px-4 py-2 disabled:opacity-60"
                  style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                >
                  {guardandoIdentidad ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}

          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-2"
              style={{ backgroundColor: 'rgba(29,158,117,0.18)' }}
            >
              <IconMessage size={14} style={{ color: '#5DCAA5' }} />
              <span className="text-xs font-medium" style={{ color: '#5DCAA5' }}>
                Escribir por WhatsApp — {cliente.telefono}
              </span>
            </a>
          )}
        </div>

        {/* Información de contacto */}
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Información de contacto</h2>
            {!editandoContacto && (
              <button onClick={empezarEdicionContacto} className="text-xs font-medium flex items-center gap-1" style={{ color: C.navy }}>
                <IconEdit size={12} />
                Editar
              </button>
            )}
          </div>

          {!editandoContacto ? (
            <div className="text-sm space-y-1.5" style={{ color: C.textSecondary }}>
              <p className="flex items-center gap-1.5"><IconPhone size={13} style={{ color: C.textMuted }} />{cliente.telefono || '—'}</p>
              <p className="flex items-center gap-1.5"><IconMail size={13} style={{ color: C.textMuted }} />{cliente.correo || '—'}</p>
              <p className="flex items-center gap-1.5"><IconMapPin size={13} style={{ color: C.textMuted }} />{cliente.ciudad || '—'}</p>
              <p className="flex items-center gap-1.5"><IconTag size={13} style={{ color: C.textMuted }} />Origen: {ORIGEN_LABEL[cliente.origen] || '—'}</p>
            </div>
          ) : (
            <form onSubmit={guardarContacto} className="space-y-3">
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Teléfono</label>
                <input
                  type="tel"
                  value={formContacto.telefono}
                  onChange={(e) => cambiarContacto('telefono', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Correo</label>
                <input
                  type="email"
                  value={formContacto.correo}
                  onChange={(e) => cambiarContacto('correo', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Ciudad</label>
                <input
                  type="text"
                  value={formContacto.ciudad}
                  onChange={(e) => cambiarContacto('ciudad', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>

              {contactoMsg && (
                <p className={`text-sm ${contactoMsg.tipo === 'error' ? 'text-red-600' : ''}`} style={contactoMsg.tipo === 'ok' ? { color: '#0F6E56' } : undefined}>
                  {contactoMsg.texto}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditandoContacto(false)}
                  className="flex-1 rounded-xl text-sm font-medium px-4 py-2"
                  style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoContacto}
                  className="flex-1 rounded-xl text-sm font-medium px-4 py-2 disabled:opacity-60"
                  style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                >
                  {guardandoContacto ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Valores comprados */}
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.navy }}>
          <div className="flex items-center gap-1.5 mb-1">
            <IconDollar size={13} style={{ color: C.orange }} />
            <p className="text-xs" style={{ color: C.orange }}>Valor comprado — total histórico</p>
          </div>
          <p className="text-2xl font-extrabold text-white leading-tight">${totalSinIva.toLocaleString('es-CO')}</p>
          <p className="text-xs mt-1 mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>sin IVA — ${totalConIva.toLocaleString('es-CO')} con IVA</p>

          <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.15)' }}>
            <div>
              <p className="text-xs" style={{ color: C.orange }}>Últimos 6 meses</p>
              <p className="text-base font-semibold text-white">${seisMesesSinIva.toLocaleString('es-CO')}</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>${seisMesesConIva.toLocaleString('es-CO')} con IVA</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: C.orange }}>Este mes</p>
              <p className="text-base font-semibold text-white">${mesSinIva.toLocaleString('es-CO')}</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>${mesConIva.toLocaleString('es-CO')} con IVA</p>
            </div>
          </div>
        </div>

        {/* Pedidos */}
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: C.textPrimary }}>Pedidos</h2>

          <div className="space-y-3 mb-4">
            {pedidos.length === 0 && <p className="text-sm" style={{ color: C.textMuted }}>Sin pedidos todavía.</p>}
            {pedidosOrdenados.map((p) => {
              const info = estadoInfo(p.estado)
              const ops = opsPorPedido[p.id] || []
              const esEntregado = p.estado === 'entregado'
              return (
                <div
                  key={p.id}
                  className="rounded-xl p-3"
                  style={{
                    border: `0.5px solid ${C.border}`,
                    backgroundColor: esEntregado ? '#F4F4F2' : C.card,
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>Pedido {p.numero_pedido}</p>
                      <p className="text-xs" style={{ color: C.textMuted }}>
                        {esEntregado ? `Entregado: ${fmtFecha(p.fecha_entrega)} — pedido cerrado` : `Entrega planeada: ${fmtFecha(p.fecha_entrega)}`}
                      </p>
                    </div>
                    <span
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={{ backgroundColor: info.bg, color: info.text }}
                    >
                      {info.label}
                    </span>
                  </div>

                  <div className="mt-2 text-xs flex gap-3" style={{ color: C.textSecondary }}>
                    {p.valor_sin_iva ? <span>Sin IVA: ${Number(p.valor_sin_iva).toLocaleString('es-CO')}</span> : null}
                    {p.valor_con_iva ? <span>Con IVA: ${Number(p.valor_con_iva).toLocaleString('es-CO')}</span> : null}
                  </div>

                  <p className="mt-1 text-xs flex items-center gap-1" style={{ color: C.textSecondary }}>
                    <IconMapPin size={11} />
                    {p.ubicacion_entrega || 'Sin ubicación de entrega'}
                  </p>

                  {!esEntregado && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs" style={{ color: C.textSecondary }}>Ubicación:</label>
                      <input
                        type="text"
                        defaultValue={p.ubicacion_entrega || ''}
                        onBlur={(e) => {
                          if (e.target.value !== (p.ubicacion_entrega || '')) {
                            actualizarPedido(p.id, { ubicacion_entrega: e.target.value.trim() || null })
                          }
                        }}
                        className="px-2 py-1 text-xs flex-1"
                        style={smallInputStyle}
                      />
                    </div>
                  )}

                  {!esEntregado && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs" style={{ color: C.textSecondary }}>Cambiar fecha de entrega:</label>
                      <input
                        type="date"
                        defaultValue={p.fecha_entrega ? p.fecha_entrega.slice(0, 10) : ''}
                        onBlur={(e) => {
                          if (e.target.value && e.target.value !== p.fecha_entrega?.slice(0, 10)) {
                            actualizarPedido(p.id, { fecha_entrega: e.target.value })
                          }
                        }}
                        className="px-2 py-1 text-xs"
                        style={smallInputStyle}
                      />
                    </div>
                  )}

                  {/* OP libres */}
                  <div className="mt-3">
                    <p className="text-xs mb-1" style={{ color: C.textSecondary }}>OP de este pedido</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {ops.map((o) => (
                        <span
                          key={o.id}
                          className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                          style={{ backgroundColor: '#EDEDE7', color: C.textSecondary }}
                        >
                          {o.codigo_op}
                          {!esEntregado && (
                            <button onClick={() => eliminarOp(o.id)} style={{ color: C.textMuted }}>
                              <IconX size={10} />
                            </button>
                          )}
                        </span>
                      ))}
                      {ops.length === 0 && esEntregado && <span className="text-xs" style={{ color: C.textMuted }}>Sin OP registradas</span>}
                    </div>
                    {!esEntregado && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Código de OP"
                          value={nuevaOp[p.id] || ''}
                          onChange={(e) => setNuevaOp((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          className="px-2 py-1 text-xs flex-1"
                          style={smallInputStyle}
                        />
                        <button
                          onClick={() => agregarOp(p.id)}
                          className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                          style={{ backgroundColor: '#EDEDE7', color: C.textSecondary }}
                        >
                          <IconPlus size={11} />
                          Agregar OP
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Bodegaje */}
                  <div className="mt-3 pt-3" style={{ borderTop: `0.5px solid ${C.border}` }}>
                    {(() => {
                      const b = bodegajePorPedido[p.id]
                      if (!b) {
                        return formBodegajeAbierto === p.id ? (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold" style={{ color: C.textSecondary }}>Iniciar bodegaje</p>
                            <input
                              type="number"
                              placeholder="Valor a cobrar por día"
                              value={formBodegaje.valor_dia}
                              onChange={(e) => setFormBodegaje((prev) => ({ ...prev, valor_dia: e.target.value }))}
                              className="w-full px-2 py-1 text-xs"
                              style={smallInputStyle}
                            />
                            <textarea
                              value={formBodegaje.detalle}
                              onChange={(e) => setFormBodegaje((prev) => ({ ...prev, detalle: e.target.value }))}
                              rows={2}
                              className="w-full px-2 py-1 text-xs"
                              style={smallInputStyle}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setFormBodegajeAbierto(null)}
                                className="text-xs px-2 py-1 rounded-lg"
                                style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => guardarBodegaje(p.id)}
                                disabled={guardandoBodegaje}
                                className="text-xs px-2 py-1 rounded-lg disabled:opacity-60"
                                style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                              >
                                {guardandoBodegaje ? 'Guardando...' : 'Confirmar bodegaje'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          !esEntregado && (
                            <button
                              onClick={() => abrirFormBodegaje(p.id)}
                              className="text-xs px-2 py-1 rounded-lg flex items-center gap-1"
                              style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}
                            >
                              <IconPackage size={12} />
                              Marcar en bodegaje
                            </button>
                          )
                        )
                      }

                      const cerrado = !!b.fecha_fin
                      return (
                        <div>
                          <p className="text-xs flex items-center gap-1.5" style={{ color: C.textSecondary }}>
                            <IconBox size={12} />
                            {cerrado ? 'Bodegaje cerrado' : 'En bodegaje'} desde {fmtFecha(b.fecha_inicio)} · $
                            {Number(b.valor_dia).toLocaleString('es-CO')}/día
                          </p>
                          <div className="flex gap-2 mt-1.5">
                            <button
                              onClick={() => setTarjetaAbierta(p.id)}
                              className="text-xs px-2 py-1 rounded-lg"
                              style={{ backgroundColor: '#EDEDE7', color: C.textSecondary }}
                            >
                              Ver detalle
                            </button>
                            {!esEntregado &&
                              (cerrado ? (
                                <button
                                  onClick={() => reabrirBodegaje(b.id)}
                                  className="text-xs px-2 py-1 rounded-lg"
                                  style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}
                                >
                                  Reabrir
                                </button>
                              ) : (
                                <button
                                  onClick={() => cerrarBodegaje(b.id)}
                                  className="text-xs px-2 py-1 rounded-lg"
                                  style={{ backgroundColor: '#EDEDE7', color: C.textSecondary }}
                                >
                                  Cerrar bodegaje
                                </button>
                              ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {!esEntregado && (() => {
                    const alertaBodegajeActiva = misiones.some(
                      (m) =>
                        m.op_id === p.id &&
                        (m.tipo === 'bodegaje_alerta_1' || m.tipo === 'bodegaje_alerta_2') &&
                        !m.completado_at
                    )
                    return (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => marcarEntregado(p)}
                          className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1"
                          style={{ backgroundColor: '#1D9E75', color: '#FFFFFF' }}
                        >
                          <IconCheck size={11} />
                          Marcar como entregado
                        </button>
                        <button
                          onClick={() => marcarAunNoRecibe(p)}
                          disabled={alertaBodegajeActiva}
                          className="text-xs px-2.5 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1"
                          style={{ backgroundColor: '#EF9F27', color: '#412402' }}
                        >
                          <IconAlertTriangle size={11} />
                          {alertaBodegajeActiva ? 'Aviso enviado' : 'Aún no recibe'}
                        </button>
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>

          {/* Nuevo pedido */}
          <form onSubmit={crearPedido} className="pt-3 space-y-2" style={{ borderTop: `0.5px solid ${C.border}` }}>
            <p className="text-xs font-semibold flex items-center gap-1" style={{ color: C.textSecondary }}>
              <IconPlus size={12} />
              Nuevo pedido
            </p>
            <p className="text-xs" style={{ color: C.textMuted }}>IVA vigente: {ivaPorcentaje}% (se puede cambiar en Ajustes)</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Número de pedido *"
                value={nuevoPedido.numero_pedido}
                onChange={(e) => setNuevoPedido((prev) => ({ ...prev, numero_pedido: e.target.value }))}
                className={inputCls}
                style={inputStyle}
              />
              <input
                type="date"
                placeholder="Fecha de entrega *"
                value={nuevoPedido.fecha_entrega}
                onChange={(e) => setNuevoPedido((prev) => ({ ...prev, fecha_entrega: e.target.value }))}
                className={inputCls}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Ubicación de entrega"
                value={nuevoPedido.ubicacion_entrega}
                onChange={(e) => setNuevoPedido((prev) => ({ ...prev, ubicacion_entrega: e.target.value }))}
                className={`${inputCls} col-span-2`}
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Valor sin IVA *"
                value={nuevoPedido.valor_sin_iva}
                onChange={(e) => {
                  const sinIva = e.target.value
                  const conIva = sinIva === '' ? '' : (Number(sinIva) * (1 + ivaPorcentaje / 100)).toFixed(0)
                  setNuevoPedido((prev) => ({ ...prev, valor_sin_iva: sinIva, valor_con_iva: conIva }))
                }}
                className={inputCls}
                style={inputStyle}
              />
              <input
                type="number"
                placeholder="Valor con IVA"
                value={nuevoPedido.valor_con_iva}
                onChange={(e) => setNuevoPedido((prev) => ({ ...prev, valor_con_iva: e.target.value }))}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            {pedidoMsg && (
              <p className={`text-sm ${pedidoMsg.tipo === 'error' ? 'text-red-600' : ''}`} style={pedidoMsg.tipo === 'ok' ? { color: '#0F6E56' } : undefined}>
                {pedidoMsg.texto}
              </p>
            )}
            <button
              type="submit"
              disabled={creandoPedido}
              className="text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-60"
              style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
            >
              {creandoPedido ? 'Creando...' : 'Crear pedido'}
            </button>
          </form>
        </div>

        {/* Cotizaciones (recotización) */}
        {cotizaciones.length > 0 && (
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
            <h2 className="text-sm font-semibold mb-3" style={{ color: C.textPrimary }}>Cotizaciones</h2>
            <div className="space-y-2">
              {cotizaciones.map((c) => {
                const info = estadoCotizacionInfo(c.estado)
                const activa = c.estado === 'cotizacion_enviada' || c.estado === 'pendiente'
                return (
                  <div key={c.id} className="rounded-xl p-3" style={{ border: `0.5px solid ${C.border}` }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Número de cotización — editable por director y asesor,
                            mismo patrón de edición inline (onBlur) que la
                            ubicación de los pedidos, arriba. */}
                        <label className="text-[10px] block" style={{ color: C.textMuted }}>Número de cotización</label>
                        <input
                          type="text"
                          defaultValue={c.numero_cotizacion}
                          onBlur={(e) => {
                            if (e.target.value.trim() !== c.numero_cotizacion) {
                              actualizarNumeroCotizacion(c.id, e.target.value)
                            }
                          }}
                          className="text-sm font-medium px-2 py-1 -ml-2 rounded-lg w-full"
                          style={{ ...smallInputStyle, color: C.textPrimary, maxWidth: 220 }}
                        />
                        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: C.textSecondary }}>
                          ${Number(c.valor_cotizado).toLocaleString('es-CO')} (con IVA) · <IconMapPin size={11} />{c.ubicacion}
                        </p>
                        {c.detalle && <p className="text-xs mt-1" style={{ color: C.textMuted }}>{c.detalle}</p>}
                        <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                          Creada: {new Date(c.created_at).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: info.bg, color: info.text }}
                      >
                        {info.label}
                      </span>
                    </div>

                    {activa && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => iniciarVentaHecha(c)}
                          disabled={procesandoCotizacionId === c.id}
                          className="text-xs px-2.5 py-1.5 rounded-lg disabled:opacity-60 flex items-center gap-1"
                          style={{ backgroundColor: '#1D9E75', color: '#FFFFFF' }}
                        >
                          <IconCheck size={11} />
                          Venta hecha
                        </button>
                        <button
                          onClick={() => rechazarCotizacion(c)}
                          disabled={procesandoCotizacionId === c.id}
                          className="text-xs px-2.5 py-1.5 rounded-lg disabled:opacity-60 flex items-center gap-1"
                          style={{ backgroundColor: '#FCEBEB', color: '#A32D2D' }}
                        >
                          <IconX size={11} />
                          Rechazada
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {cotizacionMsg && !pidiendoFechaPara && (
              <p className={`text-sm mt-2 ${cotizacionMsg.tipo === 'error' ? 'text-red-600' : ''}`} style={cotizacionMsg.tipo === 'ok' ? { color: '#0F6E56' } : undefined}>
                {cotizacionMsg.texto}
              </p>
            )}
          </div>
        )}

        {/* Prompt: fecha de entrega para convertir la cotización en pedido */}
        {pidiendoFechaPara && (
          <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
            <div className="rounded-t-2xl md:rounded-2xl w-full md:max-w-sm p-4" style={{ backgroundColor: C.card }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold" style={{ color: C.textPrimary }}>Fecha de entrega</h2>
                <button onClick={() => setPidiendoFechaPara(null)} style={{ color: C.textMuted }}>
                  <IconX size={20} />
                </button>
              </div>
              <p className="text-xs mb-3" style={{ color: C.textSecondary }}>
                Se creará el pedido {pidiendoFechaPara.numero_cotizacion} con esta fecha de entrega.
              </p>
              <input
                type="date"
                value={fechaEntregaVenta}
                onChange={(e) => setFechaEntregaVenta(e.target.value)}
                className={`${inputCls} mb-3`}
                style={inputStyle}
              />
              {cotizacionMsg && (
                <p className={`text-sm mb-2 ${cotizacionMsg.tipo === 'error' ? 'text-red-600' : ''}`} style={cotizacionMsg.tipo === 'ok' ? { color: '#0F6E56' } : undefined}>
                  {cotizacionMsg.texto}
                </p>
              )}
              <button
                onClick={confirmarVentaHecha}
                disabled={procesandoCotizacionId === pidiendoFechaPara.id}
                className="w-full text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-60"
                style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
              >
                {procesandoCotizacionId === pidiendoFechaPara.id ? 'Creando pedido...' : 'Confirmar y crear pedido'}
              </button>
            </div>
          </div>
        )}

        {/* Misiones pendientes */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <IconClipboard size={14} style={{ color: C.textPrimary }} />
            <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Misiones pendientes</h2>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
            {misionesPendientes.length === 0 && <p className="text-sm" style={{ color: C.textMuted }}>No hay misiones pendientes.</p>}
            <div className="space-y-2">
              {misionesPendientes.map((m) => (
                <div key={`${m.origenTarea}-${m.id}`} className="rounded-xl p-3" style={{ border: `0.5px solid ${C.border}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.textPrimary }}>{m.titulo}</p>
                      {m.detalle && <p className="text-xs mt-1" style={{ color: C.textSecondary }}>{m.detalle}</p>}
                      {m.ubicacion && (
                        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: C.textMuted }}>
                          <IconMapPin size={11} />
                          {m.ubicacion}
                        </p>
                      )}
                      <p className="text-xs mt-1" style={{ color: C.textMuted }}>Programada: {fmtFecha(m.fecha_programada)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        title="Asesor asignado"
                        className="text-[11px] font-bold rounded-full w-6 h-6 flex items-center justify-center"
                        style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
                      >
                        {m.iniciales}
                      </span>
                      <button
                        onClick={() => marcarCumplida(m)}
                        className="text-xs px-2.5 py-1 rounded-lg whitespace-nowrap flex items-center gap-1"
                        style={{ backgroundColor: '#1D9E75', color: '#FFFFFF' }}
                      >
                        <IconCheck size={11} />
                        Marcar cumplida
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Misiones cumplidas */}
        {misionesCumplidas.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <IconCheck size={14} style={{ color: C.textPrimary }} />
              <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Misiones cumplidas</h2>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
              <div className="space-y-2">
                {misionesCumplidas.map((m) => (
                  <div key={`${m.origenTarea}-${m.id}`} className="rounded-xl p-3" style={{ backgroundColor: '#F4F4F2' }}>
                    <p className="text-sm font-medium" style={{ color: C.textSecondary }}>{m.titulo}</p>
                    <p className="text-xs mt-1" style={{ color: C.textMuted }}>Cumplida: {fmtFecha(m.completado_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Historial como lead (contexto) */}
        {misionesLead.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <IconHistory size={14} style={{ color: C.textPrimary }} />
              <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Historial de cuando era lead</h2>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
              <div className="space-y-2">
                {misionesLead.map((m) => (
                  <div
                    key={`lead-${m.origenTarea}-${m.id}`}
                    className="text-sm pb-2"
                    style={{ color: C.textSecondary, borderBottom: `0.5px solid ${C.border}` }}
                  >
                    {m.titulo} — {m.completado_at ? `cumplida ${fmtFecha(m.completado_at)}` : `pendiente, programada ${fmtFecha(m.fecha_programada)}`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tarjetaAbierta && (
          <TarjetaBodegaje
            pedido={pedidos.find((p) => p.id === tarjetaAbierta)}
            bodegaje={bodegajePorPedido[tarjetaAbierta]}
            cliente={cliente}
            asesor={asesor}
            waLinkCliente={link}
            onClose={() => setTarjetaAbierta(null)}
          />
        )}
      </div>
    </div>
  )
}

function diasBodegaje(fechaInicio, fechaFin) {
  const inicio = new Date(fechaInicio)
  const fin = fechaFin ? new Date(fechaFin) : new Date()
  const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24))
  return Math.max(1, dias)
}

// Tarjeta compartible por WhatsApp — el asesor toma captura de pantalla y la
// envía manualmente al cliente. Usa el mismo navy/naranja de marca.
function TarjetaBodegaje({ pedido, bodegaje, cliente, asesor, waLinkCliente, onClose }) {
  if (!pedido || !bodegaje) return null

  const dias = diasBodegaje(bodegaje.fecha_inicio, bodegaje.fecha_fin)
  const total = dias * Number(bodegaje.valor_dia)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl w-full max-w-sm overflow-hidden" style={{ backgroundColor: C.card }}>
        <div className="px-5 py-4" style={{ backgroundColor: C.navy }}>
          <p className="text-xs" style={{ color: C.orange }}>Refriartic — Cobro por bodegaje</p>
          <h2 className="text-lg font-bold text-white">REFRIARTIC</h2>
        </div>

        <div className="p-5 space-y-3">
          <div>
            <p className="text-xs" style={{ color: C.textMuted }}>Cliente</p>
            <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>{cliente.empresa || cliente.nombre_contacto}</p>
            <p className="text-xs" style={{ color: C.textSecondary }}>{cliente.nombre_contacto}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs" style={{ color: C.textMuted }}>Pedido</p>
              <p className="text-sm" style={{ color: C.textSecondary }}>{pedido.numero_pedido}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: C.textMuted }}>Asesor</p>
              <p className="text-sm" style={{ color: C.textSecondary }}>{asesor ? asesor.full_name || asesor.nombre : '—'}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: C.textMuted }}>Inicio de bodegaje</p>
              <p className="text-sm" style={{ color: C.textSecondary }}>{fmtFecha(bodegaje.fecha_inicio)}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: C.textMuted }}>Días acumulados</p>
              <p className="text-sm" style={{ color: C.textSecondary }}>{dias} días</p>
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ backgroundColor: '#F4F4F2' }}>
            <p className="text-xs" style={{ color: C.textMuted }}>Valor por día</p>
            <p className="text-sm mb-1" style={{ color: C.textSecondary }}>${Number(bodegaje.valor_dia).toLocaleString('es-CO')}</p>
            <p className="text-xs" style={{ color: C.textMuted }}>Total a la fecha</p>
            <p className="text-xl font-bold" style={{ color: C.navy }}>${total.toLocaleString('es-CO')}</p>
          </div>

          {bodegaje.detalle && (
            <div>
              <p className="text-xs mb-1" style={{ color: C.textMuted }}>Detalle</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: C.textSecondary }}>{bodegaje.detalle}</p>
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          {waLinkCliente && (
            <a
              href={waLinkCliente}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center text-sm font-medium px-3 py-2 rounded-xl"
              style={{ backgroundColor: '#1D9E75', color: '#FFFFFF' }}
            >
              Abrir WhatsApp del cliente
            </a>
          )}
          <button
            onClick={onClose}
            className="flex-1 text-sm font-medium px-3 py-2 rounded-xl"
            style={{ border: `0.5px solid ${C.border}`, color: C.textSecondary }}
          >
            Cerrar
          </button>
        </div>
        <p className="text-[11px] text-center pb-3" style={{ color: C.textMuted }}>
          Toma una captura de pantalla de esta tarjeta y envíala manualmente por WhatsApp.
        </p>
      </div>
    </div>
  )
}
