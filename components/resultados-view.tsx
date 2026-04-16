"use client"

import { useState, useEffect } from "react"
import { Loader2, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Turno, Loteria } from "@/lib/types"

// ─── Constantes ───────────────────────────────────────────────────────────────

const TURNOS: { value: Turno; label: string; hora: string }[] = [
  { value: "previa",     label: "Previa",     hora: "10:05" },
  { value: "primera",    label: "Primera",    hora: "11:50" },
  { value: "matutina",   label: "Matutina",   hora: "14:50" },
  { value: "vespertina", label: "Vespertina", hora: "17:50" },
  { value: "nocturna",   label: "Nocturna",   hora: "20:50" },
]

const LOTERIAS: { value: Loteria; label: string }[] = [
  { value: "provincia",  label: "Provincia"  },
  { value: "ciudad",     label: "Ciudad"     },
  { value: "cordoba",    label: "Córdoba"    },
  { value: "santafe",    label: "Santa Fe"   },
  { value: "entrerios",  label: "Entre Ríos" },
  { value: "montevideo", label: "Montevideo" },
]

const MODALIDADES_Q6 = [
  { value: "tradicional",  label: "Tradicional"  },
  { value: "segunda",      label: "Segunda"      },
  { value: "revancha",     label: "Revancha"     },
  { value: "siempre_sale", label: "Siempre Sale" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

function turnoActual(): Turno {
  const h = parseInt(
    new Date().toLocaleTimeString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit", hour12: false,
    }).split(":")[0],
    10
  )
  if (h < 11) return "previa"
  if (h < 13) return "primera"
  if (h < 16) return "matutina"
  if (h < 19) return "vespertina"
  return "nocturna"
}

function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

/** Genera los últimos N días en hora Argentina */
function ultimosDias(n: number): { fecha: string; label: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const base = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
    )
    base.setDate(base.getDate() - i)
    const fecha = base.toLocaleDateString("en-CA")
    let label: string
    if (i === 0) label = "Hoy"
    else if (i === 1) label = "Ayer"
    else {
      const dia = base.toLocaleDateString("es-AR", { weekday: "short" })
      label = `${dia} ${base.getDate()}/${base.getMonth() + 1}`
    }
    return { fecha, label }
  })
}

/** Genera los últimos N días que coincidan con ciertos días de semana (0=Dom…6=Sáb) */
function ultimosDiasDeSemana(diasSemana: number[], n: number): { fecha: string; label: string }[] {
  const result: { fecha: string; label: string }[] = []
  const hoyAR = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }))
  hoyAR.setHours(0, 0, 0, 0)
  const cursor = new Date(hoyAR)

  while (result.length < n) {
    if (diasSemana.includes(cursor.getDay())) {
      const fecha = cursor.toLocaleDateString("en-CA")
      const diffDays = Math.round((hoyAR.getTime() - cursor.getTime()) / 86400000)
      let label: string
      if (diffDays === 0)      label = "Hoy"
      else if (diffDays === 1) label = "Ayer"
      else {
        const shortDay = cursor.toLocaleDateString("es-AR", { weekday: "short" })
        label = `${shortDay} ${cursor.getDate()}/${cursor.getMonth() + 1}`
      }
      result.push({ fecha, label })
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return result
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function DateChips({ dias, selected, onSelect }: {
  dias: { fecha: string; label: string }[]
  selected: string
  onSelect: (f: string) => void
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
      {dias.map(({ fecha, label }) => (
        <button
          key={fecha}
          onClick={() => onSelect(fecha)}
          className={cn(
            "shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all",
            selected === fecha
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Cargando…</span>
    </div>
  )
}

function SinResultados({ emoji, texto }: { emoji: string; texto: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm px-6 py-12 text-center space-y-2">
      <p className="text-2xl">{emoji}</p>
      <p className="font-semibold">Sin resultados</p>
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  )
}

function NumberRow({ pos, numero }: { pos: number; numero: string }) {
  const isCabeza = pos === 1
  return (
    <div className={cn("flex items-center gap-2.5 px-3 py-1.5 rounded-xl", isCabeza && "bg-primary/8")}>
      <span className="w-5 text-right text-xs text-muted-foreground shrink-0 tabular-nums">{pos}</span>
      <span className={cn("font-mono font-bold tracking-widest", isCabeza ? "text-primary text-lg" : "text-foreground text-sm")}>
        {numero}
      </span>
      {isCabeza && <span className="ml-auto text-[10px] font-semibold text-primary uppercase tracking-wider">Cabeza</span>}
    </div>
  )
}

function BallList({ numeros, color }: { numeros: string[]; color?: string }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {numeros.map((n) => (
        <div
          key={n}
          style={color ? { background: color } : undefined}
          className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center font-bold font-mono text-sm shadow-sm",
            color ? "text-white" : "bg-primary text-primary-foreground"
          )}
        >
          {n}
        </div>
      ))}
    </div>
  )
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Tab = "quiniela" | "quini6" | "lotoplus"

interface ResQuiniela { loteria: Loteria; cabeza: string | null; premios_20: string[] | null }
interface ResQuini6   { tipo: string; numeros: string[] }

// ─── Componente principal ─────────────────────────────────────────────────────

export function ResultadosView() {
  const dias        = ultimosDias(5)
  const diasQuini6  = ultimosDiasDeSemana([0, 3], 5)  // Dom y Mié
  const diasLotoPlus = ultimosDiasDeSemana([2, 5], 5) // Mar y Vie

  const [tab, setTab] = useState<Tab>("quiniela")

  // ── Quiniela ────────────────────────────────────────────────────────────────
  const [fechaQ, setFechaQ]   = useState(fechaHoyArgentina)
  const [turno,  setTurno]    = useState<Turno>(turnoActual)
  const [resQ,   setResQ]     = useState<ResQuiniela[]>([])
  const [loadQ,  setLoadQ]    = useState(false)

  useEffect(() => {
    if (tab !== "quiniela") return
    setLoadQ(true); setResQ([])
    fetch(`/api/resultados-consulta?fecha=${fechaQ}&turno=${turno}`)
      .then(r => r.ok ? r.json() : { resultados: [] })
      .then(d => setResQ(d.resultados ?? []))
      .finally(() => setLoadQ(false))
  }, [tab, fechaQ, turno])

  // ── Quini 6 ─────────────────────────────────────────────────────────────────
  // fechaQ6 = null → pedir el último disponible a la API
  const [fechaQ6, setFechaQ6] = useState<string | null>(null)
  const [resQ6,   setResQ6]   = useState<ResQuini6[]>([])
  const [loadQ6,  setLoadQ6]  = useState(false)
  const [pozos,   setPozos]   = useState<{ tradicional: number } | null>(null)

  const cargarQ6 = (f: string | null) => {
    setLoadQ6(true); setResQ6([])
    const url = f
      ? `/api/resultados-consulta?tipo=quini6&fecha=${f}`
      : `/api/resultados-consulta?tipo=quini6`
    fetch(url)
      .then(r => r.ok ? r.json() : { resultados: [], fecha: null })
      .then(d => {
        setResQ6(d.resultados ?? [])
        if (d.fecha) setFechaQ6(d.fecha) // auto-setear la fecha que devolvió la API
      })
      .finally(() => setLoadQ6(false))
  }

  useEffect(() => {
    if (tab !== "quini6") return
    if (!pozos) {
      fetch("/api/pozos").then(r => r.ok ? r.json() : null).then(d => { if (d) setPozos(d) })
    }
    cargarQ6(null) // siempre pedir el último al abrir el tab
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loto Plus ───────────────────────────────────────────────────────────────
  // fechaLP = null → pedir el último disponible a la API
  const [fechaLP, setFechaLP] = useState<string | null>(null)
  const [resLP,   setResLP]   = useState<string[] | null>(null)
  const [loadLP,  setLoadLP]  = useState(false)

  const cargarLP = (f: string | null) => {
    setLoadLP(true); setResLP(null)
    const url = f
      ? `/api/resultados-consulta?tipo=lotoplus&fecha=${f}`
      : `/api/resultados-consulta?tipo=lotoplus`
    fetch(url)
      .then(r => r.ok ? r.json() : { numeros: null, fecha: null })
      .then(d => {
        setResLP(d.numeros ?? null)
        if (d.fecha) setFechaLP(d.fecha) // auto-setear la fecha que devolvió la API
      })
      .finally(() => setLoadLP(false))
  }

  useEffect(() => {
    if (tab !== "lotoplus") return
    cargarLP(null) // siempre pedir el último al abrir el tab
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Render ──────────────────────────────────────────────────────────────────

  const resQOrdenados = LOTERIAS.flatMap(({ value, label }) => {
    const d = resQ.find(r => r.loteria === value)
    return d ? [{ label, data: d }] : []
  })

  return (
    <div className="px-4 py-5 space-y-4 pb-10">

      {/* Tabs */}
      <div className="flex rounded-2xl bg-muted p-1 gap-1">
        {(["quiniela", "quini6", "lotoplus"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all",
              tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "quiniela" ? "Quiniela" : t === "quini6" ? "Quini 6" : "Loto Plus"}
          </button>
        ))}
      </div>

      {/* ── QUINIELA ──────────────────────────────────────────────────── */}
      {tab === "quiniela" && (
        <>
          <DateChips dias={dias} selected={fechaQ} onSelect={setFechaQ} />

          {/* Selector de turno */}
          <div className="flex flex-wrap gap-2">
            {TURNOS.map((t) => (
              <button key={t.value} onClick={() => setTurno(t.value)}
                className={cn(
                  "flex flex-col items-center px-3 py-2 rounded-xl text-xs font-medium border transition-all",
                  turno === t.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:border-primary/40"
                )}
              >
                <span>{t.label}</span>
                <span className={cn("text-[10px] mt-0.5", turno === t.value ? "text-primary-foreground/70" : "text-muted-foreground")}>{t.hora}</span>
              </button>
            ))}
          </div>

          <p className="text-sm font-semibold px-1">
            {TURNOS.find(t => t.value === turno)?.label} · {formatearFecha(fechaQ)}
          </p>

          {loadQ && <Spinner />}

          {!loadQ && resQOrdenados.length === 0 && (
            <SinResultados emoji="📊" texto="Todavía no hay datos para este sorteo." />
          )}

          {!loadQ && resQOrdenados.length > 0 && (
            <div className="space-y-3">
              {resQOrdenados.map(({ label, data }) => {
                const nums = data.premios_20 ?? []
                return (
                  <div key={data.loteria} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                      {data.cabeza && <p className="text-xl font-bold text-primary font-mono tracking-widest">{data.cabeza}</p>}
                    </div>
                    <div className="px-3 py-3">
                      {nums.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-2">Sin datos</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-x-2">
                          <div className="space-y-0.5">{nums.slice(0, 10).map((n, i) => <NumberRow key={i} pos={i + 1} numero={n} />)}</div>
                          <div className="space-y-0.5">{nums.slice(10, 20).map((n, i) => <NumberRow key={i} pos={i + 11} numero={n} />)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── QUINI 6 ───────────────────────────────────────────────────── */}
      {tab === "quini6" && (
        <>
          {pozos?.tradicional ? (
            <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Trophy className="h-5 w-5 text-primary shrink-0" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pozo acumulado</p>
              </div>
              <p className="text-2xl font-bold text-primary font-mono">${pozos.tradicional.toLocaleString("es-AR")}</p>
            </div>
          ) : null}

          <DateChips
            dias={diasQuini6}
            selected={fechaQ6 ?? ""}
            onSelect={(f) => { setFechaQ6(f); cargarQ6(f) }}
          />

          {loadQ6 && <Spinner />}

          {!loadQ6 && resQ6.length === 0 && (
            <SinResultados emoji="🎱" texto="El Quini 6 se juega miércoles y domingos." />
          )}

          {!loadQ6 && resQ6.length > 0 && (
            <>
              <p className="text-sm font-semibold px-1">Quini 6 · {formatearFecha(fechaQ6 ?? "")}</p>
              <div className="space-y-3">
                {MODALIDADES_Q6.map(({ value, label }) => {
                  const numeros = resQ6.find(r => r.tipo === value)?.numeros
                  return (
                    <div key={value} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                      <div className="px-5 py-3 border-b border-border">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                      </div>
                      <div className="px-5 py-4">
                        {numeros
                          ? <BallList numeros={numeros} />
                          : <p className="text-sm text-muted-foreground">Sin datos</p>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── LOTO PLUS ─────────────────────────────────────────────────── */}
      {tab === "lotoplus" && (
        <>
          <DateChips
            dias={diasLotoPlus}
            selected={fechaLP ?? ""}
            onSelect={(f) => { setFechaLP(f); cargarLP(f) }}
          />

          {loadLP && <Spinner />}

          {!loadLP && !resLP && (
            <SinResultados emoji="🍀" texto="El Loto Plus se juega martes y viernes." />
          )}

          {!loadLP && resLP && (
            <>
              <p className="text-sm font-semibold px-1">Loto Plus · {formatearFecha(fechaLP ?? "")}</p>
              <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Números sorteados</p>
                </div>
                <div className="px-5 py-4">
                  <BallList numeros={resLP} color="linear-gradient(135deg, #c64022, #9e3219)" />
                </div>
              </div>
            </>
          )}
        </>
      )}

    </div>
  )
}
