import { supabase } from './supabaseClient'

// Punto 5: busca en qué posición está el asesor en el ranking de la semana
// actual y trae la nota programada por el director para esa posición.
// Se usa tanto en PerfilAsesor.jsx (el asesor viéndose a sí mismo) como en
// AsesorDetalle.jsx (el director viendo la ficha de un asesor).
export async function obtenerNotaRanking(asesorId) {
  if (!asesorId) return null

  const { data: ranking, error: eRanking } = await supabase.rpc('fn_ranking_semana', { p_offset_semanas: 0 })
  if (eRanking || !ranking) return null

  const posicion = ranking.findIndex((r) => r.asesor_id === asesorId) + 1
  if (posicion <= 0) return null

  const { data: nota, error: eNota } = await supabase
    .from('notas_ranking')
    .select('mensaje')
    .eq('posicion', posicion)
    .maybeSingle()

  if (eNota || !nota?.mensaje?.trim()) return { posicion, mensaje: null }
  return { posicion, mensaje: nota.mensaje }
}
