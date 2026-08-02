import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'
import MissionCard from '../components/MissionCard'
import ProgressGoal from '../components/ProgressGoal'

// Meta de ejemplo — las metas reales por asesor todavía están pendientes
// (se definirán en Ajustes). Esto no afecta el marcado de misiones.
const META_DEMO = { etiqueta: 'Ventas del mes', actual: 3, meta: 8, unidad: 'ventas' }

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
  bodegaje_alerta_1: 'Bodegaje · aviso 12 días',
  bodegaje_alerta_2: 'Bodegaje · aviso seguimiento',
}

const TIPO_VISITA_LABELS = {
  recorrido_zona: 'Recorrido de zona',
  apoyo_entrega: 'Apoyo de entrega',
  cita_programada: 'Cita programada',
  visita_postventa: 'Visita de postventa',
}

// Icono/color de MissionCard: 'visita' | 'entrega' | 'llamada' | 'reclutamiento'
// | 'recorrido_zona' | 'cotizacion' | 'postventa' | 'seguimiento'
function iconoAutomatica(tipo) {
  if (['contactar_lead', 'seguimiento_cotizacion', 'recordatorio_etapa', 'recontactar_1', 'recontactar_2', 'recontactar_3'].includes(tipo)) {
    return 'seguimiento'
  }
  if (tipo === 'entrega_cliente' || tipo === 'confirmar_entrega' || tipo === 'bodegaje_alerta_1' || tipo === 'bodegaje_alerta_2') return 'entrega'
  if (tipo?.startsWith('postventa_')) return 'postventa'
  if (tipo === 'visita_programada') return 'visita'
  return 'seguimiento'
}

function iconoVisita(tipoVisita) {
  if (tipoVisita === 'recorrido_zona') return 'recorrido_zona'
  if (tipoVisita === 'apoyo_entrega') return 'entrega'
  if (tipoVisita === 'visita_postventa') return 'postventa'
  return 'visita'
}

function soloNumeros(telefono) {
  return (telefono || '').replace(/\D/g, '')
}

export default function Dashboard() {
  const { session } = useAuth()
  const asesorId = session?.user?.id

  const [misiones, setMisiones] = useState([])
  const [meta] = useState(META_DEMO)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarPlanDelDia = useCallback(async () => {
    if (!asesorId) return
    setCargando(true)
    setError(null)

    const hoy = new Date().toISOString().slice(0, 10)

    const [{ data: automaticas, error: e1 }, { data: manuales, error: e2 }] = await Promise.all([
      supabase.from('automated_tasks').select('*').eq('asesor_id', asesorId).eq('fecha_programada', hoy),
      supabase.from('manual_tasks').select('*').eq('asesor_id', asesorId).eq('fecha_programada', hoy),
    ])

    if (e1 || e2) {
      console.error(e1 || e2)
      setError('No se pudo cargar el plan del día.')
      setCargando(false)
      return
    }

    const leadIds = new Set()
    const clientIds = new Set()
    ;[...(automaticas || []), ...(manuales || [])].forEach((t) => {
      if (t.lead_id) leadIds.add(t.lead_id)
      if (t.client_id) clientIds.add(t.client_id)
    })

    const [leadsRes, clientsRes] = await Promise.all([
      leadIds.size > 0
        ? supabase.from('leads').select('id, empresa, nombre_contacto, telefono').in('id', [...leadIds])
        : Promise.resolve({ data: [] }),
      clientIds.size > 0
        ? supabase.from('clients').select('id, empresa, nombre_contacto, telefono').in('id', [...clientIds])
        : Promise.resolve({ data: [] }),
    ])

    const leadsMap = Object.fromEntries((leadsRes.data || []).map((l) => [l.id, l]))
    const clientsMap = Object.fromEntries((clientsRes.data || []).map((c) => [c.id, c]))

    const contactoDe = (t) => (t.client_id && clientsMap[t.client_id]) || (t.lead_id && leadsMap[t.lead_id]) || null

    const auto = (automaticas || []).map((t) => {
      const contacto = contactoDe(t)
      return {
        id: `auto-${t.id}`,
        idOriginal: t.id,
        tabla: 'automated_tasks',
        tipo: iconoAutomatica(t.tipo),
        titulo: TIPO_TAREA_LABELS[t.tipo] || t.tipo,
        cliente: contacto?.empresa || contacto?.nombre_contacto || null,
        hora: t.hora_programada ? t.hora_programada.slice(0, 5) : null,
        telefono: contacto?.telefono ? soloNumeros(contacto.telefono) : null,
        mensaje: t.mensaje_sugerido,
        cumplida: !!t.completado_at,
      }
    })

    const manual = (manuales || []).map((t) => {
      const contacto = contactoDe(t)
      return {
        id: `manual-${t.id}`,
        idOriginal: t.id,
        tabla: 'manual_tasks',
        tipo: t.tipo_visita ? iconoVisita(t.tipo_visita) : 'seguimiento',
        titulo: t.tipo_visita ? TIPO_VISITA_LABELS[t.tipo_visita] || t.titulo : t.titulo,
        cliente: contacto?.empresa || contacto?.nombre_contacto || t.lugar || null,
        hora: t.hora_programada ? t.hora_programada.slice(0, 5) : null,
        telefono: contacto?.telefono ? soloNumeros(contacto.telefono) : null,
        mensaje: t.descripcion,
        cumplida: !!t.completado_at,
      }
    })

    const todas = [...auto, ...manual].sort((a, b) => {
      if (a.hora && b.hora) return a.hora.localeCompare(b.hora)
      if (a.hora) return -1
      if (b.hora) return 1
      return 0
    })

    setMisiones(todas)
    setCargando(false)
  }, [asesorId])

  useEffect(() => {
    cargarPlanDelDia()
  }, [cargarPlanDelDia])

  const toggleCumplida = async (mission) => {
    // Optimista: se ve el cambio de inmediato, y si falla se revierte.
    setMisiones((prev) => prev.map((m) => (m.id === mission.id ? { ...m, cumplida: !m.cumplida } : m)))

    const ahora = mission.cumplida ? null : new Date().toISOString()
    const { error: errUpdate } = await supabase
      .from(mission.tabla)
      .update({ completado_at: ahora })
      .eq('id', mission.idOriginal)

    if (errUpdate) {
      setMisiones((prev) => prev.map((m) => (m.id === mission.id ? { ...m, cumplida: mission.cumplida } : m)))
      alert('No se pudo actualizar la misión: ' + errUpdate.message)
    }
  }

  const hoyTexto = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="bg-brand-600 text-white px-5 pt-8 pb-6 rounded-b-3xl shadow-sm">
        <p className="text-brand-100 text-sm capitalize">{hoyTexto}</p>
        <h1 className="text-2xl font-bold mt-0.5">Tu plan del día</h1>
      </header>

      <main className="px-4 -mt-4">
        {error && (
          <div className="mb-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <section className="space-y-3">
          {cargando && <p className="text-center text-slate-400 text-sm py-6">Cargando...</p>}
          {!cargando && misiones.length === 0 && !error && (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center text-slate-400 text-sm">
              No tienes misiones asignadas para hoy 🎉
            </div>
          )}
          {misiones.map((m) => (
            <MissionCard key={m.id} mission={m} onToggleCumplida={toggleCumplida} />
          ))}
        </section>

        <h2 className="text-sm font-semibold text-slate-500 mt-6 mb-2 px-1">Tu avance</h2>
        <ProgressGoal {...meta} />
      </main>
    </div>
  )
}
