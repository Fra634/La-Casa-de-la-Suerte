"use client"

import { useEffect, useRef } from "react"

interface BulbNumberProps {
  text: string
  width?: number
  height?: number
  fontSize?: number
  spacing?: number
}

export function BulbNumber({
  text,
  width = 360,
  height = 90,
  fontSize = 70,
  spacing = 7,
}: BulbNumberProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let animId: number

    const init = () => {
      // Rasterizar texto en canvas offscreen
      const off = document.createElement("canvas")
      off.width = width
      off.height = height
      const offCtx = off.getContext("2d")!
      offCtx.font = `900 ${fontSize}px Impact, Arial Black, sans-serif`
      offCtx.fillStyle = "white"
      offCtx.textAlign = "center"
      offCtx.textBaseline = "middle"
      offCtx.fillText(text, width / 2, height / 2)

      // Detectar posiciones de focos (muestreo por grilla)
      const { data } = offCtx.getImageData(0, 0, width, height)
      const bulbs: { x: number; y: number; phase: number; speed: number }[] = []

      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) {
          const i = (Math.round(y) * width + Math.round(x)) * 4
          if (data[i + 3] > 80) {
            bulbs.push({
              x,
              y,
              phase: Math.random() * Math.PI * 2,
              speed: 0.8 + Math.random() * 2.5,
            })
          }
        }
      }

      const ctx = canvas.getContext("2d")!
      const r = spacing * 0.48

      const animate = () => {
        ctx.clearRect(0, 0, width, height)
        const t = performance.now() / 1000

        for (const b of bulbs) {
          // Parpadeo orgánico: suma de senoidales a distintas frecuencias
          const raw =
            0.50 +
            0.22 * Math.sin(t * b.speed + b.phase) +
            0.15 * Math.sin(t * b.speed * 2.7 + b.phase * 1.5) +
            0.08 * Math.sin(t * b.speed * 6.3 + b.phase * 0.7) +
            (Math.random() > 0.995 ? -0.4 : 0) // destello ocasional apagado
          const br = Math.max(0.12, Math.min(1, raw))

          // Halo exterior
          const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 3.5)
          grd.addColorStop(0,   `rgba(255,248,180,${br * 0.85})`)
          grd.addColorStop(0.35,`rgba(245,185,40,${br * 0.55})`)
          grd.addColorStop(0.7, `rgba(220,100,10,${br * 0.20})`)
          grd.addColorStop(1,   `rgba(180,50,0,0)`)
          ctx.beginPath()
          ctx.arc(b.x, b.y, r * 3.5, 0, Math.PI * 2)
          ctx.fillStyle = grd
          ctx.fill()

          // Núcleo del foco
          ctx.beginPath()
          ctx.arc(b.x, b.y, r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,252,210,${br})`
          ctx.fill()

          // Punto brillante central
          ctx.beginPath()
          ctx.arc(b.x - r * 0.25, b.y - r * 0.25, r * 0.35, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${br * 0.9})`
          ctx.fill()
        }

        animId = requestAnimationFrame(animate)
      }

      animate()
    }

    // Esperar a que las fuentes estén listas antes de rasterizar
    document.fonts.ready.then(init)

    return () => cancelAnimationFrame(animId)
  }, [text, width, height, fontSize, spacing])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "auto", display: "block" }}
    />
  )
}
