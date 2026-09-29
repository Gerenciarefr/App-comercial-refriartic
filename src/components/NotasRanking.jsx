import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

// Punto 5: el director programa una nota por cada posición del ranking
// (1°, 2°, 3°...). La cantidad de notas se ajusta sola según cuántos
// asesores activos hay en este momento — si hay 4 asesores, se piden 4
// notas; si mañana hay 5, aparece automáticamente una quinta casilla.
export default function NotasRanking() {
  const [totalAsesores, setTotalAsesores] = useState(0)
  const [notas, setNotas] = useState([]) // [{ posicion, mensaje }]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [guardarMsg, setGuardarMsg] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [{ count, error: eCount }, { data: notasData, error: eNotas }] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('rol', 'asesor').eq('active', true),
      supabase.from('notas_ranking').select('*').order('posicion', { ascending: true }),
    ])

    if (eCount || eNotas) {
      setError((eCount || eNotas).message)
      setLoading(false)
      return
    }

    const n = count || 0
    const notasMap = Object.fromEntries((notasData || []).map((x) => [x.posicion, x.mensaje]))
    setTotalAsesores(n)
    setNotas(Array.from({ length: n }, (_, i) => ({ posicion: i + 1, mensaje: notasMap[i + 1] || '' })))
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const actualizarNota = (posicion, mensaje) => {
    setNotas((prev) => prev.map((n) => (n.posicion === posicion ? { ...n, mensaje } : n)))
    setGuardarMsg(null)
  }

  const guardarTodo = async () => {
    setGuardando(true)
    setGuardarMsg(null)

    const { error } = await supabase
      .from('notas_ranking')
      .upsert(
        notas.map((n) => ({ posicion: n.posicion, mensaje: n.mensaje.trim(), updated_at: new Date().toISOString() })),
        { onConflict: 'posicion' }
      )

    setGuardando(false)

    if (error) {
      setGuardarMsg({ tipo: 'error', texto: error.message })
    } else {
      setGuardarMsg({ tipo: 'ok', texto: 'Notas guardadas correctamente.' })
    }
  }

  const ordinal = (n) => {
    const map = { 1: '1°', 2: '2°', 3: '3°', 4: '4°', 5: '5°', 6: '6°', 7: '7°', 8: '8°', 9: '9°', 10: '10°' }
    return map[n] || `${n}°`
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Escribe la nota que verá cada asesor debajo de su nombre, según la posición en la que se encuentre en el
        ranking en este momento. Hay {totalAsesores} asesor{totalAsesores !== 1 ? 'es' : ''} activo
        {totalAsesores !== 1 ? 's' : ''}, así que se muestran {totalAsesores} nota{totalAsesores !== 1 ? 's' : ''}
        —una por cada puesto posible del ranking.
      </p>

      {loading && <p className="text-sm text-gray-500 mb-3">Cargando...</p>}
      {error && <p className="text-sm text-red-600 mb-3">Error: {error}</p>}

      {!loading && !error && (
        <>
          <div className="space-y-3">
            {notas.map((n) => (
              <div key={n.posicion} className="bg-white rounded-xl shadow-sm p-4">
                <p className="font-semibold text-gray-800 text-sm mb-2">Puesto {ordinal(n.posicion)} del ranking</p>
                <textarea
                  value={n.mensaje}
                  onChange={(e) => actualizarNota(n.posicion, e.target.value)}
                  rows={2}
                  placeholder="Ej: ¡Vas liderando la semana, sigue así!"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={guardarTodo}
              disabled={guardando}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : 'Guardar notas'}
            </button>
            {guardarMsg && (
              <span className={`text-sm ${guardarMsg.tipo === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                {guardarMsg.texto}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
