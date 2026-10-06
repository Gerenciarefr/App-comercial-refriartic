import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

const C = {
  card: '#FFFFFF',
  border: '#E5E5E5',
  textPrimary: '#14213D',
  textSecondary: '#5F5E5A',
  textMuted: '#B4B2A9',
}

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function aYMD(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function inicioSemanaStr() {
  const d = new Date()
  const dia = d.getDay()
  d.setDate(d.getDate() + (dia === 0 ? -6 : 1 - dia))
  return aYMD(d)
}
function inicioMesStr() {
  const d = new Date()
  return aYMD(new Date(d.getFullYear(), d.getMonth(), 1))
}

// Punto 1: la misma tarjeta de "Prospección" / "Ventas hechas" pero para el
// recaudo de la semana y el mes, en la grilla principal de estadísticas del
// asesor (además del texto que ya se ve dentro de Recaudos, más abajo).
//
// Por defecto muestra la semana y el mes en curso. Si la pantalla está
// viendo una semana pasada, puede pasar los rangos (fechas 'YYYY-MM-DD', el
// "hasta" no se incluye) para que el recaudo corresponda a esa semana y a
// su mes, igual que el resto de tarjetas.
export default function RecaudoStatCard({
  asesorId,
  semanaDesde,
  semanaHasta,
  mesDesde,
  mesHasta,
  textoSemana = 'esta semana',
  textoMes = 'este mes',
}) {
  const [semana, setSemana] = useState(0)
  const [mes, setMes] = useState(0)

  const cargar = useCallback(async () => {
    if (!asesorId) return
    const { data: pagos } = await supabase.from('pagos_factura').select('id').eq('asesor_id', asesorId)
    const pagoIds = (pagos || []).map((p) => p.id)
    if (pagoIds.length === 0) {
      setSemana(0)
      setMes(0)
      return
    }
    const { data: abonos } = await supabase
      .from('abonos_factura')
      .select('valor_abonado, fecha_abono')
      .in('pago_id', pagoIds)

    const inicioSemana = semanaDesde || inicioSemanaStr()
    const inicioMes = mesDesde || inicioMesStr()
    let s = 0
    let m = 0
    ;(abonos || []).forEach((a) => {
      const valor = Number(a.valor_abonado || 0)
      if (a.fecha_abono >= inicioMes && (!mesHasta || a.fecha_abono < mesHasta)) m += valor
      if (a.fecha_abono >= inicioSemana && (!semanaHasta || a.fecha_abono < semanaHasta)) s += valor
    })
    setSemana(s)
    setMes(m)
  }, [asesorId, semanaDesde, semanaHasta, mesDesde, mesHasta])

  useEffect(() => {
    cargar()
  }, [cargar])

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: C.card, border: `0.5px solid ${C.border}` }}>
      <p className="text-xs font-medium mb-2" style={{ color: C.textSecondary }}>Recaudo</p>
      <p className="text-lg font-bold leading-tight" style={{ color: C.textPrimary }}>{formatoCOP.format(semana)}</p>
      <p className="text-[11px]" style={{ color: C.textMuted }}>{textoSemana}</p>
      <div className="h-px my-2" style={{ backgroundColor: C.border }} />
      <p className="text-base font-semibold leading-tight" style={{ color: C.textSecondary }}>{formatoCOP.format(mes)}</p>
      <p className="text-[11px]" style={{ color: C.textMuted }}>{textoMes}</p>
    </div>
  )
}
