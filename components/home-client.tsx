"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ResultadosView } from "@/components/resultados-view"
import { HeroCard } from "@/components/hero-card"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SORTEOS = [
  { nombre: "La Previa",  hora: "10:05", min: 605  },
  { nombre: "Primera",    hora: "11:50", min: 710  },
  { nombre: "Matutina",   hora: "14:50", min: 890  },
  { nombre: "Vespertina", hora: "17:50", min: 1070 },
  { nombre: "Nocturna",   hora: "20:50", min: 1250 },
]

function getProximoSorteo(): { nombre: string; hora: string } {
  const arStr = new Date().toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit", minute: "2-digit", hour12: false,
  })
  const [h, m] = arStr.split(":").map(Number)
  const minutos = h * 60 + m
  return SORTEOS.find((s) => s.min > minutos) ?? SORTEOS[0]
}

function formatPozo(n: number): string {
  return `$${n.toLocaleString("es-AR")}`
}

/** Convierte 4_600_000_000 → "$4.600" para mostrar junto a "millones" */
function pozoEnMillones(n: number): string {
  return `$${Math.round(n / 1_000_000).toLocaleString("es-AR")}`
}

// ─── Componente ───────────────────────────────────────────────────────────────

type HomeTab = "jugar" | "resultados"

export function HomeClient({ pozo, pozoLotoPlus }: { pozo: number; pozoLotoPlus: number }) {
  const [tab, setTab]   = useState<HomeTab>("jugar")
  const touchStart      = useRef({ x: 0, y: 0 })
  const proximoSorteo   = getProximoSorteo()
  const hayPozo         = pozo > 0

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onTouchEnd(e: React.TouchEvent) {
    const dx = touchStart.current.x - e.changedTouches[0].clientX
    const dy = touchStart.current.y - e.changedTouches[0].clientY
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 55) {
      if (dx > 0) setTab("resultados")
      else        setTab("jugar")
    }
  }

  return (
    <div className="flex flex-col bg-background" style={{ minHeight: "100dvh" }}>

      {/* ── Header compacto ─────────────────────────────────────────── */}
      <header
        className="px-4 py-3 flex items-center gap-3 shrink-0"
        style={{ background: "linear-gradient(160deg, oklch(0.38 0.15 148) 0%, oklch(0.50 0.17 148) 100%)" }}
      >
        <div className="w-10 h-10 relative shrink-0">
          <Image src="/images/agency-logo.png" alt="Logo La Casa de la Suerte" fill className="object-contain" priority />
        </div>
        <div>
          <h1 className="text-base font-bold text-white leading-tight">La Casa de la Suerte</h1>
          <p className="gold-shimmer text-[11px] font-semibold">
            Agencia Oficial · Legajo Nº 705883
          </p>
          <p className="gold-shimmer text-[11px]">
            Av. Ader 1682, Villa Adelina, San Isidro
          </p>
        </div>
      </header>

      {/* ── Tab bar ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-card border-b border-border shrink-0">
        <div className="max-w-lg mx-auto flex">
          {(["jugar", "resultados"] as HomeTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-3.5 text-sm font-semibold transition-colors relative",
                tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "jugar" ? "Jugar" : "Resultados"}
              {tab === t && (
                <span className="absolute bottom-0 left-8 right-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Área de contenido deslizable ────────────────────────────── */}
      <div
        className="flex-1 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out h-full"
          style={{ width: "200%", transform: `translateX(${tab === "jugar" ? "0%" : "-50%"})` }}
        >

          {/* Panel: Jugar */}
          <div className="w-1/2 overflow-y-auto">
            <div className="max-w-lg w-full mx-auto px-4 py-5 space-y-4">

              {/* Próximo sorteo Quiniela — siempre visible */}
              <Link
                href="/quiniela"
                className="block rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow relative"
                style={{ background: "#111", height: "171px" }}
              >
                {/* Imagen de fondo: bolas de lotería */}
                <div className="absolute inset-0 w-full h-full">
                  <Image
                    src="/images/quiniela-bolas.png"
                    alt=""
                    fill
                    className="object-cover object-center opacity-60"
                    priority
                  />
                </div>

                {/* Barra superior */}
                <div
                  className="flex items-center gap-2.5 px-4 py-2 relative z-10"
                  style={{ background: "linear-gradient(90deg, #007a3d, #00a651)" }}
                >
                  <div className="relative w-16 h-7 shrink-0">
                    <Image src="/images/quiniela-logo.png" alt="Quiniela" fill className="object-contain object-left" />
                  </div>
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Próximo sorteo</p>
                </div>

                {/* Cuerpo: turno + hora + botón */}
                <div className="relative z-10 flex items-end justify-between px-4 pt-2 pb-2">
                  <div className="flex flex-col gap-2 max-w-[55%]">
                    <div>
                      <p className="text-3xl font-bold text-white leading-none drop-shadow-md">{proximoSorteo.nombre}</p>
                      <p className="text-sm font-semibold text-white/80">{proximoSorteo.hora} hs</p>
                    </div>
                    <div className="gold-btn inline-flex items-center gap-2 text-sm font-bold px-5 py-2 rounded-full self-start ml-3">
                      Jugar <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Barra inferior derecha */}
                <div className="relative z-10 flex justify-end">
                  <span
                    className="text-[10px] font-semibold text-white px-3 py-1"
                    style={{ background: "linear-gradient(90deg, transparent, oklch(0.22 0.12 148 / 0.90) 30%, oklch(0.18 0.10 148 / 0.95))" }}
                  >
                    5 sorteos diarios: Lunes a sábado
                  </span>
                </div>
              </Link>

              {/* Pozo Quini 6 */}
              {hayPozo && (
                <Link
                  href="/quini6"
                  className="block rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow relative"
                  style={{ background: "linear-gradient(135deg, oklch(0.18 0.08 260) 0%, oklch(0.22 0.12 255) 100%)", height: "171px" }}
                >
                  {/* Video — ocupa toda la card, anclado arriba */}
                  <video
                    src="/images/quini6-mascota.webm"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute left-0 right-0 bottom-0 w-full h-full object-cover"
                    style={{ top: "30px" }}
                  />

                  {/* Contenido encima del video */}
                  <div className="relative z-10 flex flex-col">

                    {/* Barra superior: logo + POZO ACUMULADO */}
                    <div className="flex items-center gap-2.5 px-4 py-2" style={{ background: "linear-gradient(90deg, oklch(0.68 0.16 72), oklch(0.74 0.18 80))" }}>
                      <div className="relative w-16 h-7 shrink-0">
                        <Image src="/images/quini6-logo.png" alt="Quini 6" fill className="object-contain object-left" />
                      </div>
                      <p className="text-xs font-bold text-white uppercase tracking-widest">
                        Pozo Acumulado
                      </p>
                    </div>

                    {/* Cuerpo: monto + botón izquierda, muñeco derecha */}
                    <div className="flex items-end justify-between px-4 pt-2 pb-2">
                      <div className="flex flex-col gap-2 max-w-[52%]">
                        <div>
                          <p
                            className="font-black leading-none tabular-nums"
                            style={{
                              fontSize: "1.8rem",
                              color: "#ffffff",
                              textShadow: "0 0 6px rgba(255,255,255,0.55), 0 0 16px rgba(200,230,255,0.45), 0 0 38px rgba(150,200,255,0.28), 0 0 70px rgba(100,170,255,0.15)",
                            }}
                          >
                            {pozoEnMillones(pozo)}
                          </p>
                          <p
                            className="text-sm font-bold"
                            style={{
                              color: "#ffffff",
                              textShadow: "0 0 4px rgba(255,255,255,0.45), 0 0 10px rgba(200,230,255,0.35), 0 0 22px rgba(150,200,255,0.22)",
                            }}
                          >
                            millones
                          </p>
                        </div>
                        <div className="gold-btn inline-flex items-center gap-2 text-sm font-bold px-5 py-2 rounded-full self-start ml-3">
                          Jugar <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>

                      {/* Espacio para que se vea el muñeco */}
                      <div className="w-1/2" />
                    </div>

                    {/* Sorteos — barra pegada al borde inferior derecho */}
                    <div className="flex justify-end">
                      <span
                        className="text-[10px] font-semibold text-white px-3 py-1"
                        style={{ background: "linear-gradient(90deg, transparent, oklch(0.65 0.16 55 / 0.90) 30%, oklch(0.72 0.18 75 / 0.95))" }}
                      >
                        Sorteo: Miércoles y domingos
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* Loto Plus */}
              <HeroCard
                href="/lotoplus"
                amount={pozoLotoPlus > 0 ? pozoEnMillones(pozoLotoPlus) : "$–"}
                unit="millones"
                schedule="Sorteo: Martes y viernes"
              />

            </div>

            <footer className="pb-8 pt-2 text-center">
              <p className="text-xs text-muted-foreground">La Casa de la Suerte · Tu agencia de confianza</p>
            </footer>
          </div>

          {/* Panel: Resultados */}
          <div className="w-1/2 overflow-y-auto">
            <div className="max-w-lg mx-auto">
              <ResultadosView />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
