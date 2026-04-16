"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, CheckCircle2, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ValidacionResponse, DetalleGanancia, PendienteRazon } from "@/lib/types"
import confetti from "canvas-confetti"

const TURNO_LABEL: Record<string, string> = {
  previa:     "La Previa · 10:05",
  primera:    "La Primera · 11:50",
  matutina:   "Matutina · 14:50",
  vespertina: "Vespertina · 17:50",
  nocturna:   "Nocturna · 20:50",
}

const LOTERIA_LABEL: Record<string, string> = {
  provincia:  "Provincia de Buenos Aires",
  ciudad:     "Ciudad",
  cordoba:    "Córdoba",
  santafe:    "Santa Fe",
  entrerios:  "Entre Ríos",
  montevideo: "Montevideo",
}

const UBICACION_LABEL: Record<string, string> = {
  cabeza:    "Cabeza",
  premios5:  "01 a 05",
  premios10: "01 a 10",
  premios20: "01 a 20",
}

const CATEGORIA_LABEL: Record<string, string> = {
  cabeza:      "Cabeza",
  premios_5:   "Entre los primeros 5",
  premios_10:  "Entre los primeros 10",
  premios_20:  "Entre los primeros 20",
}

const PENDIENTE_COPY: Record<PendienteRazon, { titulo: string; descripcion: string }> = {
  antes_del_sorteo: {
    titulo: "Sorteo pendiente",
    descripcion: "El sorteo todavía no ocurrió. Volvé después de la hora del sorteo para ver si ganaste.",
  },
  cargando: {
    titulo: "Cargando resultados…",
    descripcion: "El sorteo ya se realizó. Los resultados oficiales se publican hasta 90 minutos después — volvé en unos minutos.",
  },
  demorado: {
    titulo: "Resultados demorados",
    descripcion: "Los resultados aún no están disponibles. Puede haber una demora en la publicación oficial. Volvé más tarde.",
  },
}

export function ValidarClient({ data }: { data: ValidacionResponse }) {
  const router = useRouter()
  const { estado, jugada, ganancias, pendiente_razon } = data

  useEffect(() => {
    if (estado !== "ganadora") return
    const end = Date.now() + 3500
    const fire = () => {
      confetti({
        particleCount: 50,
        startVelocity: 55,
        spread: 100,
        origin: { x: Math.random(), y: -0.1 },
        gravity: 1.4,
        ticks: 400,
        colors: ["#22c55e", "#16a34a", "#fbbf24", "#f59e0b", "#ffffff"],
      })
      if (Date.now() < end) setTimeout(fire, 80)
    }
    fire()
  }, [estado])

  const fecha = new Date(jugada.fecha_sorteo + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  return (
    <main className="min-h-screen bg-background pb-8">

      <nav className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Inicio</span>
          </button>
          <p className="font-semibold text-base">Verificar jugada</p>
        </div>
      </nav>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Banner de estado */}
        {estado === "pendiente" && (() => {
          const razon = pendiente_razon ?? "antes_del_sorteo"
          const { titulo, descripcion } = PENDIENTE_COPY[razon]
          return (
            <div className="bg-card border border-border rounded-2xl shadow-sm px-6 py-8 flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
                {razon === "cargando"
                  ? <Loader2 className="h-7 w-7 text-amber-500 animate-spin" />
                  : <Clock className="h-7 w-7 text-amber-500" />
                }
              </div>
              <div>
                <p className="font-bold text-lg">{titulo}</p>
                <p className="text-sm text-muted-foreground mt-1">{descripcion}</p>
              </div>
            </div>
          )
        })()}

        {estado === "ganadora" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl shadow-sm px-6 py-8 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <div>
              <p className="font-bold text-lg text-emerald-800">¡Ganaste!</p>
              <p className="text-sm text-emerald-700 mt-1">
                {jugada.redoblona
                  ? "Redoblona premiada."
                  : ganancias.length === 1
                  ? "Tenés 1 número premiado."
                  : `Tenés ${ganancias.length} números premiados.`}{" "}
                Contactá a la agencia para cobrar tu premio.
              </p>
              {data.monto_total_ganado != null && data.monto_total_ganado > 0 && (
                <p className="text-2xl font-bold text-emerald-800 mt-2">
                  ${data.monto_total_ganado.toLocaleString("es-AR")}
                </p>
              )}
            </div>
          </div>
        )}

        {estado === "no_ganadora" && (
          <div className="bg-card border border-border rounded-2xl shadow-sm px-6 py-8 flex flex-col items-center text-center gap-3">
            <div className="text-4xl">🍀</div>
            <div>
              <p className="font-bold text-lg">No fue esta vez</p>
              <p className="text-sm text-muted-foreground mt-1">Seguí jugando — ¡la suerte está de tu lado!</p>
            </div>
          </div>
        )}

        {/* Detalle de la jugada */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
            Tu jugada
          </p>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-base">
                  {jugada.game_type === "quiniela" ? "Quiniela" : "Quini 6"}
                </p>
                {jugada.turno && (
                  <p className="text-sm text-muted-foreground mt-0.5">{TURNO_LABEL[jugada.turno]}</p>
                )}
                {jugada.quinielas && jugada.quinielas.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {jugada.quinielas.map((q) => LOTERIA_LABEL[q]).join(" · ")}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground capitalize shrink-0 text-right">{fecha}</p>
            </div>

            {jugada.game_type === "quiniela" && jugada.jugadas_data && (
              <div className="divide-y divide-border">
                {jugada.jugadas_data.map((j, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 text-sm">
                    <span className="font-mono font-bold text-base tracking-widest">{j.numero}</span>
                    <span className="text-muted-foreground">{UBICACION_LABEL[j.ubicacion]}</span>
                    <span className="font-medium">${j.valor.toLocaleString("es-AR")}</span>
                  </div>
                ))}
              </div>
            )}

            {jugada.game_type === "quini6" && jugada.numeros_quini6 && (
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {jugada.numeros_quini6.map((n) => (
                  <span
                    key={n}
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-mono font-bold"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/30">
              <span className="text-sm text-muted-foreground">Total apostado</span>
              <span className="text-sm font-bold">${jugada.monto_total.toLocaleString("es-AR")}</span>
            </div>
          </div>
        </section>

        {/* Premios */}
        {ganancias.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Premios
            </p>
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden divide-y divide-border">
              {ganancias.map((g, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-base tracking-widest">{g.numero}</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{LOTERIA_LABEL[g.loteria]}</p>
                      <p className="text-xs text-muted-foreground">{CATEGORIA_LABEL[g.categoria]}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {g.monto_ganado != null && (
                      <p className="text-sm font-bold text-emerald-700">
                        ${g.monto_ganado.toLocaleString("es-AR")}
                      </p>
                    )}
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      Premio
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {estado !== "pendiente" && (
          <button
            onClick={() => router.push(jugada.game_type === "quiniela" ? "/quiniela" : "/quini6")}
            className="w-full h-13 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Jugar nuevamente
          </button>
        )}

      </div>
    </main>
  )
}
