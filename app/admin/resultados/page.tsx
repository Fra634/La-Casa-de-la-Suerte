"use client"

import { useState } from "react"

const TURNOS = [
  { value: "previa", label: "La Previa 10:05" },
  { value: "primera", label: "La Primera 11:50" },
  { value: "matutina", label: "Matutina 14:50" },
  { value: "vespertina", label: "Vespertina 17:50" },
  { value: "nocturna", label: "Nocturna 20:50" },
]

const LOTERIAS = [
  { value: "provincia", label: "Provincia de Buenos Aires" },
  { value: "ciudad", label: "Ciudad" },
  { value: "cordoba", label: "Córdoba" },
  { value: "santafe", label: "Santa Fe" },
  { value: "entrerios", label: "Entre Ríos" },
  { value: "montevideo", label: "Montevideo" },
]

const TIPOS_QUINI6 = [
  { value: "tradicional", label: "Tradicional" },
  { value: "segunda", label: "Segunda" },
  { value: "revancha", label: "Revancha" },
  { value: "siempre_sale", label: "Siempre Sale" },
]

type Tab = "quiniela" | "quini6" | "pozos"
type Status = "idle" | "loading" | "success" | "error"

export default function AdminResultadosPage() {
  const [tab, setTab] = useState<Tab>("quiniela")
  const [apiKey, setApiKey] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [mensaje, setMensaje] = useState("")

  // ── Quiniela form ────────────────────────────────────────────────────────────
  const [qFecha, setQFecha] = useState("")
  const [qTurno, setQTurno] = useState("")
  const [qLoteria, setQLoteria] = useState("")
  const [qCabeza, setQCabeza] = useState("")
  const [qPremios5, setQPremios5] = useState("")
  const [qPremios10, setQPremios10] = useState("")
  const [qPremios20, setQPremios20] = useState("")

  // ── Quini 6 form ─────────────────────────────────────────────────────────────
  const [q6Fecha, setQ6Fecha] = useState("")
  const [q6Tipo, setQ6Tipo] = useState("")
  const [q6Numeros, setQ6Numeros] = useState("")

  // ── Pozos form ────────────────────────────────────────────────────────────────
  const [pMonto, setPMonto] = useState("")

  function parseNumeros(raw: string): string[] {
    return raw
      .split(/[\s,]+/)
      .map((n) => n.trim())
      .filter(Boolean)
  }

  async function enviarQuiniela(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    try {
      const res = await fetch("/api/resultados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": apiKey,
        },
        body: JSON.stringify({
          game_type: "quiniela",
          fecha: qFecha,
          turno: qTurno,
          loteria: qLoteria,
          cabeza: qCabeza.trim() || null,
          premios_5: parseNumeros(qPremios5),
          premios_10: parseNumeros(qPremios10),
          premios_20: parseNumeros(qPremios20),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Error desconocido")
      }
      setStatus("success")
      setMensaje("Resultado guardado correctamente.")
    } catch (err) {
      setStatus("error")
      setMensaje(err instanceof Error ? err.message : "Error al guardar")
    }
  }

  async function enviarPozos(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    try {
      const monto = parseInt(pMonto || "0")
      const res = await fetch("/api/pozos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": apiKey },
        body: JSON.stringify({ tradicional: monto, segunda: monto, revancha: monto, siempre_sale: monto }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? "Error") }
      setStatus("success")
      setMensaje("Pozo actualizado correctamente.")
    } catch (err) {
      setStatus("error")
      setMensaje(err instanceof Error ? err.message : "Error al guardar")
    }
  }

  async function enviarQuini6(e: React.FormEvent) {
    e.preventDefault()
    setStatus("loading")
    try {
      const numeros = parseNumeros(q6Numeros)
      if (numeros.length !== 6) throw new Error("Ingresá exactamente 6 números")
      const res = await fetch("/api/resultados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": apiKey,
        },
        body: JSON.stringify({
          game_type: "quini6",
          fecha: q6Fecha,
          tipo: q6Tipo,
          numeros,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Error desconocido")
      }
      setStatus("success")
      setMensaje("Resultado guardado correctamente.")
    } catch (err) {
      setStatus("error")
      setMensaje(err instanceof Error ? err.message : "Error al guardar")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <h1 className="font-semibold text-base">Panel de Resultados — Admin</h1>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8 space-y-6">
        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Clave de administrador</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="ADMIN_API_KEY"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-muted p-1 gap-1">
          {(["quiniela", "quini6", "pozos"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setStatus("idle") }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "quiniela" ? "Quiniela" : t === "quini6" ? "Quini 6" : "Pozos"}
            </button>
          ))}
        </div>

        {/* Quiniela form */}
        {tab === "quiniela" && (
          <form onSubmit={enviarQuiniela} className="space-y-4">
            <Field label="Fecha">
              <input type="date" value={qFecha} onChange={(e) => setQFecha(e.target.value)} required className={inputClass} />
            </Field>
            <Field label="Turno">
              <select value={qTurno} onChange={(e) => setQTurno(e.target.value)} required className={inputClass}>
                <option value="">Seleccionar…</option>
                {TURNOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Lotería">
              <select value={qLoteria} onChange={(e) => setQLoteria(e.target.value)} required className={inputClass}>
                <option value="">Seleccionar…</option>
                {LOTERIAS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </Field>
            <Field label="Número de Cabeza (4 dígitos)">
              <input type="text" value={qCabeza} onChange={(e) => setQCabeza(e.target.value)} placeholder="1234" maxLength={4} className={inputClass} />
            </Field>
            <Field label="Premios 1–5 (separados por coma o espacio)">
              <input type="text" value={qPremios5} onChange={(e) => setQPremios5(e.target.value)} placeholder="1234 5678 9012 3456 7890" className={inputClass} />
            </Field>
            <Field label="Premios 1–10">
              <input type="text" value={qPremios10} onChange={(e) => setQPremios10(e.target.value)} placeholder="10 números" className={inputClass} />
            </Field>
            <Field label="Premios 1–20">
              <input type="text" value={qPremios20} onChange={(e) => setQPremios20(e.target.value)} placeholder="20 números" className={inputClass} />
            </Field>
            <SubmitButton status={status} />
          </form>
        )}

        {/* Quini 6 form */}
        {tab === "quini6" && (
          <form onSubmit={enviarQuini6} className="space-y-4">
            <Field label="Fecha">
              <input type="date" value={q6Fecha} onChange={(e) => setQ6Fecha(e.target.value)} required className={inputClass} />
            </Field>
            <Field label="Tipo de sorteo">
              <select value={q6Tipo} onChange={(e) => setQ6Tipo(e.target.value)} required className={inputClass}>
                <option value="">Seleccionar…</option>
                {TIPOS_QUINI6.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="6 números ganadores (separados por coma o espacio)">
              <input type="text" value={q6Numeros} onChange={(e) => setQ6Numeros(e.target.value)} placeholder="01 05 12 23 34 45" required className={inputClass} />
            </Field>
            <SubmitButton status={status} />
          </form>
        )}

        {/* Pozos form */}
        {tab === "pozos" && (
          <form onSubmit={enviarPozos} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ingresá el pozo acumulado actual del Quini 6 (en pesos, sin puntos ni comas).
              Actualizalo después de cada sorteo del martes y viernes.
            </p>
            <Field label="Pozo acumulado ($)">
              <input
                type="number"
                min="0"
                value={pMonto}
                onChange={(e) => setPMonto(e.target.value)}
                placeholder="Ej: 1500000000"
                className={inputClass}
              />
            </Field>
            <SubmitButton status={status} />
          </form>
        )}

        {/* Feedback */}
        {status !== "idle" && status !== "loading" && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              status === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}
          >
            {mensaje}
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}

function SubmitButton({ status }: { status: Status }) {
  return (
    <button
      type="submit"
      disabled={status === "loading"}
      className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {status === "loading" ? "Guardando…" : "Guardar resultado"}
    </button>
  )
}
