import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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

const ESTADOS = [
  { value: 'no_responde', label: 'No responde', bg: '#EDEDE7', text: '#5F5E5A' },
  { value: 'contactado', label: 'Contactado', bg: '#E6F1FB', text: '#0C447C' },
  { value: 'cotizacion_informal', label: 'Cotización informal', bg: '#FAEEDA', text: '#854F0B' },
  { value: 'cotizacion_formal', label: 'Cotización formal', bg: '#EEEDFE', text: '#3C3489' },
  { value: 'proximo_a_vender', label: 'Próximo a vender', bg: '#FBEAF0', text: '#993556' },
  { value: 'venta_perdida', label: 'Venta perdida', bg: '#FCEBEB', text: '#A32D2D' },
  { value: 'venta_hecha', label: 'Venta hecha', bg: '#E1F5EE', text: '#085041' },
]

const ORIGENES = [
  { value: 'prospeccion_asesor', label: 'Prospección asesor' },
  { value: 'llamada_entrante', label: 'Llamada entrante' },
  { value: 'otro', label: 'Otro' },
]

const TIPO_TAREA_LABELS = {
  contactar_lead: 'Contactar lead nuevo',
  seguimiento_cotizacion: 'Seguimiento de cotización',
  recordatorio_etapa: 'Recordatorio de etapa',
  postventa_35_dias: 'Postventa · 35 días',
  postventa_70_dias: 'Postventa · 70 días',
  postventa_270_dias: 'Postventa · 270 días',
  visita_programada: 'Visita programada',
}

function estadoInfo(estado) {
  return ESTADOS.find((e) => e.value === estado) || { label: estado, bg: '#EDEDE7', text: '#5F5E5A' }
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

function nombreAsesor(asesores, id) {
  const a = asesores.find((x) => x.id === id)
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

const CAMPOS_VACIOS = {
  empresa: '',
  nombre_contacto: '',
  telefono: '',
  telefono_2: '',
  email: '',
  ciudad: '',
  notas_diagnostico: '',
  requiere_visita: false,
  fecha_visita: '',
  valor_cotizado: '',
  notas_cotizacion: '',
  codigo_cotizacion: '',
  asesor_id: '',
  origen: '',
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
const IconCheck = (props) => (
  <IconBase {...props}>
    <polyline points="20 6 9 17 4 12" />
  </IconBase>
)
const IconMapPin = (props) => (
  <IconBase {...props}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </IconBase>
)
const IconAlertTriangle = (props) => (
  <IconBase {...props}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </IconBase>
)

const inputCls = 'w-full rounded-xl px-3 py-2 text-sm bg-white focus:outline-none'
const inputStyle = { border: `0.5px solid ${C.border}`, color: C.textPrimary }

export default function NicoLeadDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const esDirector = profile?.rol === 'director' || profile?.role === 'director'

  const [lead, setLead] = useState(null)
  const [asesores, setAsesores] = useState([])
  const [historial, setHistorial] = useState([])
  const [misiones, setMisiones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [form, setForm] = useState(CAMPOS_VACIOS)
  const [guardandoForm, setGuardandoForm] = useState(false)
  const [formMsg, setFormMsg] = useState(null)

  const [nuevoEstado, setNuevoEstado] = useState('')
  const [motivoPerdida, setMotivoPerdida] = useState('')
  const [eliminando, setEliminando] = useState(false)

  const cargarTodo = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [leadRes, asesoresRes, historialRes, autoRes, manualRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).single(),
      supabase.from('profiles').select('id, full_name, nombre').eq('rol', 'asesor').eq('active', true),
      supabase.from('lead_stage_history').select('*').eq('lead_id', id).order('changed_at', { ascending: false }),
      supabase.from('automated_tasks').select('*').eq('lead_id', id).order('fecha_programada', { ascending: true }),
      supabase.from('manual_tasks').select('*').eq('lead_id', id).order('fecha_programada', { ascending: true }),
    ])

    if (leadRes.error) {
      setError(leadRes.error.message)
      setLoading(false)
      return
    }

    setLead(leadRes.data)
    setForm({
      empresa: leadRes.data.empresa || '',
      nombre_contacto: leadRes.data.nombre_contacto || '',
      telefono: leadRes.data.telefono || '',
      telefono_2: leadRes.data.telefono_2 || '',
      email: leadRes.data.email || '',
      ciudad: leadRes.data.ciudad || '',
      notas_diagnostico: leadRes.data.notas_diagnostico || '',
      requiere_visita: !!leadRes.data.requiere_visita,
      fecha_visita: leadRes.data.fecha_visita ? leadRes.data.fecha_visita.slice(0, 10) : '',
      valor_cotizado: leadRes.data.valor_cotizado ?? '',
      notas_cotizacion: leadRes.data.notas_cotizacion || '',
      codigo_cotizacion: leadRes.data.codigo_cotizacion || '',
      asesor_id: leadRes.data.asesor_id || '',
      origen: leadRes.data.origen || '',
    })
    setNuevoEstado(leadRes.data.estado || '')

    if (!asesoresRes.error) setAsesores(asesoresRes.data || [])
    if (!historialRes.error) setHistorial(historialRes.data || [])

    // Punto 5: cada misión debe traer nombre/empresa del lead, ubicación e
    // iniciales del asesor. Como este lead ya está en contexto, no hace falta
    // ninguna consulta extra — se arma en el cliente.
    const enriquecerMision = (t) => ({
      nombreContacto: leadRes.data.nombre_contacto || null,
      empresa: leadRes.data.empresa || null,
      // Los leads no tienen pedido, así que la ubicación es la ciudad del
      // lead, salvo que la misión manual tenga un "lugar" propio.
      ubicacion: t.lugar || leadRes.data.ciudad || null,
      iniciales: iniciales(nombreAsesor(asesoresRes.data || [], t.asesor_id || leadRes.data.asesor_id)),
    })

    const auto = (autoRes.data || []).map((t) => ({
      ...t,
      origenTarea: 'auto',
      titulo: TIPO_TAREA_LABELS[t.tipo] || t.tipo,
      detalle: t.mensaje_sugerido,
      ...enriquecerMision(t),
    }))
    const manual = (manualRes.data || []).map((t) => ({
      ...t,
      origenTarea: 'manual',
      titulo: t.titulo,
      detalle: t.descripcion,
      ...enriquecerMision(t),
    }))
    setMisiones([...auto, ...manual])

    setLoading(false)
  }, [id])

  useEffect(() => {
    cargarTodo()
  }, [cargarTodo])

  const cambiarForm = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  // Guarda en un solo paso los datos del lead y el cambio de estado del embudo.
  // Valida contra lo que hay en el formulario en este momento (no contra lo ya
  // guardado en base de datos), así no hace falta guardar dos veces.
  const guardarTodo = async (e) => {
    e.preventDefault()
    setFormMsg(null)

    if (nuevoEstado === 'venta_perdida' && !motivoPerdida.trim() && !(lead?.estado === 'venta_perdida' && lead?.motivo_perdida)) {
      setFormMsg({ tipo: 'error', texto: 'El motivo de pérdida es obligatorio para este estado.' })
      return
    }

    if (nuevoEstado === 'cotizacion_formal' && !form.codigo_cotizacion.trim()) {
      setFormMsg({
        tipo: 'error',
        texto: 'El código de cotización es obligatorio para pasar a Cotización formal.',
      })
      return
    }

    if (form.requiere_visita && !form.fecha_visita) {
      setFormMsg({
        tipo: 'error',
        texto: 'Si el lead "Requiere visita", la fecha de la visita es obligatoria.',
      })
      return
    }

    if (nuevoEstado === 'venta_hecha') {
      if (!form.email.trim() || !form.telefono.trim()) {
        setFormMsg({
          tipo: 'error',
          texto: 'Para marcar "Venta hecha" el lead debe tener correo y teléfono completos.',
        })
        return
      }
      if (!form.valor_cotizado || Number(form.valor_cotizado) <= 0) {
        setFormMsg({
          tipo: 'error',
          texto: 'Para marcar "Venta hecha" el lead debe tener un valor cotizado válido (se usa como valor del primer pedido).',
        })
        return
      }
      if (!form.codigo_cotizacion.trim()) {
        setFormMsg({
          tipo: 'error',
          texto: 'Para marcar "Venta hecha" el lead debe tener código de cotización (se usa como número del primer pedido).',
        })
        return
      }
    }

    setGuardandoForm(true)

    const payload = {
      empresa: form.empresa.trim() || null,
      nombre_contacto: form.nombre_contacto.trim(),
      telefono: form.telefono.trim(),
      telefono_2: form.telefono_2.trim() || null,
      email: form.email.trim() || null,
      ciudad: form.ciudad.trim() || null,
      notas_diagnostico: form.notas_diagnostico.trim() || null,
      requiere_visita: form.requiere_visita,
      fecha_visita: form.requiere_visita ? form.fecha_visita : null,
      valor_cotizado: form.valor_cotizado === '' ? null : Number(form.valor_cotizado),
      notas_cotizacion: form.notas_cotizacion.trim() || null,
      codigo_cotizacion: form.codigo_cotizacion.trim() || null,
      asesor_id: form.asesor_id || null,
      origen: form.origen || null,
      estado: nuevoEstado,
    }

    if (nuevoEstado === 'venta_perdida') {
      // Si no escribieron uno nuevo pero el lead ya tenía motivo guardado
      // (p. ej. solo estaban editando otro campo), se conserva el existente.
      payload.motivo_perdida = motivoPerdida.trim() || lead?.motivo_perdida || null
    }

    const { error } = await supabase.from('leads').update(payload).eq('id', id)

    setGuardandoForm(false)

    if (error) {
      setFormMsg({ tipo: 'error', texto: error.message })
    } else {
      setFormMsg({ tipo: 'ok', texto: 'Cambios y estado guardados.' })
      setMotivoPerdida('')
      cargarTodo()
    }
  }

  // Solo el director puede eliminar leads, y solo si no están en "Venta
  // Hecha" (esos ya son la fuente de un cliente real y no se deben borrar).
  // Se limpian primero las tablas que referencian este lead para evitar
  // errores de integridad referencial al borrar el lead en sí.
  const eliminarLead = async () => {
    if (lead.estado === 'venta_hecha') {
      alert('Este lead ya está marcado como "Venta Hecha" y generó un cliente — no se puede eliminar.')
      return
    }

    const primeraConfirmacion = window.confirm(
      `¿Eliminar el lead de "${lead.empresa || lead.nombre_contacto}"? Esta acción no se puede deshacer.`
    )
    if (!primeraConfirmacion) return

    const segundaConfirmacion = window.confirm(
      'Confirma una vez más: se borrará todo el historial y las misiones asociadas a este lead. ¿Continuar?'
    )
    if (!segundaConfirmacion) return

    setEliminando(true)

    const { error: eHist } = await supabase.from('lead_stage_history').delete().eq('lead_id', id)
    const { error: eAuto } = await supabase.from('automated_tasks').delete().eq('lead_id', id)
    const { error: eManual } = await supabase.from('manual_tasks').delete().eq('lead_id', id)

    const errorLimpieza = eHist || eAuto || eManual
    if (errorLimpieza) {
      setEliminando(false)
      alert('No se pudo eliminar el lead: ' + errorLimpieza.message)
      return
    }

    const { error } = await supabase.from('leads').delete().eq('id', id)
    setEliminando(false)

    if (error) {
      alert('No se pudo eliminar el lead: ' + error.message)
      return
    }

    navigate('/leads', { replace: true })
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

  if (loading)
    return (
      <p className="p-4 text-sm" style={{ color: C.textSecondary, backgroundColor: C.bg, minHeight: '100vh' }}>
        Cargando lead...
      </p>
    )
  if (error) return <p className="p-4 text-sm text-red-600">Error: {error}</p>
  if (!lead) return null

  if (!esDirector && lead.asesor_id !== profile?.id) {
    return (
      <div className="p-4 pb-24 max-w-3xl mx-auto min-h-screen" style={{ backgroundColor: C.bg }}>
        <Link to="/leads" className="text-sm font-medium hover:underline" style={{ color: C.navy }}>
          ← Volver a Leads
        </Link>
        <p className="mt-4 text-sm text-red-600">Este lead no está asignado a ti, no tienes acceso a su ficha.</p>
      </div>
    )
  }

  const info = estadoInfo(lead.estado)
  const link = waLink(lead.telefono)
  const link2 = waLink(lead.telefono_2)
  const misionesPendientes = misiones.filter((m) => !m.completado_at)
  const misionesCumplidas = misiones.filter((m) => m.completado_at)

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: C.bg }}>
      <div className="p-4 max-w-3xl mx-auto">
        <Link
          to="/leads"
          className="inline-flex items-center gap-1.5 text-sm font-medium mb-3"
          style={{ color: C.textPrimary }}
        >
          <IconArrowLeft size={14} />
          Volver a Leads
        </Link>

        {/* Header con nombre, estado actual y acceso rápido a WhatsApp */}
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.navy }}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold text-white leading-tight">{lead.empresa || lead.nombre_contacto}</h1>
              <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>{lead.nombre_contacto}</p>
            </div>
            <span
              className="text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap"
              style={{ backgroundColor: info.bg, color: info.text }}
            >
              {info.label}
            </span>
          </div>

          {/* Motivo de venta perdida: se guarda al cambiar el estado (aquí o
              desde la Hoja de Ruta) pero antes no se mostraba en ningún
              lado — ahora queda visible justo debajo del estado. */}
          {lead.estado === 'venta_perdida' && lead.motivo_perdida && (
            <div className="mt-3 rounded-lg p-2.5 flex items-start gap-2" style={{ backgroundColor: 'rgba(163,45,45,0.18)' }}>
              <IconAlertTriangle size={13} style={{ color: '#F5A3A3', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p className="text-[11px] font-medium" style={{ color: '#F5A3A3' }}>Motivo de la venta perdida</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.85)' }}>{lead.motivo_perdida}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2"
                style={{ backgroundColor: 'rgba(29,158,117,0.18)' }}
              >
                <IconMessage size={14} style={{ color: '#5DCAA5' }} />
                <span className="text-xs font-medium" style={{ color: '#5DCAA5' }}>
                  WhatsApp — {lead.telefono}
                </span>
              </a>
            )}
            {link2 && (
              <a
                href={link2}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2"
                style={{ backgroundColor: 'rgba(29,158,117,0.18)' }}
              >
                <IconMessage size={14} style={{ color: '#5DCAA5' }} />
                <span className="text-xs font-medium" style={{ color: '#5DCAA5' }}>
                  WhatsApp 2 — {lead.telefono_2}
                </span>
              </a>
            )}
          </div>
        </div>

        {/* Datos del lead y estado del embudo — un solo formulario, un solo botón */}
        <form
          onSubmit={guardarTodo}
          className="rounded-2xl p-4 mb-4 space-y-3"
          style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}
        >
          <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Datos del lead y estado del embudo</h2>

          <div>
            <label className="text-xs" style={{ color: C.textSecondary }}>Estado del embudo</label>
            <div className="flex gap-1.5 overflow-x-auto pb-1 mt-1.5">
              {ESTADOS.map((e) => {
                const activo = nuevoEstado === e.value
                return (
                  <button
                    type="button"
                    key={e.value}
                    onClick={() => setNuevoEstado(e.value)}
                    className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap"
                    style={
                      activo
                        ? { backgroundColor: e.text, color: '#FFFFFF' }
                        : { backgroundColor: e.bg, color: e.text }
                    }
                  >
                    {e.label}
                  </button>
                )
              })}
            </div>
          </div>

          {nuevoEstado === 'venta_perdida' && (
            <div>
              <textarea
                value={motivoPerdida}
                onChange={(e) => setMotivoPerdida(e.target.value)}
                placeholder={
                  lead.motivo_perdida
                    ? `Motivo actual: "${lead.motivo_perdida}" — escribe aquí solo si quieres reemplazarlo`
                    : 'Motivo de la venta perdida (obligatorio)'
                }
                rows={2}
                className={inputCls}
                style={inputStyle}
              />
              {lead.motivo_perdida && !motivoPerdida.trim() && (
                <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>
                  Se conservará el motivo ya guardado si dejas esto vacío.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Nombre del contacto</label>
              <input
                type="text"
                value={form.nombre_contacto}
                onChange={(e) => cambiarForm('nombre_contacto', e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Negocio</label>
              <input
                type="text"
                value={form.empresa}
                onChange={(e) => cambiarForm('empresa', e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Teléfono</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => cambiarForm('telefono', e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Teléfono alterno (opcional)</label>
              <input
                type="tel"
                value={form.telefono_2}
                onChange={(e) => cambiarForm('telefono_2', e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Correo</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => cambiarForm('email', e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Ciudad</label>
              <input
                type="text"
                value={form.ciudad}
                onChange={(e) => cambiarForm('ciudad', e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Origen</label>
              <select
                value={form.origen}
                onChange={(e) => cambiarForm('origen', e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                <option value="">Sin definir</option>
                {ORIGENES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {esDirector && (
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Asesor asignado</label>
                <select
                  value={form.asesor_id}
                  onChange={(e) => cambiarForm('asesor_id', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                >
                  <option value="">Sin asesor</option>
                  {asesores.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name || a.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs" style={{ color: C.textSecondary }}>Valor cotizado</label>
              <input
                type="number"
                value={form.valor_cotizado}
                onChange={(e) => cambiarForm('valor_cotizado', e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div className="flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                id="requiere_visita"
                checked={form.requiere_visita}
                onChange={(e) => cambiarForm('requiere_visita', e.target.checked)}
              />
              <label htmlFor="requiere_visita" className="text-sm" style={{ color: C.textSecondary }}>
                Requiere visita
              </label>
            </div>
            {form.requiere_visita && (
              <div>
                <label className="text-xs" style={{ color: C.textSecondary }}>Fecha de la visita (obligatoria)</label>
                <input
                  type="date"
                  value={form.fecha_visita}
                  onChange={(e) => cambiarForm('fecha_visita', e.target.value)}
                  className={inputCls}
                  style={inputStyle}
                />
                <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>
                  Al guardar, se programa automáticamente una misión de "Visita programada" en la Hoja de ruta.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs" style={{ color: C.textSecondary }}>Notas de diagnóstico</label>
            <textarea
              value={form.notas_diagnostico}
              onChange={(e) => cambiarForm('notas_diagnostico', e.target.value)}
              rows={3}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs" style={{ color: C.textSecondary }}>Notas de cotización</label>
            <textarea
              value={form.notas_cotizacion}
              onChange={(e) => cambiarForm('notas_cotizacion', e.target.value)}
              rows={2}
              className={inputCls}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="text-xs" style={{ color: C.textSecondary }}>
              Código de cotización (obligatorio para "Cotización formal")
            </label>
            <input
              type="text"
              value={form.codigo_cotizacion}
              onChange={(e) => cambiarForm('codigo_cotizacion', e.target.value)}
              placeholder="Ej: COT-2026-014"
              className={inputCls}
              style={inputStyle}
            />
          </div>

          {formMsg && (
            <p className={`text-sm ${formMsg.tipo === 'error' ? 'text-red-600' : ''}`} style={formMsg.tipo === 'ok' ? { color: '#0F6E56' } : undefined}>
              {formMsg.texto}
            </p>
          )}

          <button
            type="submit"
            disabled={guardandoForm}
            className="w-full text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-60"
            style={{ backgroundColor: C.navy, color: '#FFFFFF' }}
          >
            {guardandoForm ? 'Guardando...' : 'Guardar cambios y estado'}
          </button>
        </form>

        {esDirector && (
          <button
            onClick={eliminarLead}
            disabled={eliminando}
            className="w-full text-sm font-medium px-4 py-2.5 rounded-xl mb-4 disabled:opacity-60"
            style={{ border: '1px solid #F5C6C6', color: '#A32D2D', backgroundColor: '#FCEBEB' }}
          >
            {eliminando ? 'Eliminando...' : 'Eliminar lead'}
          </button>
        )}

        {/* Misiones pendientes */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <IconClipboard size={14} style={{ color: C.textPrimary }} />
            <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Misiones pendientes</h2>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
            {misionesPendientes.length === 0 && (
              <p className="text-sm" style={{ color: C.textMuted }}>No hay misiones pendientes.</p>
            )}
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
                      <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                        Programada: {m.fecha_programada ? new Date(m.fecha_programada).toLocaleDateString('es-CO') : '—'}
                      </p>
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
                    <p className="text-xs mt-1" style={{ color: C.textMuted }}>
                      Cumplida: {new Date(m.completado_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Historial de estados */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <IconHistory size={14} style={{ color: C.textPrimary }} />
            <h2 className="text-sm font-semibold" style={{ color: C.textPrimary }}>Historial de estados</h2>
          </div>
          <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
            {historial.length === 0 && (
              <p className="text-sm" style={{ color: C.textMuted }}>Sin cambios de estado registrados.</p>
            )}
            <div className="space-y-2">
              {historial.map((h) => {
                const hInfo = estadoInfo(h.estado)
                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between text-sm pb-2"
                    style={{ borderBottom: `0.5px solid ${C.border}` }}
                  >
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: hInfo.bg, color: hInfo.text }}
                    >
                      {hInfo.label}
                    </span>
                    <span className="text-xs" style={{ color: C.textMuted }}>
                      {new Date(h.changed_at).toLocaleString('es-CO')} · asesor del lead en ese momento:{' '}
                      {nombreAsesor(asesores, h.changed_by)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
