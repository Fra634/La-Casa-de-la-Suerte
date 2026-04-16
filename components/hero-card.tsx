"use client"

import { useRef } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"
import Image from "next/image"
import { ChevronRight } from "lucide-react"

interface HeroCardProps {
  href: string
  amount: string   // ej: "$28.326"
  unit: string     // ej: "millones"
  schedule: string // ej: "Sorteo: Martes y viernes"
}

export function HeroCard({ href, amount, unit, schedule }: HeroCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null)

  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const spring = { stiffness: 120, damping: 20, mass: 0.6 }
  const x = useSpring(rawX, spring)
  const y = useSpring(rawY, spring)

  const bgX  = useTransform(x, v => v * 0.5)
  const bgY  = useTransform(y, v => v * 0.5)
  const fgX  = useTransform(x, v => v * -1.0)
  const fgY  = useTransform(y, v => v * -1.0)
  const rotateX = useTransform(y, v => -v * 0.03)
  const rotateY = useTransform(x, v =>  v * 0.03)

  function onMouseMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    rawX.set(e.clientX - (rect.left + rect.width  / 2))
    rawY.set(e.clientY - (rect.top  + rect.height / 2))
  }
  function onMouseLeave() { rawX.set(0); rawY.set(0) }

  return (
    <motion.a
      ref={cardRef as React.RefObject<HTMLAnchorElement>}
      href={href}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800, height: "171px" }}
      className="block rounded-2xl overflow-hidden relative select-none"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
    >

      {/* ── Fondo ─────────────────────────────────────────────────── */}
      <motion.div className="absolute inset-0" style={{ x: bgX, y: bgY, scale: 1.08 }}>
        <img src="/images/BackGroundHeroCardLotoPlus.png" alt="" className="w-full h-full object-cover" />
      </motion.div>

      {/* ── Logo con efecto — derecha, un poco más abajo ─────────── */}
      <motion.div
        className="absolute right-0 h-full"
        style={{ x: bgX, y: bgY, bottom: "-20px" }}
      >
        <img
          src="/images/LogoLotoPlusConEfecto.webp"
          alt=""
          className="h-full w-auto"
        />
      </motion.div>

      {/* ── Degradado izquierda ────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, rgba(10,1,0,0.85) 0%, rgba(10,1,0,0.65) 45%, rgba(10,1,0,0.12) 75%, transparent 100%)" }}
      />

      {/* ── Contenido ─────────────────────────────────────────────── */}
      <motion.div className="relative z-10 flex flex-col h-full" style={{ x: fgX, y: fgY }}>

        {/* Top bar — altura fija, imagen estirada al 100% */}
        <div
          className="flex items-center px-3 shrink-0"
          style={{
            height: "36px",
            backgroundImage: "url('/images/TopBarHeroCardLotoPLus.png')",
            backgroundSize: "100% 100%",
          }}
        >
          <img src="/images/LotoPlusLogo.png" alt="Loto Plus" style={{ height: "26px", width: "auto" }} className="shrink-0" />
          <p className="text-xs font-bold text-white uppercase tracking-widest whitespace-nowrap ml-2">
            Pozo acumulado
          </p>
        </div>

        {/* Cuerpo */}
        <div className="flex items-end justify-between px-4 pt-2 pb-2">
          <div className="flex flex-col gap-2 max-w-[60%]">
            <div>
              <p
                className="font-black leading-none"
                style={{
                  fontSize: "1.8rem",
                  color: "#f5c842",
                  textShadow: "0 0 8px rgba(245,196,66,0.9), 0 0 20px rgba(224,140,16,0.6), 0 0 40px rgba(198,64,34,0.35)",
                }}
              >
                {amount}
              </p>
              <p className="gold-shimmer text-sm font-bold">{unit}</p>
            </div>
            <div className="gold-btn inline-flex items-center gap-2 text-sm font-bold px-5 py-2 rounded-full self-start ml-3">
              Jugar <ChevronRight className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-auto">
          <span
            className="text-[10px] font-semibold text-white px-3 py-1"
            style={{ background: "linear-gradient(90deg, transparent, rgba(10,1,0,0.80) 30%, rgba(10,1,0,0.92))" }}
          >
            {schedule}
          </span>
        </div>

      </motion.div>
    </motion.a>
  )
}
