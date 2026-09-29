import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const C = {
  navy: '#14213D',
  orange: '#FCA311',
  card: '#FFFFFF',
  border: '#E5E5E5',
  textPrimary: '#14213D',
  textSecondary: '#5F5E5A',
  textMuted: '#B4B2A9',
}

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})
const formatoCorto = (n) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return `${n}`
}

// Valor vendido (con IVA), mes a mes del año en curso, para el grupo de
// asesores seleccionado — mismo alcance que "Avance de metas", del que
// siempre va justo debajo.
export default function GraficoValorVendidoAnual({ asesorIds }) {
  const [porMes, setPorMes] = useState(Array(12).fill(0))
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    if (!asesorIds || asesorIds.length === 0) {
      setPorMes(Array(12).fill(0))
      setCargando(false)
      return
    }
    setCargando(true)

    const anioActual = new Date().getFullYear()
    const inicio = `${anioActual}-01-01T00:00:00`
    const fin = `${anioActual + 1}-01-01T00:00:00`

    const { data: clientes } = await supabase.from('clients').select('id').in('asesor_id', asesorIds)
    const clientIds = (clientes || []).map((c) => c.id)

    if (clientIds.length === 0) {
      setPorMes(Array(12).fill(0))
      setCargando(false)
      return
    }

    const { data: pedidos } = await supabase
      .from('order_ops')
      .select('valor_con_iva, created_at')
      .in('client_id', clientIds)
      .gte('created_at', inicio)
      .lt('created_at', fin)

    const acumulado = Array(12).fill(0)
    ;(pedidos || []).forEach((p) => {
      const mes = new Date(p.created_at).getMonth()
      acumulado[mes] += Number(p.valor_con_iva || 0)
    })
    setPorMes(acumulado)
    setCargando(false)
  }, [asesorIds])

  useEffect(() => {
    cargar()
  }, [cargar])

  const maximo = Math.max(1, ...porMes)
  const total = porMes.reduce((a, b) => a + b, 0)
  const mesActual = new Date().getMonth()

  return (
    <section>
      <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold" style={{ color: C.textPrimary }}>
            Valor vendido por mes (con IVA)
          </p>
          <p className="text-xs" style={{ color: C.textMuted }}>{new Date().getFullYear()}</p>
        </div>

        {cargando ? (
          <p className="text-sm text-center py-6" style={{ color: C.textMuted }}>Cargando...</p>
        ) : asesorIds?.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: C.textMuted }}>Selecciona al menos un asesor.</p>
        ) : (
          <>
            <div className="flex items-end gap-1.5 h-32">
              {porMes.map((valor, i) => {
                const alturaPct = Math.max(2, Math.round((valor / maximo) * 100))
                const esMesActual = i === mesActual
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        height: `${alturaPct}%`,
                        backgroundColor: esMesActual ? C.orange : C.navy,
                        opacity: esMesActual ? 1 : 0.85,
                      }}
                      title={formatoCOP.format(valor)}
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-1.5 mt-1.5">
              {MESES_CORTOS.map((m, i) => (
                <p
                  key={m}
                  className="flex-1 text-center text-[10px]"
                  style={{ color: i === mesActual ? C.orange : C.textMuted, fontWeight: i === mesActual ? 700 : 400 }}
                >
                  {m}
                </p>
              ))}
            </div>
            <p className="text-xs mt-3 text-center" style={{ color: C.textSecondary }}>
              Total del año: <strong style={{ color: C.textPrimary }}>{formatoCorto(total)}</strong>{' '}
              ({formatoCOP.format(total)})
            </p>
          </>
        )}
      </div>
    </section>
  )
}
