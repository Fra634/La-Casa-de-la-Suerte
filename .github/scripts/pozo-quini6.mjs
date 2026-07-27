// Obtiene el pozo estimado del Quini 6 desde tujugada.com.ar usando un navegador
// real (Playwright). El navegador ejecuta el JavaScript del desafío de Cloudflare
// y espera la cookie de clearance, cosa que un fetch de servidor no puede hacer.
// Corre en GitHub Actions y manda el valor a /api/admin/set-pozo.

import { chromium } from "playwright"

const UA  = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
const URL = "https://www.tujugada.com.ar/quini6.asp"
const SITE = "https://www.lacasadelasuerte.com.ar"

const browser = await chromium.launch({ args: ["--disable-blink-features=AutomationControlled"] })
const ctx = await browser.newContext({ userAgent: UA, locale: "es-AR", viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()

try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 })

  // Esperar a que Cloudflare libere y el pozo aparezca en el texto de la página.
  await page.waitForFunction(
    () => /PR[OÓ]XIMO\s+POZO/i.test(document.body.innerText),
    { timeout: 45000 },
  )

  const text = await page.evaluate(() => document.body.innerText)
  const idx  = text.search(/PR[OÓ]XIMO\s+POZO/i)
  const zona = text.slice(idx, idx + 200)
  const m    = zona.match(/\$\s*([\d]{1,3}(?:\.[\d]{3})+)/)
  if (!m) { console.error("No se encontró el monto del pozo"); process.exit(1) }

  const valor = m[1].replace(/\./g, "")
  console.log("Pozo obtenido:", valor)

  const res = await fetch(`${SITE}/api/admin/set-pozo?secret=${process.env.CRON_SECRET}&valor=${valor}`)
  console.log("set-pozo:", res.status, await res.text())
  if (!res.ok) process.exit(1)
} catch (e) {
  console.error("Falló:", e.message)
  process.exit(1)
} finally {
  await browser.close()
}
