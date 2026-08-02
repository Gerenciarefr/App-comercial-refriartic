export default function ProgressGoal({ etiqueta, actual, meta, unidad = '' }) {
  const pct = meta > 0 ? Math.min(100, Math.round((actual / meta) * 100)) : 0
  const faltan = Math.max(0, meta - actual)

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-slate-600">{etiqueta}</p>
        <p className="text-sm font-bold text-brand-600">{pct}%</p>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-1.5">
        {faltan > 0
          ? `Te faltan ${faltan} ${unidad} para llegar a tu meta`
          : '¡Meta cumplida! 🎉'}
      </p>
    </div>
  )
}
