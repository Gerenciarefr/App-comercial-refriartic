import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabaseClient'

// ---------------------------------------------------------------------------
// Estados del embudo de leads — fuente única para toda la plataforma.
//
// Los estados viven en la tabla `estados_lead` y el director los administra
// desde Ajustes → "Estados de lead" (crear, renombrar, reordenar, eliminar).
// Cada estado tiene una CLAVE estable (lo que se guarda en leads.estado) y
// un NOMBRE editable (lo que ve la gente). Por eso el código puede seguir
// comparando contra 'venta_hecha', 'cotizacion_formal', etc. aunque el
// director les cambie el nombre.
//
// Claves protegidas (se renombran, nunca se eliminan, porque el sistema
// depende de ellas): cotizacion_informal, cotizacion_formal, venta_perdida,
// venta_hecha.
// ---------------------------------------------------------------------------

// Respaldo por si la consulta falla o todavía no ha respondido: son los
// mismos 7 estados de siempre, así la pantalla nunca queda sin estados.
const RESPALDO = [
  { value: 'no_responde', label: 'No responde', bg: '#EDEDE7', text: '#5F5E5A', orden: 1, protegido: false, esInicial: true, activo: true },
  { value: 'contactado', label: 'Contactado', bg: '#E6F1FB', text: '#0C447C', orden: 2, protegido: false, esInicial: false, activo: true },
  { value: 'cotizacion_informal', label: 'Cotización informal', bg: '#FAEEDA', text: '#854F0B', orden: 3, protegido: true, esInicial: false, activo: true },
  { value: 'cotizacion_formal', label: 'Cotización formal', bg: '#EEEDFE', text: '#3C3489', orden: 4, protegido: true, esInicial: false, activo: true },
  { value: 'proximo_a_vender', label: 'Próximo a vender', bg: '#FBEAF0', text: '#993556', orden: 5, protegido: false, esInicial: false, activo: true },
  { value: 'venta_perdida', label: 'Venta perdida', bg: '#FCEBEB', text: '#A32D2D', orden: 6, protegido: true, esInicial: false, activo: true },
  { value: 'venta_hecha', label: 'Venta hecha', bg: '#E1F5EE', text: '#085041', orden: 7, protegido: true, esInicial: false, activo: true },
]

const SIN_ESTADO = { bg: '#EDEDE7', text: '#5F5E5A' }
const VIGENCIA_MS = 30 * 1000

// `todos` incluye también los estados eliminados (activo = false) para que
// el historial de un lead siga mostrando el nombre que tenía ese estado.
let store = { todos: RESPALDO, activos: RESPALDO, cargado: false }
let ultimaCarga = 0
let cargaEnCurso = null
const suscriptores = new Set()

function publicar(todos) {
  const ordenados = [...todos].sort((a, b) => a.orden - b.orden)
  store = { todos: ordenados, activos: ordenados.filter((e) => e.activo), cargado: true }
  suscriptores.forEach((fn) => fn())
}

function suscribir(fn) {
  suscriptores.add(fn)
  return () => suscriptores.delete(fn)
}

function leerStore() {
  return store
}

// Trae los estados desde Supabase y avisa a todas las pantallas abiertas.
// Con `forzar` ignora la vigencia (se usa justo después de editar en Ajustes).
export function recargarEstadosLead(forzar = false) {
  if (cargaEnCurso) {
    // Si piden una carga forzada mientras hay otra en curso, la que está en
    // curso pudo haber empezado antes del cambio: se encadena una nueva.
    return forzar ? cargaEnCurso.then(() => recargarEstadosLead(true)) : cargaEnCurso
  }
  if (!forzar && store.cargado && Date.now() - ultimaCarga < VIGENCIA_MS) return Promise.resolve(store)

  cargaEnCurso = supabase
    .from('estados_lead')
    .select('clave, nombre, orden, protegido, es_inicial, activo, color_bg, color_text')
    .order('orden', { ascending: true })
    .then(({ data, error }) => {
      cargaEnCurso = null
      if (error || !data || data.length === 0) return store
      ultimaCarga = Date.now()
      publicar(
        data.map((r) => ({
          value: r.clave,
          label: r.nombre,
          bg: r.color_bg,
          text: r.color_text,
          orden: r.orden,
          protegido: r.protegido,
          esInicial: r.es_inicial,
          activo: r.activo,
        }))
      )
      return store
    })
  return cargaEnCurso
}

// Nombre y colores de un estado a partir de su clave. Sirve fuera de los
// componentes (no es un hook); la pantalla que lo use debe llamar también a
// useEstadosLead() para volver a pintarse cuando lleguen los datos.
export function estadoInfo(clave) {
  return store.todos.find((e) => e.value === clave) || { value: clave, label: clave || 'Sin estado', ...SIN_ESTADO }
}

// Hook para las pantallas:
//   estados  → estados vigentes, en el orden que definió el director
//   inicial  → clave del estado que reciben los leads nuevos
//   recargar → vuelve a consultar (forzado)
export function useEstadosLead() {
  const actual = useSyncExternalStore(suscribir, leerStore, leerStore)

  useEffect(() => {
    recargarEstadosLead()
  }, [])

  const inicial = actual.activos.find((e) => e.esInicial)?.value || actual.activos[0]?.value || 'no_responde'

  return {
    estados: actual.activos,
    todos: actual.todos,
    inicial,
    cargado: actual.cargado,
    recargar: () => recargarEstadosLead(true),
  }
}
