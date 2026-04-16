"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, MessageCircle, RotateCcw, Shuffle, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"

const NUMBERS = Array.from({ length: 46 }, (_, i) => i.toString().padStart(2, "0"))
const MAX_SELECTION = 6
const PRICE_PER_PLAY = 3000

function formatPozo(n: number): string {
  return `$${n.toLocaleString("es-AR")}`
}

export default function Quini6Page() {
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [pozo, setPozo] = useState<number>(0)

  useEffect(() => {
    fetch("/api/pozos")
      .then((r) => r.json())
      .then((d) => { if (d?.tradicional) setPozo(d.tradicional) })
      .catch(() => {})
  }, [])

  const toggleNumber = (num: string) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num))
    } else if (selectedNumbers.length < MAX_SELECTION) {
      setSelectedNumbers([...selectedNumbers, num])
    }
  }

  const clearSelection = () => setSelectedNumbers([])

  // Selección aleatoria
  const randomSelection = () => {
    const shuffled = [...NUMBERS].sort(() => Math.random() - 0.5)
    setSelectedNumbers(shuffled.slice(0, MAX_SELECTION))
  }

  const isComplete = selectedNumbers.length === MAX_SELECTION

  const enviarWhatsApp = async () => {
    if (!isComplete) return
    setEnviando(true)

    let linkValidacion = ""
    try {
      const res = await fetch("/api/jugadas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_type: "quini6",
          numeros_quini6: selectedNumbers,
          monto_total: PRICE_PER_PLAY,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        linkValidacion = data.link
      }
    } catch { /* silent */ }

    setShowPaymentModal(false)
    setEnviando(false)

    let mensaje = `*QUINI 6 - Sorteo Completo*\n`
    mensaje += `Tradicional, Segunda, Revancha, Siempre Sale\n\n`
    mensaje += `*Números elegidos:*\n`
    mensaje += selectedNumbers.join(" - ")
    mensaje += `\n\n*Total: $${PRICE_PER_PLAY.toLocaleString("es-AR")}*`
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
            <Image src="/images/quini6-logo.png" alt="Quini 6" fill className="object-contain" priority />
          </div>
          <div className="w-16" />
        </div>
      </nav>

      {/* ── Área scrollable ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── Info sorteo ───────────────────────────────────────────── */}
        {pozo > 0 ? (
          <div
            className="rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
            style={{ background: "linear-gradient(90deg, oklch(0.70 0.15 85), oklch(0.78 0.18 70))" }}
          >
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-white shrink-0" />
              <div>
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">Pozo acumulado</p>
                <p className="text-xl font-bold text-white">{formatPozo(pozo)}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-white/70">Sorteo Completo</p>
              <p className="text-xs text-white/70">Miérc. y Dom.</p>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm px-5 py-3.5">
            <p className="text-sm text-muted-foreground text-center">
              Participás del Sorteo Completo:{" "}
              <span className="text-foreground font-medium">
                Tradicional · Segunda · Revancha · Siempre Sale
              </span>
            </p>
          </div>
        )}

        {/* ── Selección de números ──────────────────────────────────── */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">

          {/* Encabezado */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Elegí 6 números</p>
              <p className="text-xs text-muted-foreground mt-0.5">del 00 al 45</p>
            </div>
            {/* Contador circular */}
            <div className="flex items-center gap-3">
              <button
                onClick={randomSelection}
                className="flex items-center gap-1.5 text-xs text-primary font-medium px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-colors"
              >
                <Shuffle className="h-3 w-3" />
                Azar
              </button>
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                  isComplete
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground"
                )}
              >
                {selectedNumbers.length}
              </div>
            </div>
          </div>

          {/* Números seleccionados — chips */}
          {selectedNumbers.length > 0 && (
            <div className="px-5 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedNumbers.map((num) => (
                  <button
                    key={num}
                    onClick={() => toggleNumber(num)}
                    className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center shadow-sm transition-transform active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                {Array.from({ length: MAX_SELECTION - selectedNumbers.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-10 h-10 rounded-full border-2 border-dashed border-border"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Grid de números */}
          <div className="p-4">
            <div className="grid grid-cols-6 gap-2.5">
              {NUMBERS.map((num) => {
                const isSelected  = selectedNumbers.includes(num)
                const isDisabled  = !isSelected && selectedNumbers.length >= MAX_SELECTION
                return (
                  <button
                    key={num}
                    onClick={() => toggleNumber(num)}
                    disabled={isDisabled}
                    className={cn(
                      "aspect-square rounded-full font-bold text-base transition-all select-none",
                      "flex items-center justify-center",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-md scale-105"
                        : isDisabled
                        ? "bg-muted text-muted-foreground/40 cursor-not-allowed"
                        : "bg-muted text-foreground hover:bg-muted/70 active:scale-95"
                    )}
                  >
                    {num}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Borrar selección */}
          {selectedNumbers.length > 0 && (
            <button
              onClick={clearSelection}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-xs text-muted-foreground hover:text-foreground border-t border-border transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Borrar selección
            </button>
          )}
        </section>

      </div>
      </div>

      {/* ── Barra inferior ───────────────────────────────────────────── */}
      <div className="shrink-0 bg-card border-t border-border">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">Total a pagar</span>
            <span className="text-2xl font-bold text-foreground">
              ${isComplete ? PRICE_PER_PLAY.toLocaleString("es-AR") : "0"}
            </span>
          </div>
          <button
            onClick={() => isComplete && setShowPaymentModal(true)}
            disabled={!isComplete}
            className={cn(
              "w-full h-13 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-semibold transition-all",
              isComplete
                ? "bg-[#25D366] text-white shadow-sm hover:bg-[#22c55e] active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            <MessageCircle className="h-5 w-5" />
            Enviar jugada por WhatsApp
          </button>
          {!isComplete && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              {selectedNumbers.length === 0
                ? "Seleccioná 6 números para continuar"
                : `Seleccioná ${MAX_SELECTION - selectedNumbers.length} número${MAX_SELECTION - selectedNumbers.length > 1 ? "s" : ""} más`}
            </p>
          )}
        </div>
      </div>

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
            {/* Números elegidos */}
            <div className="px-6 py-3">
              <p className="text-xs text-muted-foreground text-center mb-2">Tus números</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {selectedNumbers.map((num) => (
                  <span
                    key={num}
                    className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
            <div className="mx-6 mb-4 bg-muted/60 rounded-2xl p-4 space-y-2">
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
                <span className="font-bold text-primary text-base">${PRICE_PER_PLAY.toLocaleString("es-AR")}</span>
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
