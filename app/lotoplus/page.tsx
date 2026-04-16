"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, MessageCircle, RotateCcw, Shuffle, ChevronDown, ChevronUp, Zap, Star } from "lucide-react"

// ─── Constantes ───────────────────────────────────────────────────────────────

const NUMEROS_PRINCIPALES = Array.from({ length: 46 }, (_, i) => i.toString().padStart(2, "0"))
const NUMEROS_JACKPOT = Array.from({ length: 10 }, (_, i) => i.toString())
const PRECIO = 3000

// ─── Paleta Loto Plus ─────────────────────────────────────────────────────────
// Rojo:   #c64022
// Dorado: #f2bc34
// Blanco: #ffffff

const RED    = "#c64022"
const RED_DK = "#9e3219"
const GOLD   = "#f2bc34"
const GOLD_DK= "#c99510"

// ─── Página ───────────────────────────────────────────────────────────────────

export default function LotoPlusPage() {
  const [numerosElegidos, setNumerosElegidos] = useState<string[]>([])
  const [jackpot, setJackpot]                 = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showPremios, setShowPremios]           = useState(false)
  const [enviando, setEnviando]                 = useState(false)

  const isComplete = numerosElegidos.length === 6 && jackpot !== null

  const toggleNumero = (num: string) => {
    if (numerosElegidos.includes(num)) {
      setNumerosElegidos(numerosElegidos.filter((n) => n !== num))
    } else if (numerosElegidos.length < 6) {
      setNumerosElegidos([...numerosElegidos, num])
    }
  }

  const clearNumerosElegidos = () => setNumerosElegidos([])

  const randomSelection = () => {
    const shuffled = [...NUMEROS_PRINCIPALES].sort(() => Math.random() - 0.5)
    setNumerosElegidos(shuffled.slice(0, 6))
    setJackpot(NUMEROS_JACKPOT[Math.floor(Math.random() * 10)])
  }

  const enviarWhatsApp = () => {
    if (!isComplete) return
    setShowPaymentModal(false)
    setEnviando(true)
    let mensaje = `*LOTO PLUS*\n`
    mensaje += `*Números:* ${numerosElegidos.join(" - ")}\n`
    mensaje += `*Jackpot:* ${jackpot}\n`
    mensaje += `\n*Total: $${PRECIO.toLocaleString("es-AR")}*`
    mensaje += `\n\n*Transferir a:*\nAlias: GEN.CUENCA.PISO\nTitular: Javier A. Libertini\nBanco: Pcia. de Buenos Aires`
    setEnviando(false)
    location.href = `https://wa.me/5491171121355?text=${encodeURIComponent(mensaje)}`
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh", background: "#f7f7f5" }}>

      {/* ── Nav bar ─────────────────────────────────────────────────── */}
      <nav className="shrink-0" style={{ background: `linear-gradient(135deg, ${RED_DK} 0%, ${RED} 100%)` }}>
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Inicio</span>
          </Link>
          <div className="absolute left-1/2 -translate-x-1/2 w-56 h-14 relative">
            <Image src="/images/lotoplus-logo.png" alt="Loto Plus" fill className="object-contain" priority />
          </div>
          <div className="w-16" />
        </div>
      </nav>

      {/* ── Área scrollable ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">

        {/* ── Banner sorteo ──────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4"
          style={{ background: `linear-gradient(135deg, ${RED_DK}, ${RED})`, boxShadow: "0 4px 16px rgba(198,64,34,0.25)" }}
        >
          <div>
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">Sorteo</p>
            <p className="text-base font-bold text-white">Martes y viernes</p>
          </div>
          <div
            className="px-4 py-1.5 rounded-full text-xs font-bold"
            style={{ background: GOLD, color: RED_DK }}
          >
            $3.000 por jugada
          </div>
        </div>

        {/* ── Grid números principales ──────────────────────────────── */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">

          {/* Encabezado */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800">Elegí 6 números</p>
              <p className="text-xs text-gray-400 mt-0.5">del 00 al 45</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={randomSelection}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
                style={{ background: `${RED}18`, color: RED }}
              >
                <Shuffle className="h-3 w-3" />
                Azar
              </button>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all"
                style={
                  numerosElegidos.length === 6
                    ? { borderColor: GOLD, background: GOLD, color: RED_DK }
                    : { borderColor: "#e5e7eb", color: "#374151" }
                }
              >
                {numerosElegidos.length}
              </div>
            </div>
          </div>

          {/* Chips seleccionados */}
          {numerosElegidos.length > 0 && (
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
              {numerosElegidos.map((num) => (
                <button
                  key={num}
                  onClick={() => toggleNumero(num)}
                  className="w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center shadow-sm transition-transform active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${GOLD_DK}, ${GOLD})`, color: RED_DK }}
                >
                  {num}
                </button>
              ))}
              {Array.from({ length: 6 - numerosElegidos.length }).map((_, i) => (
                <div key={`empty-${i}`} className="w-10 h-10 rounded-full border-2 border-dashed border-gray-200" />
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="p-4">
            <div className="grid grid-cols-8 gap-2">
              {NUMEROS_PRINCIPALES.map((num) => {
                const isSelected = numerosElegidos.includes(num)
                const isDisabled = !isSelected && numerosElegidos.length >= 6
                return (
                  <button
                    key={num}
                    onClick={() => toggleNumero(num)}
                    disabled={isDisabled}
                    className="aspect-square rounded-full font-bold text-sm transition-all select-none flex items-center justify-center"
                    style={
                      isSelected
                        ? { background: `linear-gradient(135deg, ${GOLD_DK}, ${GOLD})`, color: RED_DK, transform: "scale(1.08)", boxShadow: `0 0 10px ${GOLD}80` }
                        : isDisabled
                        ? { background: "#f3f4f6", color: "#d1d5db" }
                        : { background: "#f3f4f6", color: "#374151" }
                    }
                  >
                    {num}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Borrar */}
          {numerosElegidos.length > 0 && (
            <button
              onClick={clearNumerosElegidos}
              className="w-full flex items-center justify-center gap-1.5 py-3 text-xs text-gray-400 hover:text-gray-600 border-t border-gray-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Borrar selección
            </button>
          )}
        </section>

        {/* ── Grid Jackpot ──────────────────────────────────────────── */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: RED }} />
                Número Jackpot
              </p>
              <p className="text-xs text-gray-400 mt-0.5">del 0 al 9 · elegí 1</p>
            </div>
            {jackpot !== null && (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${RED_DK}, ${RED})`, boxShadow: `0 0 12px ${RED}60` }}
              >
                {jackpot}
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="grid grid-cols-5 gap-3">
              {NUMEROS_JACKPOT.map((num) => {
                const isSelected = jackpot === num
                return (
                  <button
                    key={num}
                    onClick={() => setJackpot(isSelected ? null : num)}
                    className="aspect-square rounded-2xl font-bold text-lg transition-all select-none flex items-center justify-center"
                    style={
                      isSelected
                        ? { background: `linear-gradient(135deg, ${RED_DK}, ${RED})`, color: "white", transform: "scale(1.08)", boxShadow: `0 0 14px ${RED}60` }
                        : { background: "#f3f4f6", color: "#374151" }
                    }
                  >
                    {num}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Panel de premios ──────────────────────────────────────── */}
        <section className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <button
            onClick={() => setShowPremios(!showPremios)}
            className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
          >
            <span className="text-sm font-bold flex items-center gap-2" style={{ color: RED }}>
              <Star className="h-4 w-4" />
              Ver premios y categorías
            </span>
            {showPremios
              ? <ChevronUp className="h-4 w-4 text-gray-400" />
              : <ChevronDown className="h-4 w-4 text-gray-400" />
            }
          </button>

          {showPremios && (
            <div className="border-t border-gray-100 px-5 pb-5 space-y-4">

              {/* Tradicional & Match */}
              <div className="pt-4">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: GOLD_DK }}>Tradicional & Match</p>
                {[
                  { aciertos: "6 aciertos", premio: "Primer Premio", bold: true },
                  { aciertos: "5 aciertos", premio: "Segundo Premio", bold: false },
                  { aciertos: "4 aciertos", premio: "Tercer Premio",  bold: false },
                ].map((row) => (
                  <div key={row.aciertos} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{row.aciertos}</span>
                    <span className="text-sm font-semibold" style={{ color: row.bold ? GOLD_DK : "#6b7280" }}>{row.premio}</span>
                  </div>
                ))}
              </div>

              {/* Desquite */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: RED }}>Desquite</p>
                <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                  <span className="text-sm text-gray-700">6 aciertos</span>
                  <span className="text-sm font-semibold text-gray-500">Premio Desquite</span>
                </div>
              </div>

              {/* Sale o Sale */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-2 text-green-700">Sale o Sale</p>
                <div className="rounded-xl p-3 bg-green-50 border border-green-100">
                  <p className="text-sm font-bold text-green-800">¡Siempre hay ganadores!</p>
                  <p className="text-xs text-green-700 mt-1">
                    El pozo se reparte entre los jugadores con mayor cantidad de aciertos en cada sorteo.
                  </p>
                </div>
              </div>

              {/* Aviso legal */}
              <div className="rounded-xl px-4 py-3 flex items-start gap-2 bg-amber-50 border border-amber-100">
                <span className="text-amber-500 text-sm shrink-0">⚠</span>
                <p className="text-xs text-amber-800">
                  Premios sujetos a retención del <strong>28,5%</strong> (Ley 20.630).
                </p>
              </div>
            </div>
          )}
        </section>

      </div>
      </div>

      {/* ── Barra inferior ───────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-t border-gray-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">Total a pagar</span>
            <span
              className="text-2xl font-bold transition-colors"
              style={{ color: isComplete ? RED : "#d1d5db" }}
            >
              ${PRECIO.toLocaleString("es-AR")}
            </span>
          </div>
          <button
            onClick={() => isComplete && setShowPaymentModal(true)}
            disabled={!isComplete}
            className="w-full h-13 rounded-2xl flex items-center justify-center gap-2.5 text-sm font-semibold transition-all"
            style={
              isComplete
                ? { background: "#25D366", color: "white", boxShadow: "0 4px 15px rgba(37,211,102,0.3)" }
                : { background: "#f3f4f6", color: "#9ca3af" }
            }
          >
            <MessageCircle className="h-5 w-5" />
            Enviar jugada por WhatsApp
          </button>
          {!isComplete && (
            <p className="text-xs text-center text-gray-400 mt-2">
              {numerosElegidos.length < 6
                ? `Seleccioná ${6 - numerosElegidos.length} número${6 - numerosElegidos.length > 1 ? "s" : ""} más`
                : "Elegí el número Jackpot"}
            </p>
          )}
        </div>
      </div>

      {/* ── Modal de pago ────────────────────────────────────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">

            {/* Header rojo */}
            <div className="px-6 pt-6 pb-4" style={{ background: `linear-gradient(135deg, ${RED_DK}, ${RED})` }}>
              <h3 className="text-lg font-bold text-white text-center mb-1">Recordatorio de pago</h3>
              <p className="text-sm text-white/70 text-center">
                Transferí el total y compartinos el comprobante.
              </p>
            </div>

            {/* Números elegidos */}
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-xs text-center text-gray-400 mb-2">Tus números</p>
              <div className="flex justify-center gap-2 flex-wrap mb-3">
                {numerosElegidos.map((num) => (
                  <span key={num} className="w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center"
                    style={{ background: `${GOLD}25`, color: GOLD_DK }}
                  >
                    {num}
                  </span>
                ))}
              </div>
              {jackpot !== null && (
                <div className="flex items-center justify-center gap-2">
                  <Zap className="h-3.5 w-3.5" style={{ color: RED }} />
                  <span className="text-sm font-semibold text-gray-700">Jackpot: <span style={{ color: RED }} className="font-bold">{jackpot}</span></span>
                </div>
              )}
            </div>

            {/* Datos transferencia */}
            <div className="mx-6 my-4 bg-gray-50 rounded-2xl p-4 space-y-2">
              {[
                { label: "Alias",   value: "GEN.CUENCA.PISO" },
                { label: "Titular", value: "Javier A. Libertini" },
                { label: "Banco",   value: "Pcia. de Buenos Aires" },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="font-semibold text-gray-800">{row.value}</span>
                </div>
              ))}
              <div className="h-px bg-gray-200 my-1" />
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-gray-700">Total a transferir</span>
                <span className="font-bold text-lg" style={{ color: RED }}>${PRECIO.toLocaleString("es-AR")}</span>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-2">
              <button
                onClick={enviarWhatsApp}
                disabled={enviando}
                className="w-full h-12 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                style={{ background: "#25D366" }}
              >
                <MessageCircle className="h-5 w-5" />
                {enviando ? "Preparando jugada…" : "Enviar por WhatsApp"}
              </button>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full h-10 rounded-2xl text-sm text-gray-400 hover:text-gray-600 transition-colors"
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
