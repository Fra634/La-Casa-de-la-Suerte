import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"
import { createAdminClient } from "@/lib/supabase"
import type { Turno, Loteria, TipoQuini6 } from "@/lib/types"

const BASE = "https://www.jugandoonline.com.ar"
const UA   = "Mozilla/5.0 (compatible; agencia-suerte-bot/1.0)"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fechaArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  })
}

/** 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb */
function diaArgentina(): number {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  ).getDay()
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} al obtener ${url}`)
  return res.text()
}

// ─── Quiniela ─────────────────────────────────────────────────────────────────

const TURNOS: { divId: string; turno: Turno }[] = [
  { divId: "MainContent_DivLaPrevia",   turno: "previa"     },
  { divId: "MainContent_DivLaPrimera",  turno: "primera"    },
  { divId: "MainContent_DivMatutina",   turno: "matutina"   },
  { divId: "MainContent_DivVespertina", turno: "vespertina" },
  { divId: "MainContent_DivNocturna",   turno: "nocturna"   },
]

const LOTERIAS: { clase: string; loteria: Loteria }[] = [
  { clase: "Ciudad",     loteria: "ciudad"    },
  { clase: "ProvBsAs",   loteria: "provincia" },
  { clase: "SantaFe",    loteria: "santafe"   },
  { clase: "Cordoba",    loteria: "cordoba"   },
  { clase: "EntreRios",  loteria: "entrerios" },
  { clase: "Montevideo", loteria: "montevideo"},
]

async function scrapearQuiniela(fecha: string): Promise<string[]> {
  const html = await fetchHtml(`${BASE}/SorteosQuiniela3.aspx`)
  const $    = cheerio.load(html)
  const db   = createAdminClient()
  const log: string[] = []

  for (const { divId, turno } of TURNOS) {
    const turnDiv = $(`#${divId}`)
    if (!turnDiv.length) { log.push(`– ${turno}: sin datos aún`); continue }

    for (const bloque of turnDiv.find(".sorteos-enzo").toArray()) {
      let loteria: Loteria | null = null
      for (const { clase, loteria: lot } of LOTERIAS) {
        if ($(bloque).find(`.${clase}`).length) { loteria = lot; break }
      }
      if (!loteria) continue

      const numeros: string[] = []
      $(bloque).find(".Num").each((_, el) => {
        const n = $(el).text().trim()
        if (/^\d{4}$/.test(n)) numeros.push(n)
      })
      if (numeros.length === 0) continue

      const { error } = await db.from("resultados_quiniela").upsert(
        {
          fecha, turno, loteria,
          cabeza:     numeros[0],
          premios_5:  numeros.slice(0, 5),
          premios_10: numeros.slice(0, 10),
          premios_20: numeros.slice(0, 20),
        },
        { onConflict: "fecha,turno,loteria" }
      )
      log.push(error
        ? `✗ quiniela ${loteria} ${turno}: ${error.message}`
        : `✓ quiniela ${loteria} ${turno}: ${numeros[0]}`
      )
    }
  }
  return log
}

// ─── Quini 6 ──────────────────────────────────────────────────────────────────

const QUINI6_TIPOS: { patron: string; tipo: TipoQuini6 }[] = [
  { patron: "PRIMER SORTEO", tipo: "tradicional"  },
  { patron: "SEGUNDA",       tipo: "segunda"      },
  { patron: "REVANCHA",      tipo: "revancha"     },
  { patron: "SALE",          tipo: "siempre_sale" },
]

async function scrapearQuini6(fecha: string): Promise<string[]> {
  const html = await fetchHtml(`${BASE}/Quini6/sorteos.asp`)
  const $    = cheerio.load(html)
  const db   = createAdminClient()
  const log: string[] = []

  const titulos: string[] = []
  $("h2.quini-titulos").each((_, el) => titulos.push($(el).text().trim().toUpperCase()))

  const todos: string[] = []
  $(".quini-numeros").each((_, el) => {
    const n = $(el).text().trim()
    if (n) todos.push(n)
  })

  for (let i = 0; i < titulos.length; i++) {
    const numeros = todos.slice(i * 6, i * 6 + 6)
    if (numeros.length !== 6) continue

    let tipo: TipoQuini6 | null = null
    for (const { patron, tipo: t } of QUINI6_TIPOS) {
      if (titulos[i].includes(patron)) { tipo = t; break }
    }
    if (!tipo) continue

    const { error } = await db.from("resultados_quini6").upsert(
      { fecha, tipo, numeros },
      { onConflict: "fecha,tipo" }
    )
    log.push(error
      ? `✗ quini6 ${tipo}: ${error.message}`
      : `✓ quini6 ${tipo}: ${numeros.join("-")}`
    )
  }
  return log
}

// ─── Quini 6 — Pozos acumulados ───────────────────────────────────────────────
// Intenta extraer el pozo acumulado de cada modalidad desde la página de resultados.
// Cuando el jackpot no fue ganado (vacante), la página muestra el monto acumulado.

async function scrapearPozosQuini6(): Promise<string[]> {
  const html = await fetchHtml(`${BASE}/Quini6/sorteos.asp`)
  const $    = cheerio.load(html)
  const db   = createAdminClient()

  const TIPOS_POZO: { patron: string; key: string }[] = [
    { patron: "PRIMER SORTEO", key: "tradicional"  },
    { patron: "SEGUNDA",       key: "segunda"      },
    { patron: "REVANCHA",      key: "revancha"     },
    { patron: "SALE",          key: "siempre_sale" },
  ]

  const pozos: Record<string, number> = {}

  // Para cada encabezado de sección, buscamos un monto de pozo en el texto siguiente
  $("h2.quini-titulos").each((_, headingEl) => {
    const heading = $(headingEl).text().trim().toUpperCase()
    let key: string | null = null
    for (const { patron, key: k } of TIPOS_POZO) {
      if (heading.includes(patron)) { key = k; break }
    }
    if (!key) return

    // Recolectar texto de los hermanos hasta el próximo h2
    let sectionText = ""
    let cursor = $(headingEl).next()
    while (cursor.length && !cursor.is("h2.quini-titulos")) {
      sectionText += " " + cursor.text()
      cursor = cursor.next()
    }

    // Buscar monto en formato $1.608.013.134 o 1.608.013.134
    const match = sectionText.match(/\$\s*([\d.]+(?:\.\d{3})+)/)
      || sectionText.match(/POZO[^$\d]*([\d.]+(?:\.\d{3})+)/i)
    if (match) {
      const num = parseInt(match[1].replace(/\./g, ""), 10)
      if (num > 100_000) pozos[key] = num
    }
  })

  if (Object.keys(pozos).length === 0) {
    return ["– pozos quini6: sin datos de pozo vacante esta semana"]
  }

  const { error } = await db.from("pozos_acumulados").upsert(
    { id: 1, ...pozos, updated_at: new Date().toISOString() },
    { onConflict: "id" }
  )
  return [error
    ? `✗ pozos quini6: ${error.message}`
    : `✓ pozos quini6: ${JSON.stringify(pozos)}`
  ]
}

// ─── Loto Plus ────────────────────────────────────────────────────────────────
// Página: /Loto.aspx
//   - .loto-numeros  → todos los números en orden DOM
//     · 0–5:   TRADICIONAL
//     · 6–11:  MATCH
//     · 12–17: DESQUITE
//     · 18–23: SALE O SALE
//   - NÚMERO PLUS: elemento propio (clase o heading adyacente)
//   - Próximo Pozo: texto "Próximo Pozo" en la página

async function scrapearLotoPlus(fecha: string): Promise<string[]> {
  const html = await fetchHtml(`${BASE}/Loto.aspx`)
  const $    = cheerio.load(html)
  const db   = createAdminClient()

  // ── Todos los números en orden DOM ─────────────────────────────────────────
  const todos: string[] = []
  $(".loto-numeros").each((_, el) => {
    const n = $(el).text().trim()
    if (/^\d+$/.test(n)) todos.push(n.padStart(2, "0"))
  })

  if (todos.length < 6) {
    return [`✗ lotoplus: solo ${todos.length} números encontrados`]
  }

  // Agrupar por sección (6 por sección, orden fijo en el HTML)
  const secciones = {
    tradicional: todos.slice(0, 6),
    match:       todos.length >= 12 ? todos.slice(6, 12)  : [] as string[],
    desquite:    todos.length >= 18 ? todos.slice(12, 18) : [] as string[],
    sale:        todos.length >= 24 ? todos.slice(18, 24) : [] as string[],
  }

  // ── NÚMERO PLUS ─────────────────────────────────────────────────────────────
  // Está en el <td> sibling del <td> con texto "NÚMERO PLUS" en la misma fila
  let numeroPlus: string | null = null
  $("td").each((_, el) => {
    if (/^n[uú]mero\s+plus$/i.test($(el).text().trim())) {
      $(el).closest("tr").find("td").each((_, td) => {
        if (td === el) return // saltar el label
        // texto directo del td
        const direct = $(td).clone().children().remove().end().text().trim()
        if (/^\d{1,2}$/.test(direct)) { numeroPlus = direct.padStart(2, "0"); return false }
        // primer hijo span/div
        const child = $(td).find("span, div").first().text().trim()
        if (/^\d{1,2}$/.test(child)) { numeroPlus = child.padStart(2, "0"); return false }
      })
      return false
    }
  })

  // ── Próximo Pozo Estimado ────────────────────────────────────────────────────
  // El h2.loto-titulos "Próximo Pozo Estimado" precede al elemento con el monto
  let pozoProximo: number | null = null
  $("h2.loto-titulos").each((_, el) => {
    if (/pr[oó]ximo\s+pozo/i.test($(el).text())) {
      let cursor = $(el).next()
      while (cursor.length && pozoProximo === null) {
        const txt = cursor.text().trim()
        const match = txt.match(/\$?\s*(\d{1,3}(?:\.\d{3})+)/)
        if (match) {
          const num = parseInt(match[1].replace(/\./g, ""), 10)
          if (num > 1_000_000) pozoProximo = num
        }
        cursor = cursor.next()
      }
      return false
    }
  })

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const { error } = await db.from("resultados_lotoplus").upsert(
    {
      fecha,
      numeros:          secciones.tradicional,
      numeros_match:    secciones.match.length    ? secciones.match    : null,
      numeros_desquite: secciones.desquite.length ? secciones.desquite : null,
      numeros_sale:     secciones.sale.length     ? secciones.sale     : null,
      numero_plus:      numeroPlus,
      pozo_proximo:     pozoProximo,
    },
    { onConflict: "fecha" }
  )

  return [error
    ? `✗ lotoplus: ${error.message}`
    : `✓ lotoplus: trad=${secciones.tradicional.join("-")} match=${secciones.match.length} plus=${numeroPlus ?? "?"} pozo=${pozoProximo ?? "?"}`
  ]
}

// ─── Handler principal ────────────────────────────────────────────────────────
// GET /api/cron/fetch-results
// Vercel envía: Authorization: Bearer <CRON_SECRET>
// Testing: ?secret=<CRON_SECRET>&force=all|quini6|lotoplus

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const secretParam = request.nextUrl.searchParams.get("secret")
    const authHeader  = request.headers.get("authorization")
    if (secretParam !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  const fecha = fechaArgentina()
  const dia   = diaArgentina() // 0=Dom 1=Lun … 6=Sáb
  const force = request.nextUrl.searchParams.get("force") // "quini6"|"lotoplus"|"all"

  const logs: string[] = []

  // Quiniela — Lunes a Sábado
  if ((dia >= 1 && dia <= 6) || force === "all") {
    try { logs.push(...await scrapearQuiniela(fecha)) }
    catch (e) { logs.push(`✗ quiniela error: ${e}`) }
  }

  // Quini 6 — Miércoles (3) y Domingo (0)
  // El cron dedicado corre el día siguiente (Jue y Lun) a las 10 AM AR
  if (dia === 3 || dia === 0 || force === "quini6" || force === "all") {
    try { logs.push(...await scrapearQuini6(fecha)) }
    catch (e) { logs.push(`✗ quini6 error: ${e}`) }
    // También intentamos actualizar los pozos acumulados
    try { logs.push(...await scrapearPozosQuini6()) }
    catch (e) { logs.push(`✗ pozos quini6 error: ${e}`) }
  }

  // Loto Plus — Martes (2) y Viernes (5)
  // El cron dedicado corre el día siguiente (Mié y Sáb) a las 10 AM AR
  if (dia === 2 || dia === 5 || force === "lotoplus" || force === "all") {
    try { logs.push(...await scrapearLotoPlus(fecha)) }
    catch (e) { logs.push(`✗ lotoplus error: ${e}`) }
  }

  return NextResponse.json({ ok: true, fecha, dia, logs })
}
