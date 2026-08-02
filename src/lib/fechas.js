// Helpers de semana lunes-domingo, en base a la fecha local del navegador
// (los asesores y Nico operan en Colombia, así que esto es suficiente).

export function lunesDeLaSemana(fecha) {
  const d = new Date(fecha)
  const dia = d.getDay() // 0 = domingo ... 6 = sábado
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function aYMD(d) {
  return d.toISOString().slice(0, 10)
}

export function rangoSemana(offsetSemanas = 0) {
  const lunes = lunesDeLaSemana(new Date())
  lunes.setDate(lunes.getDate() + offsetSemanas * 7)

  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)

  const finExclusivo = new Date(domingo)
  finExclusivo.setDate(domingo.getDate() + 1)

  return {
    inicio: aYMD(lunes),
    fin: aYMD(domingo),
    finExclusivo: aYMD(finExclusivo),
    etiqueta: `${lunes.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} — ${domingo.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`,
  }
}
