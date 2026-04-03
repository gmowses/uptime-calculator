import { useState, useEffect } from 'react'
import { Sun, Moon, Languages, Activity } from 'lucide-react'

// ── i18n ─────────────────────────────────────────────────────────────────────
const translations = {
  en: {
    title: 'Uptime Calculator',
    subtitle: 'Calculate uptime % from downtime, or find max allowed downtime from a target SLA. Shows all downtime budgets per period.',
    modeDowntime: 'Downtime to Uptime %',
    modeSla: 'SLA % to Max Downtime',
    downtimeInput: 'Total Downtime',
    downtimeUnit: 'Unit',
    period: 'Per period',
    slaTarget: 'Target SLA (%)',
    uptimeResult: 'Uptime',
    slaLevel: 'SLA Level',
    downtimeBudgets: 'Downtime Budgets',
    maxDowntime: 'Max Allowed Downtime',
    perHour: 'Per hour',
    perDay: 'Per day',
    perWeek: 'Per week',
    perMonth: 'Per month',
    perYear: 'Per year',
    units: { minutes: 'Minutes', hours: 'Hours', seconds: 'Seconds' },
    periods: { hour: 'Hour', day: 'Day', week: 'Week', month: 'Month', year: 'Year' },
    nines: 'Nines',
    slaLevels: 'SLA Reference Levels',
    yourUptime: 'Your result',
    aboveSla: 'above',
    belowSla: 'below',
    disclaimer: 'Based on average month (30.44 days) and average year (365.25 days).',
    builtBy: 'Built by',
    seconds: 's', minutes: 'min', hours: 'h', days: 'd',
  },
  pt: {
    title: 'Calculadora de Uptime',
    subtitle: 'Calcule o % de uptime a partir do downtime, ou encontre o downtime maximo para um SLA alvo. Mostra os budgets de downtime por periodo.',
    modeDowntime: 'Downtime para Uptime %',
    modeSla: 'SLA % para Downtime Maximo',
    downtimeInput: 'Downtime Total',
    downtimeUnit: 'Unidade',
    period: 'Por periodo',
    slaTarget: 'SLA Alvo (%)',
    uptimeResult: 'Uptime',
    slaLevel: 'Nivel de SLA',
    downtimeBudgets: 'Budgets de Downtime',
    maxDowntime: 'Downtime Maximo Permitido',
    perHour: 'Por hora',
    perDay: 'Por dia',
    perWeek: 'Por semana',
    perMonth: 'Por mes',
    perYear: 'Por ano',
    units: { minutes: 'Minutos', hours: 'Horas', seconds: 'Segundos' },
    periods: { hour: 'Hora', day: 'Dia', week: 'Semana', month: 'Mes', year: 'Ano' },
    nines: 'Noves',
    slaLevels: 'Niveis de SLA de Referencia',
    yourUptime: 'Seu resultado',
    aboveSla: 'acima',
    belowSla: 'abaixo',
    disclaimer: 'Baseado em mes medio (30,44 dias) e ano medio (365,25 dias).',
    builtBy: 'Criado por',
    seconds: 's', minutes: 'min', hours: 'h', days: 'd',
  },
} as const

type Lang = keyof typeof translations

// ── Math ──────────────────────────────────────────────────────────────────────
const PERIOD_SECONDS: Record<string, number> = {
  hour: 3600,
  day: 86400,
  week: 604800,
  month: 30.44 * 86400,
  year: 365.25 * 86400,
}

const UNIT_SECONDS: Record<string, number> = {
  seconds: 1,
  minutes: 60,
  hours: 3600,
}

function fmtDowntime(seconds: number): string {
  if (seconds < 1) return `< 1s`
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(2)} h`
  return `${(seconds / 86400).toFixed(2)} d`
}

const SLA_LEVELS = [
  { label: '90%', pct: 90 },
  { label: '95%', pct: 95 },
  { label: '99%', pct: 99, nines: '2 nines' },
  { label: '99.5%', pct: 99.5 },
  { label: '99.9%', pct: 99.9, nines: '3 nines' },
  { label: '99.95%', pct: 99.95 },
  { label: '99.99%', pct: 99.99, nines: '4 nines' },
  { label: '99.999%', pct: 99.999, nines: '5 nines' },
  { label: '99.9999%', pct: 99.9999, nines: '6 nines' },
]

function getNearestSla(pct: number) {
  let nearest = SLA_LEVELS[0]
  let minDist = Math.abs(pct - SLA_LEVELS[0].pct)
  for (const lvl of SLA_LEVELS) {
    const d = Math.abs(pct - lvl.pct)
    if (d < minDist) { minDist = d; nearest = lvl }
  }
  return nearest
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function UptimeCalculator() {
  const [lang, setLang] = useState<Lang>(() => (navigator.language.startsWith('pt') ? 'pt' : 'en'))
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const [mode, setMode] = useState<'downtime' | 'sla'>('downtime')

  // Mode A: downtime -> uptime%
  const [downtimeValue, setDowntimeValue] = useState('5')
  const [downtimeUnit, setDowntimeUnit] = useState('minutes')
  const [downtimePeriod, setDowntimePeriod] = useState('month')

  // Mode B: sla% -> max downtime
  const [slaTarget, setSlaTarget] = useState('99.9')

  const t = translations[lang]

  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])

  // ── Calculations ──────────────────────────────────────────────────────────
  const periodSec = PERIOD_SECONDS[downtimePeriod]
  const downtimeSec = (parseFloat(downtimeValue) || 0) * UNIT_SECONDS[downtimeUnit]
  const uptimePct = Math.max(0, Math.min(100, ((periodSec - downtimeSec) / periodSec) * 100))
  const nearestSla = getNearestSla(uptimePct)

  const slaTargetNum = parseFloat(slaTarget) || 99.9
  const slaDowntimeFrac = (100 - slaTargetNum) / 100

  const budgetsForMode = (pct: number) => {
    const downFrac = (100 - pct) / 100
    return Object.entries(PERIOD_SECONDS).map(([key, sec]) => ({
      key,
      seconds: sec * downFrac,
    }))
  }

  const budgets = mode === 'sla' ? budgetsForMode(slaTargetNum) : budgetsForMode(uptimePct)

  const inputCls = 'w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500'
  const labelCls = 'block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1'

  const displayPct = mode === 'downtime' ? uptimePct : slaTargetNum
  const displaySla = mode === 'downtime' ? nearestSla : getNearestSla(slaTargetNum)

  const pctColor = displayPct >= 99.99 ? '#10b981' : displayPct >= 99.9 ? '#22c55e' : displayPct >= 99 ? '#84cc16' : displayPct >= 95 ? '#eab308' : '#ef4444'

  const periods: Array<keyof typeof t.periods> = ['hour', 'day', 'week', 'month', 'year']
  const units: Array<keyof typeof t.units> = ['seconds', 'minutes', 'hours']

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Activity size={18} className="text-white" />
            </div>
            <span className="font-semibold">Uptime Calculator</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLang(l => l === 'en' ? 'pt' : 'en')} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Languages size={14} />{lang.toUpperCase()}
            </button>
            <button onClick={() => setDark(d => !d)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="https://github.com/gmowses/uptime-calculator" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-fit">
            {(['downtime', 'sla'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${mode === m ? 'bg-emerald-500 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                {m === 'downtime' ? t.modeDowntime : t.modeSla}
              </button>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Input panel */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5">
              {mode === 'downtime' ? (
                <>
                  <div>
                    <label className={labelCls}>{t.downtimeInput}</label>
                    <input className={inputCls} type="number" min="0" step="any" value={downtimeValue} onChange={e => setDowntimeValue(e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>{t.downtimeUnit}</label>
                    <select className={inputCls} value={downtimeUnit} onChange={e => setDowntimeUnit(e.target.value)}>
                      {units.map(u => <option key={u} value={u}>{t.units[u]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t.period}</label>
                    <select className={inputCls} value={downtimePeriod} onChange={e => setDowntimePeriod(e.target.value)}>
                      {periods.map(p => <option key={p} value={p}>{t.periods[p]}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className={labelCls}>{t.slaTarget}</label>
                  <input className={inputCls} type="number" min="0" max="100" step="0.001" value={slaTarget} onChange={e => setSlaTarget(e.target.value)} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SLA_LEVELS.filter(l => l.nines).map(l => (
                      <button key={l.label} onClick={() => setSlaTarget(String(l.pct))} className={`rounded-md border px-2.5 py-1 text-xs font-mono font-medium transition-colors ${slaTarget === String(l.pct) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-200 dark:border-zinc-700 hover:border-emerald-400'}`}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Result display */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 p-5 text-center space-y-1">
                <p className="text-xs text-zinc-400 uppercase tracking-wide">{t.uptimeResult}</p>
                <p className="text-5xl font-bold tabular-nums" style={{ color: pctColor }}>
                  {displayPct.toFixed(displayPct >= 99 ? 4 : 2)}%
                </p>
                {displaySla.nines && (
                  <p className="text-sm font-medium" style={{ color: pctColor }}>
                    {displaySla.nines}
                    {mode === 'downtime' && (
                      <span className="text-zinc-400 font-normal ml-1">
                        ({uptimePct >= displaySla.pct ? t.aboveSla : t.belowSla} {displaySla.label})
                      </span>
                    )}
                  </p>
                )}
                {!displaySla.nines && <p className="text-sm text-zinc-400">{t.slaLevel}: {displaySla.label}</p>}
              </div>

              {mode === 'downtime' && (
                <p className="text-xs text-zinc-400">
                  Downtime: {fmtDowntime(downtimeSec)} / {t.periods[downtimePeriod as keyof typeof t.periods].toLowerCase()}
                  {' · '}Uptime: {fmtDowntime(periodSec - downtimeSec)} / {t.periods[downtimePeriod as keyof typeof t.periods].toLowerCase()}
                </p>
              )}

              {mode === 'sla' && (
                <p className="text-xs text-zinc-400">
                  {t.maxDowntime} / {t.periods.year.toLowerCase()}: {fmtDowntime(PERIOD_SECONDS.year * slaDowntimeFrac)}
                </p>
              )}
            </div>

            {/* Right panel */}
            <div className="space-y-4">
              {/* Downtime budgets */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <h3 className="text-sm font-semibold mb-3">{t.downtimeBudgets}</h3>
                <div className="space-y-2">
                  {budgets.map(b => (
                    <div key={b.key} className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                      <span className="text-sm text-zinc-500">{t.periods[b.key as keyof typeof t.periods]}</span>
                      <span className="font-mono text-sm font-semibold tabular-nums">{fmtDowntime(b.seconds)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SLA reference table */}
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
                <h3 className="text-sm font-semibold mb-3">{t.slaLevels}</h3>
                <div className="space-y-1">
                  {SLA_LEVELS.map(lvl => {
                    const isHighlighted = lvl.label === displaySla.label
                    const downYear = PERIOD_SECONDS.year * (1 - lvl.pct / 100)
                    return (
                      <div key={lvl.label} className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${isHighlighted ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'}`}>
                        <span className={`font-mono font-bold tabular-nums ${isHighlighted ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{lvl.label}</span>
                        {lvl.nines && <span className="text-zinc-400">{lvl.nines}</span>}
                        <span className="text-zinc-500 tabular-nums">{fmtDowntime(downYear)}/yr</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <p className="text-[10px] text-zinc-400 px-1">{t.disclaimer}</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-xs text-zinc-400">
          <span>{t.builtBy} <a href="https://github.com/gmowses" className="text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 transition-colors">Gabriel Mowses</a></span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  )
}
