"use client"

import { useState } from "react"

// ── Actualizá este Set cuando agregues nuevas imágenes ───────────────────────
const AVAILABLE_IMAGES = new Set(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"])

// ── Grilla dot-matrix 5 columnas × 7 filas (fallback SVG) ───────────────────
const DIGITS: Record<string, number[][]> = {
  "0": [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  "1": [
    [0,0,1,0,0],
    [0,1,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,1,1,1,0],
  ],
  "2": [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [0,0,0,0,1],
    [0,0,0,1,0],
    [0,0,1,0,0],
    [0,1,0,0,0],
    [1,1,1,1,1],
  ],
  "3": [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [0,0,0,0,1],
    [0,0,1,1,0],
    [0,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  "4": [
    [0,0,0,1,0],
    [0,0,1,1,0],
    [0,1,0,1,0],
    [1,0,0,1,0],
    [1,1,1,1,1],
    [0,0,0,1,0],
    [0,0,0,1,0],
  ],
  "5": [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,1,1,1,0],
  ],
  "6": [
    [0,0,1,1,0],
    [0,1,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  "7": [
    [1,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,1,0],
    [0,0,0,1,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
  ],
  "8": [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  "9": [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,1,0],
    [0,1,1,0,0],
  ],
}

const CELL = 12
const R    = 4.5
const PAD  = 6
const COLS = 5
const ROWS = 7
const W = PAD * 2 + COLS * CELL   // 72
const H = PAD * 2 + ROWS * CELL   // 96

function bulbDelay(rx: number, ry: number)    { return ((rx * 3 + ry * 7 + rx * ry) % 29) * 0.11 }
function bulbDuration(rx: number, ry: number) { return 2.2 + ((rx + ry * 2) % 7) * 0.28 }

// ── Fallback SVG para dígitos sin imagen ─────────────────────────────────────
function BulbDigit({ digit, size = 1 }: { digit: string; size?: number }) {
  const pattern = DIGITS[digit]
  if (!pattern) return null
  return (
    <svg
      width={W * size}
      height={H * size}
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", overflow: "visible", flexShrink: 0 }}
    >
      {pattern.map((row, ry) =>
        row.map((on, rx) => {
          const cx = PAD + rx * CELL + CELL / 2
          const cy = PAD + ry * CELL + CELL / 2
          return (
            <circle
              key={`${ry}-${rx}`}
              cx={cx} cy={cy} r={R}
              fill={on ? "#f5c842" : "#3d1500"}
              opacity={on ? 1 : 0.28}
              style={on ? {
                filter: "drop-shadow(0 0 2.5px #f8d44a) drop-shadow(0 0 6px #e08c10)",
                animationName: "marquee-bulb",
                animationDuration: `${bulbDuration(rx, ry)}s`,
                animationDelay: `${bulbDelay(rx, ry)}s`,
                animationTimingFunction: "ease-in-out",
                animationIterationCount: "infinite",
              } : undefined}
            />
          )
        })
      )}
    </svg>
  )
}

// ── Un carácter: imagen si existe, SVG si no ─────────────────────────────────
function DigitChar({ char, size }: { char: string; size: number }) {
  const imgH  = H * size
  const isDot = char === "." || char === ","

  // Separador dorado
  if (isDot) {
    return (
      <span style={{
        fontSize: `${imgH * 0.55}px`,
        lineHeight: 1,
        fontWeight: 900,
        color: "#f5c842",
        textShadow: "0 0 8px rgba(245,196,66,0.8), 0 0 16px rgba(224,140,16,0.5)",
        alignSelf: "flex-end",
        paddingBottom: `${size * 6}px`,
        flexShrink: 0,
      }}>·</span>
    )
  }

  // Dígito con imagen
  if (AVAILABLE_IMAGES.has(char)) {
    return (
      <img
        src={`/images/digit-${char}.webp`}
        alt={char}
        style={{ height: `${imgH}px`, width: "auto", display: "block", flexShrink: 0 }}
      />
    )
  }

  // Fallback SVG para dígito
  if (DIGITS[char]) return <BulbDigit digit={char} size={size} />

  // Fallback texto para separadores sin imagen
  if (isDot) {
    return (
      <span style={{
        fontSize: `${imgH * 0.5}px`,
        fontWeight: 900,
        color: "rgba(245,196,66,0.45)",
        alignSelf: "flex-end",
        paddingBottom: `${size * 5}px`,
        flexShrink: 0,
      }}>·</span>
    )
  }

  return null
}

// ── Componente principal ─────────────────────────────────────────────────────
interface MarqueeAmountProps {
  value: string      // ej: "$88.000" o "88.000"
  size?: number      // factor de escala (default 1)
  className?: string
}

export function MarqueeAmount({ value, size = 1, className }: MarqueeAmountProps) {
  const digitH = H * size

  return (
    <div
      className={`flex items-center flex-wrap ${className ?? ""}`}
      style={{ gap: `${Math.round(size * 3)}px` }}
    >
      {value.split("").map((char, i) => {
        // Dígito o separador
        if (DIGITS[char] || char === "." || char === ",") {
          return <DigitChar key={i} char={char} size={size} />
        }

        // $
        if (char === "$") {
          return (
            <span key={i} style={{
              fontSize: `${digitH * 0.62}px`,
              lineHeight: 1,
              fontWeight: 900,
              color: "#f5c842",
              textShadow: "0 0 8px rgba(245,196,66,0.9), 0 0 20px rgba(224,140,16,0.6), 0 0 35px rgba(198,64,34,0.3)",
              alignSelf: "center",
              flexShrink: 0,
            }}>$</span>
          )
        }

        // Espacio
        if (char === " ") {
          return <div key={i} style={{ width: `${CELL * size * 0.75}px`, flexShrink: 0 }} />
        }

        return null
      })}
    </div>
  )
}
