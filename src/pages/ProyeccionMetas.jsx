import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../lib/AuthContext'

const PERIODOS = [
  { key: 'semanal', label: 'Semanal' },
  { key: 'mensual', label: 'Mensual' },
  { key: 'trimestral', label: 'Trimestral' },
  { key: 'anual', label: 'Anual' },
]

function filaVacia(periodo) {
  return {
    id: null,
    periodo,
    meta_ventas_hechas: 0,
    meta_valor_sin_iva: 0,
    meta_valor_con_iva: 0,
  }
}

export default function ProyeccionMetas() {
  const { profile } = useAuth()

  const [scope, setScope] = useState('personal')
  const [asesores, setAsesores] = useState([])
  const [asesorId, setAsesorId] = useState(null)
  const [ivaPorcentaje, setIvaPorcentaje] = useState(0)

  const [metas, setMetas] = useState(PERIODOS.map((p) => filaVacia(p.key)))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [guardandoPeriodo, setGuardandoPeriodo] = useState(null)
  const [msgPeriodo, setMsgPeriodo] = useState(null)

  // Cargar asesores + IVA vigente una sola vez
  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nombre')
      .eq('rol', 'asesor')
      .order('nombre', { ascending: true })
      .then(({ data }) => {
        setAsesores(data || [])
        if (data && data.length > 0) setAsesorId((prev) => prev || data[0].id)
      })

    supabase
      .from('configuracion_general')
      .select('iva_porcentaje')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) setIvaPorcentaje(Number(data.iva_porcentaje) || 0)
      })
  }, [])

  const cargarMetas = useCallback(async () => {
    if (scope === 'personal' && !asesorId) return
    setLoading(true)
    setError(null)

    let query = supabase.from('metas_comerciales').select('*').eq('scope', scope)
    query = scope === 'personal' ? query.eq('asesor_id', asesorId) : query.is('asesor_id', null)

    const { data, error } = await query

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const filas = PERIODOS.map((p) => {
      const existente = (data || []).find((m) => m.periodo === p.key)
      return existente
        ? {
            id: existente.id,
            periodo: existente.periodo,
            meta_ventas_hechas: existente.meta_ventas_hechas,
            meta_valor_sin_iva: existente.meta_valor_sin_iva,
            meta_valor_con_iva: existente.meta_valor_con_iva,
          }
        : filaVacia(p.key)
    })

    setMetas(filas)
    setLoading(false)
  }, [scope, asesorId])

  useEffect(() => {
    cargarMetas()
  }, [cargarMetas])

  const actualizarCampo = (periodo, campo, valor) => {
    setMetas((prev) =>
      prev.map((m) => {
        if (m.periodo !== periodo) return m
        const actualizado = { ...m, [campo]: valor }
        if (campo === 'meta_valor_sin_iva') {
          const sinIva = Number(valor) || 0
          actualizado.meta_valor_con_iva = Math.round(sinIva * (1 + ivaPorcentaje / 100))
        }
        return actualizado
      })
    )
  }

  const guardarFila = async (periodo) => {
    const fila = metas.find((m) => m.periodo === periodo)
    if (!fila) return
    if (scope === 'personal' && !asesorId) return

    setGuardandoPeriodo(periodo)
    setMsgPeriodo(null)

    const payload = {
      scope,
      asesor_id: scope === 'personal' ? asesorId : null,
      periodo,
      meta_ventas_hechas: Number(fila.meta_ventas_hechas) || 0,
      meta_valor_sin_iva: Number(fila.meta_valor_sin_iva) || 0,
      meta_valor_con_iva: Number(fila.meta_valor_con_iva) || 0,
      updated_at: new Date().toISOString(),
      updated_by: profile?.id || null,
    }

    let resultado
    if (fila.id) {
      resultado = await supabase.from('metas_comerciales').update(payload).eq('id', fila.id).select().single()
    } else {
      resultado = await supabase.from('metas_comerciales').insert(payload).select().single()
    }

    setGuardandoPeriodo(null)

    if (resultado.error) {
      setMsgPeriodo({ periodo, tipo: 'error', texto: resultado.error.message })
      return
    }

    setMetas((prev) => prev.map((m) => (m.periodo === periodo ? { ...m, id: resultado.data.id } : m)))
    setMsgPeriodo({ periodo, tipo: 'ok', texto: 'Meta guardada.' })
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Define las metas de Ventas hechas y Valor vendido por periodo. Los valores se pueden editar cuando quieras.
      </p>

      {/* Selector de scope */}
      <div className="flex gap-2 mb-3">
        {[
          { key: 'personal', label: 'Personal' },
          { key: 'grupal', label: 'Equipo comercial' },
          { key: 'empresa', label: 'Empresa' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg ${
              scope === s.key ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Meta de empresa: sin filtros, incluye a todos los asesores registrados */}
      {scope === 'empresa' && (
        <p className="text-xs text-gray-500 mb-4">
          Esta meta se compara contra el desempeño de todos los asesores registrados, sin filtros.
        </p>
      )}

      {scope === 'grupal' && (
        <p className="text-xs text-gray-500 mb-4">
          Esta meta se compara en Resumen contra los asesores que el director tenga seleccionados en el filtro
          (2 o más). Si selecciona solo 1, se compara contra la meta Personal de ese asesor en su lugar.
        </p>
      )}

      {/* Selector de asesor, solo si scope = personal */}
      {scope === 'personal' && (
        <select
          value={asesorId || ''}
          onChange={(e) => setAsesorId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 w-full max-w-xs"
        >
          {asesores.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre || 'Sin nombre'}
            </option>
          ))}
        </select>
      )}

      {loading && <p className="text-sm text-gray-500 mb-3">Cargando metas...</p>}
      {error && <p className="text-sm text-red-600 mb-3">Error: {error}</p>}

      <div className="space-y-3">
        {PERIODOS.map((p) => {
          const fila = metas.find((m) => m.periodo === p.key) || filaVacia(p.key)
          return (
            <div key={p.key} className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">{p.label}</h3>

              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Ventas hechas (cantidad)</label>
                  <input
                    type="number"
                    value={fila.meta_ventas_hechas}
                    onChange={(e) => actualizarCampo(p.key, 'meta_ventas_hechas', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Valor sin IVA</label>
                  <input
                    type="number"
                    value={fila.meta_valor_sin_iva}
                    onChange={(e) => actualizarCampo(p.key, 'meta_valor_sin_iva', e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                  />
                </div>
              </div>

              <p className="text-xs text-gray-400 mb-2">
                Con IVA: ${Number(fila.meta_valor_con_iva || 0).toLocaleString('es-CO')}
              </p>

              <div className="flex items-center justify-between">
                {msgPeriodo?.periodo === p.key && (
                  <p className={`text-xs ${msgPeriodo.tipo === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                    {msgPeriodo.texto}
                  </p>
                )}
                <button
                  onClick={() => guardarFila(p.key)}
                  disabled={guardandoPeriodo === p.key}
                  className="ml-auto bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-60"
                >
                  {guardandoPeriodo === p.key ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
