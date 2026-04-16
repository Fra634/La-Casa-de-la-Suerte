"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Plus,
  Trash2,
  MessageCircle,
  AlertTriangle,
  ChevronDown,
  Check,
  TrendingUp,
  Link2,
} from "lucide-react"
import { calcularPremioSimple, calcularPremioRedoblona, esElegibleRedoblona } from "@/lib/prizes"

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Turno = "previa" | "primera" | "matutina" | "vespertina" | "nocturna" | ""

interface Jugada {
  id: number
  numero: string
  ubicacion: string
  valor: string
  esBajada?: boolean
}

interface Quiniela {
  id: string
  nombre: string
  soloMatutinaNocturna?: boolean
}

// ─── Datos ────────────────────────────────────────────────────────────────────

const TURNOS = [
  { value: "previa",     label: "La Previa",   hora: "10:05" },
  { value: "primera",    label: "Primera",     hora: "11:50" },
  { value: "matutina",   label: "Matutina",    hora: "14:50" },
  { value: "vespertina", label: "Vespertina",  hora: "17:50" },
  { value: "nocturna",   label: "Nocturna",    hora: "20:50" },
]

const QUINIELAS: Quiniela[] = [
  { id: "provincia",  nombre: "Provincia de Buenos Aires" },
  { id: "ciudad",     nombre: "Ciudad" },
  { id: "cordoba",    nombre: "Córdoba" },
  { id: "santafe",    nombre: "Santa Fe" },
  { id: "entrerios",  nombre: "Entre Ríos" },
  { id: "montevideo", nombre: "Montevideo", soloMatutinaNocturna: true },
]

const UBICACIONES = [
  { value: "cabeza",    label: "Cabeza" },
  { value: "premios5",  label: "01 a 05" },
  { value: "premios10", label: "01 a 10" },
  { value: "premios20", label: "01 a 20" },
]

const VALOR_MINIMO = 50

// ─── Página ───────────────────────────────────────────────────────────────────

export default function QuinielaPage() {
  const [turno, setTurno] = useState<Turno>("")
  const [quinielasSeleccionadas, setQuinielasSeleccionadas] = useState<string[]>([])
  const [jugadas, setJugadas] = useState<Jugada[]>([
    { id: 1, numero: "", ubicacion: "", valor: "" },
  ])
  const [redoblona, setRedoblona]                     = useState(false)
  const [showMinValueAlert, setShowMinValueAlert]     = useState(false)
  const [showMaxJugadasAlert, setShowMaxJugadasAlert] = useState(false)
  const [showPaymentModal, setShowPaymentModal]       = useState(false)
  const [showGananciaModal, setShowGananciaModal]     = useState(false)
  const [enviando, setEnviando]                       = useState(false)

  const montevideoDisponible = turno === "matutina" || turno === "nocturna"

  const toggleQuiniela = (id: string) => {
    setQuinielasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    )
  }

  const handleTurnoChange = (newTurno: Turno) => {
    setTurno(newTurno)
    if (newTurno !== "matutina" && newTurno !== "nocturna") {
      setQuinielasSeleccionadas((prev) => prev.filter((q) => q !== "montevideo"))
    }
  }

  const addJugada = () => {
    if (jugadas.length >= 16) { setShowMaxJugadasAlert(true); return }
    setJugadas([...jugadas, { id: Date.now(), numero: "", ubicacion: "", valor: "" }])
  }

  const removeJugada = (id: number) => {
    if (jugadas.length === 1) return
    setJugadas(jugadas.filter((j) => j.id !== id))
  }

  const updateJugada = (id: number, field: keyof Jugada, value: string) =>
    setJugadas(jugadas.map((j) => (j.id === id ? { ...j, [field]: value } : j)))

  const validateValorMinimo = (id: number, valor: string) => {
    if (valor && Number(valor) < VALOR_MINIMO) {
      setShowMinValueAlert(true)
      updateJugada(id, "valor", String(VALOR_MINIMO))
    }
  }

  const canBajarNumero = (j: Jugada) =>
    !j.esBajada &&
    j.ubicacion === "cabeza" &&
    !!j.valor &&
    Number(j.valor) >= VALOR_MINIMO &&
    (j.numero.length === 3 || j.numero.length === 4)

  const bajarNumero = (jugada: Jugada) => {
    if (!canBajarNumero(jugada)) return
    const num = jugada.numero
    const val = jugada.valor
    const nuevas: Jugada[] = []
    if (num.length === 4) {
      nuevas.push({ id: Date.now(),     numero: num.slice(-3), ubicacion: "cabeza", valor: val, esBajada: true })
      nuevas.push({ id: Date.now() + 1, numero: num.slice(-2), ubicacion: "cabeza", valor: val, esBajada: true })
    } else {
      nuevas.push({ id: Date.now(), numero: num.slice(-2), ubicacion: "cabeza", valor: val, esBajada: true })
    }
    if (jugadas.length + nuevas.length > 16) { setShowMaxJugadasAlert(true); return }
    setJugadas([...jugadas, ...nuevas])
  }

  const sumaJugadas  = jugadas.reduce((s, j) => s + (Number(j.valor) || 0), 0)
  const total        = sumaJugadas * (quinielasSeleccionadas.length || 1)
  const jugadasValidas = jugadas.filter(
    (j) => j.numero && j.ubicacion && j.valor && Number(j.valor) >= VALOR_MINIMO
  )
  const todasDosDigitos = jugadasValidas.every(j => esElegibleRedoblona(j.numero))
  const puedeEnviar = jugadasValidas.length > 0 && !!turno && quinielasSeleccionadas.length > 0

  const enviarWhatsApp = async () => {
    setEnviando(true)
    const turnoTexto    = TURNOS.find((t) => t.value === turno)?.label || turno
    const quinielasTexto = quinielasSeleccionadas
      .map((qId) => QUINIELAS.find((q) => q.id === qId)?.nombre)
      .filter(Boolean)
      .join(", ")

    let linkValidacion = ""
    try {
      const res = await fetch("/api/jugadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_type: "quiniela",
          turno,
          quinielas: quinielasSeleccionadas,
          jugadas_data: jugadasValidas.map((j) => ({
            numero: j.numero,
            ubicacion: j.ubicacion,
            valor: Number(j.valor),
          })),
          monto_total: total,
          redoblona,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        linkValidacion = data.link
      }
    } catch { /* silent */ }

    setShowPaymentModal(false)
    setEnviando(false)

    let mensaje = `*QUINIELA${redoblona ? " - REDOBLONA" : ""} - ${turnoTexto}*\n`
    mensaje += `*Quinielas:* ${quinielasTexto}\n\n*Jugadas:*\n`
    jugadasValidas.forEach((j, i) => {
      const ubLabel = UBICACIONES.find((u) => u.value === j.ubicacion)?.label || j.ubicacion
      mensaje += `${i + 1}. ${j.numero} | ${ubLabel} | $${j.valor}\n`
    })
    mensaje += `\n*Total: $${total}*`
    mensaje += `\n\n*Transferir a:*\nAlias: GEN.CUENCA.PISO\nTitular: Javier A. Libertini\nBanco: Pcia. de Buenos Aires`
    if (linkValidacion) mensaje += `\n\n*Verificá tu jugada:* ${linkValidacion}`

    location.href = `https://wa.me/5491171121355?text=${encodeURIComponent(mensaje)}`
  }

  return (
    <div className="flex flex-col bg-background overflow-hidden" style={{ height: "100dvh" }}>

      {/* ── Nav bar ─────────────────────────────────────────────────── */}
      <nav className="shrink-0 bg-card border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Inicio</span>
          </Link>
          <div className="absolute left-1/2 -translate-x-1/2 w-28 h-8 relative">
            <Image src="/images/quiniela-logo.png" alt="Quiniela" fill className="object-contain" priority />
          </div>
          <div className="w-16" />
        </div>
      </nav>

      {/* ── Área scrollable ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── 1. Turno ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Turno
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center p-3 bg-card rounded-2xl border border-border shadow-sm">
            {TURNOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTurnoChange(t.value as Turno)}
                className={cn(
                  "flex flex-col items-center px-4 py-2.5 rounded-2xl text-sm font-medium border transition-all",
                  turno === t.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:border-primary/40"
                )}
              >
                <span>{t.label}</span>
                <span className={cn("text-[11px] mt-0.5", turno === t.value ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {t.hora}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── 2. Quinielas ──────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quinielas
            </p>
          </div>
          <div className={cn(
            "bg-card rounded-2xl border shadow-sm overflow-hidden divide-y divide-border transition-colors",
            turno && quinielasSeleccionadas.length === 0 ? "border-amber-300 dark:border-amber-700" : "border-border"
          )}>
            {QUINIELAS.map((quiniela, index) => {
              const disabled  = !!quiniela.soloMatutinaNocturna && !montevideoDisponible
              const selected  = quinielasSeleccionadas.includes(quiniela.id)
              return (
                <button
                  key={quiniela.id}
                  type="button"
                  onClick={() => !disabled && toggleQuiniela(quiniela.id)}
                  disabled={disabled}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3.5 text-sm transition-colors",
                    disabled
                      ? "opacity-40 cursor-not-allowed"
                      : selected
                      ? "bg-primary/8"
                      : "hover:bg-muted/50"
                  )}
                >
                  <span className={cn("font-medium", selected && "text-primary")}>
                    {index + 1}. {quiniela.nombre}
                  </span>
                  {selected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 px-1">
            Montevideo disponible solo en Matutina y Nocturna
          </p>
        </section>

        {/* ── 3. Jugadas ────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Jugadas
            </p>
            <span className="text-xs text-muted-foreground">{jugadas.length}/{redoblona ? 2 : 16}</span>
          </div>

          {/* Toggle redoblona */}
          <button
            type="button"
            onClick={() => {
              if (!redoblona) {
                // Al activar: asegurar exactamente 2 jugadas, truncar números a 2 dígitos
                setJugadas(prev => {
                  const base = prev.slice(0, 2).map(j => ({ ...j, numero: j.numero.slice(0, 2) }))
                  if (base.length < 2) base.push({ id: Date.now(), numero: "", ubicacion: "", valor: "" })
                  return base
                })
              }
              setRedoblona(r => !r)
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border mb-3 transition-colors text-left",
              redoblona
                ? "bg-primary/8 border-primary/40"
                : "bg-card border-border hover:border-primary/30"
            )}
          >
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
              redoblona ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Link2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold", redoblona ? "text-primary" : "text-foreground")}>
                Redoblona {redoblona ? "activada" : ""}
              </p>
              <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                Solo para números de 2 cifras. Todas deben acertar para ganar el premio combinado.
              </p>
            </div>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
              redoblona ? "bg-primary border-primary" : "border-border"
            )}>
              {redoblona && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
          </button>
          <div className={cn(
            "bg-card rounded-2xl border shadow-sm overflow-hidden transition-colors",
            turno && quinielasSeleccionadas.length > 0 && jugadasValidas.length === 0 ? "border-amber-300 dark:border-amber-700" : "border-border"
          )}>
            {/* Cabecera de columnas */}
            <div className="grid grid-cols-12 gap-1 px-4 py-2.5 border-b border-border bg-muted/30">
              <p className="col-span-3 text-xs font-semibold text-muted-foreground">Número</p>
              <p className="col-span-4 text-xs font-semibold text-muted-foreground">Ubicación</p>
              <p className="col-span-4 text-xs font-semibold text-muted-foreground text-right">Valor $</p>
              <p className="col-span-1" />
            </div>

            {/* Filas */}
            <div className="divide-y divide-border">
              {jugadas.map((jugada) => (
                <div key={jugada.id} className="px-3 py-3 space-y-2">
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-3">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={redoblona ? 2 : 4}
                        placeholder={redoblona ? "00" : "0000"}
                        value={jugada.numero}
                        onChange={(e) => updateJugada(jugada.id, "numero", e.target.value.replace(/\D/g, "").slice(0, redoblona ? 2 : 4))}
                        className={cn(
                          "h-10 text-center font-mono px-1 border-0 rounded-xl transition-colors placeholder:text-muted-foreground/40",
                          jugada.numero ? "bg-muted/50" : "bg-amber-50 dark:bg-amber-950/30"
                        )}
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                    <div className="col-span-4">
                      <Select
                        value={jugada.ubicacion}
                        onValueChange={(v) => updateJugada(jugada.id, "ubicacion", v)}
                      >
                        <SelectTrigger className={cn(
                          "h-10 px-2 border-0 rounded-xl transition-colors",
                          jugada.ubicacion ? "bg-muted/50" : "bg-amber-50 dark:bg-amber-950/30"
                        )} style={{ fontSize: "16px" }}>
                          <SelectValue placeholder="Ubic." />
                        </SelectTrigger>
                        <SelectContent>
                          {UBICACIONES.map((ub) => (
                            <SelectItem key={ub.value} value={ub.value}>{ub.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="50"
                        value={jugada.valor}
                        onChange={(e) => updateJugada(jugada.id, "valor", e.target.value.replace(/\D/g, ""))}
                        onBlur={(e) => validateValorMinimo(jugada.id, e.target.value)}
                        className={cn(
                          "h-10 text-right px-2 border-0 rounded-xl transition-colors placeholder:text-muted-foreground/40",
                          jugada.valor ? "bg-muted/50" : "bg-amber-50 dark:bg-amber-950/30"
                        )}
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeJugada(jugada.id)}
                        disabled={jugadas.length === 1}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {canBajarNumero(jugada) && !redoblona && (
                    <button
                      onClick={() => bajarNumero(jugada)}
                      className="w-full flex items-center justify-center gap-1 text-xs text-primary font-medium py-2 rounded-lg bg-primary/8 hover:bg-primary/12 transition-colors"
                    >
                      <ChevronDown className="h-3 w-3" />
                      Bajar número
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Agregar */}
            {!redoblona && (jugadas.length < 16 ? (
              <button
                onClick={addJugada}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-primary hover:bg-primary/5 border-t border-border transition-colors"
              >
                <Plus className="h-4 w-4" />
                Agregar jugada
              </button>
            ) : (
              <p className="text-xs text-center text-muted-foreground py-3 border-t border-border">
                Límite de 16 jugadas alcanzado
              </p>
            ))}
          </div>
        </section>

      </div>
      </div>

      {/* ── Barra inferior ───────────────────────────────────────────── */}
      <div className="shrink-0 bg-card border-t border-border">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total a pagar</span>
            <span className="text-2xl font-bold text-foreground">${total.toLocaleString("es-AR")}</span>
          </div>

          {jugadasValidas.length > 0 && (
            <button
              onClick={() => setShowGananciaModal(true)}
              className="gold-btn w-full h-11 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm"
            >
              <TrendingUp className="h-4 w-4" />
              ¿Cuánto podés ganar? Tocá para verlo
            </button>
          )}

          <button
            disabled={!puedeEnviar}
            onClick={() => setShowPaymentModal(true)}
            className={cn(
              "w-full h-13 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-semibold transition-all",
              puedeEnviar
                ? "bg-[#25D366] text-white shadow-sm hover:bg-[#22c55e] active:scale-[0.98]"
                : "bg-muted text-muted-foreground"
            )}
          >
            <MessageCircle className="h-5 w-5" />
            Enviar jugada por WhatsApp
          </button>
          {turno && !puedeEnviar && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {quinielasSeleccionadas.length === 0
                ? "Seleccioná al menos una quiniela"
                : "Completá los datos de al menos una jugada"}
            </p>
          )}
        </div>
      </div>

      {/* ── Modal Posible Ganancia ───────────────────────────────────── */}
      {showGananciaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-6 pt-6 pb-3 shrink-0">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Posible Ganancia</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {redoblona
                  ? "Redoblona: si todas aciertan, ganás el monto combinado (por 1 quiniela)."
                  : "Ganancia estimada por cada jugada si acierta en 1 quiniela."}
              </p>
            </div>
            <div className="overflow-y-auto flex-1 px-6 pb-2">
              {redoblona ? (
                <div className="space-y-3">
                  {!todasDosDigitos && jugadasValidas.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        La redoblona solo aplica a números de 2 cifras (ej: 08, 55). Algunos números no cumplen con este requisito.
                      </p>
                    </div>
                  )}
                  {todasDosDigitos && jugadasValidas.length >= 2 ? (
                    <div className="bg-primary/8 rounded-2xl p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Si todas las jugadas aciertan</p>
                      <p className="text-3xl font-bold text-primary">
                        ${Math.round(calcularPremioRedoblona(sumaJugadas, jugadasValidas)).toLocaleString("es-AR")}
                      </p>
                    </div>
                  ) : todasDosDigitos && (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Agregá al menos 2 jugadas para ver la ganancia estimada.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {jugadasValidas.map((j, i) => {
                    const mult = calcularPremioSimple(j.numero, j.ubicacion, 1)
                    const ganancia = calcularPremioSimple(j.numero, j.ubicacion, Number(j.valor))
                    return (
                      <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                        <div>
                          <p className="text-sm font-bold font-mono">{j.numero}</p>
                          <p className="text-xs text-muted-foreground">
                            ${Number(j.valor).toLocaleString("es-AR")} × {mult}
                          </p>
                        </div>
                        <p className="text-base font-bold text-primary">
                          ${Math.round(ganancia).toLocaleString("es-AR")}
                        </p>
                      </div>
                    )
                  })}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-sm font-semibold">Total posible</p>
                    <p className="text-lg font-bold text-primary">
                      ${Math.round(jugadasValidas.reduce((s, j) => s + calcularPremioSimple(j.numero, j.ubicacion, Number(j.valor)), 0)).toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 pt-3 shrink-0 space-y-2">
              <button
                disabled={!puedeEnviar}
                onClick={() => { setShowGananciaModal(false); setShowPaymentModal(true) }}
                className={cn(
                  "w-full h-12 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-semibold transition-all",
                  puedeEnviar
                    ? "bg-[#25D366] text-white shadow-sm hover:bg-[#22c55e] active:scale-[0.98]"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <MessageCircle className="h-5 w-5" />
                Enviar jugada por WhatsApp
              </button>
              <button
                onClick={() => setShowGananciaModal(false)}
                className="w-full h-10 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────── */}
      <Dialog open={showMinValueAlert} onOpenChange={setShowMinValueAlert}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Valor mínimo
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El valor mínimo por jugada es de ${VALOR_MINIMO}.
          </p>
          <DialogFooter>
            <Button onClick={() => setShowMinValueAlert(false)} className="rounded-xl">Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMaxJugadasAlert} onOpenChange={setShowMaxJugadasAlert}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Límite alcanzado
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Máximo de 16 jugadas por boleto.
          </p>
          <DialogFooter>
            <Button onClick={() => setShowMaxJugadasAlert(false)} className="rounded-xl">Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal de pago ────────────────────────────────────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-card w-full max-w-sm rounded-3xl shadow-xl overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <h3 className="text-lg font-bold text-center mb-1">Recordatorio de pago</h3>
              <p className="text-sm text-muted-foreground text-center">
                Luego de enviar tu jugada, transferí el total a nuestra cuenta y compartinos el comprobante.
              </p>
            </div>
            <div className="mx-6 my-4 bg-muted/60 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Alias</span>
                <span className="font-semibold">GEN.CUENCA.PISO</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Titular</span>
                <span className="font-medium">Javier A. Libertini</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Banco</span>
                <span className="font-medium">Pcia. de Buenos Aires</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between text-sm">
                <span className="font-semibold">Total a transferir</span>
                <span className="font-bold text-primary text-base">${total.toLocaleString("es-AR")}</span>
              </div>
            </div>
            <div className="px-6 pb-6 space-y-2">
              <button
                onClick={enviarWhatsApp}
                disabled={enviando}
                className="w-full h-12 rounded-2xl bg-[#25D366] text-white font-semibold flex items-center justify-center gap-2 hover:bg-[#22c55e] transition-colors disabled:opacity-60"
              >
                <MessageCircle className="h-5 w-5" />
                {enviando ? "Preparando jugada…" : "Enviar por WhatsApp"}
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full h-10 rounded-2xl text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
