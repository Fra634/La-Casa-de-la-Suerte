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

// Montevideo solo participa en matutina y nocturna
const TURNOS_MONTEVIDEO = new Set<Turno>(["matutina", "nocturna"])
// Total de combinaciones válidas: 5 loterias × 5 turnos + Montevideo × 2 = 27
const TOTAL_QUINIELA = TURNOS.length * (LOTERIAS.length - 1) + TURNOS_MONTEVIDEO.size

async function scrapearQuiniela(fecha: string): Promise<string[]> {
  const db  = createAdminClient()
  const log: string[] = []

  // 1. Leer estado actual — qué combos ya tienen los 20 números
  const { data: existing } = await db
    .from("resultados_quiniela")
    .select("turno, loteria, premios_20")
    .eq("fecha", fecha)

  const locked = new Set(
    (existing ?? [])
      .filter(r => (r.premios_20 ?? []).length === 20)
      .map(r => `${r.turno}-${r.loteria}`)
  )

  if (locked.size >= TOTAL_QUINIELA) {
    return ["✓ quiniela: todos los resultados completos"]
  }

  // 2. Scrape
  const html = await fetchHtml(`${BASE}/SorteosQuiniela3.aspx`)
  const $    = cheerio.load(html)
  let guardados = 0

  for (const { divId, turno } of TURNOS) {
    const turnDiv = $(`#${divId}`)
    if (!turnDiv.length) continue

    for (const bloque of turnDiv.find(".sorteos-enzo").toArray()) {
      let loteria: Loteria | null = null
      for (const { clase, loteria: lot } of LOTERIAS) {
        if ($(bloque).find(`.${clase}`).length) { loteria = lot; break }
      }
      if (!loteria) continue

      // Montevideo solo en matutina y nocturna
      if (loteria === "montevideo" && !TURNOS_MONTEVIDEO.has(turno)) continue

      const key = `${turno}-${loteria}`
      if (locked.has(key)) continue  // ya completo, no sobreescribir

      const numeros: string[] = []
      $(bloque).find(".Num").each((_, el) => {
        const n = $(el).text().trim()
        if (/^\d{4}$/.test(n)) numeros.push(n)
      })

      if (numeros.length !== 20) continue  // incompleto, esperar próxima ejecución

      const { error } = await db.from("resultados_quiniela").upsert(
        {
          fecha, turno, loteria,
          cabeza:     numeros[0],
          premios_5:  numeros.slice(0, 5),
          premios_10: numeros.slice(0, 10),
          premios_20: numeros,
        },
        { onConflict: "fecha,turno,loteria" }
      )
      if (error) {
        log.push(`✗ quiniela ${loteria} ${turno}: ${error.message}`)
      } else {
        log.push(`✓ quiniela ${loteria} ${turno}: ${numeros[0]}`)
        guardados++
      }
    }
  }

  const restantes = TOTAL_QUINIELA - locked.size - guardados
  if (restantes > 0) log.push(`… quiniela: ${restantes} combos pendientes`)
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

// ─── Quini 6 — Pozo acumulado ─────────────────────────────────────────────────
// Intentamos 2 fuentes en orden:
//   1. loteriasantafe.gov.ar — tiene el pozo siempre visible
//   2. jugandoonline.com.ar  — fallback, solo muestra cuando es vacante

const FUENTES_POZO = [
  "https://www.loteriasantafe.gov.ar/index.php/resultados/quini-6",
  // jugandoonline fallback deshabilitado — muestra montos de premios individuales, no el pozo acumulado
]

async function fetchHtmlSafe(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-AR,es;q=0.9",
      },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

async function scrapearPozosQuini6(): Promise<string[]> {
  const db = createAdminClient()

  for (const url of FUENTES_POZO) {
    const html = await fetchHtmlSafe(url)
    if (!html) continue

    const $ = cheerio.load(html)
    const bodyText = $("body").text()

    // Buscar montos en formato argentino: $ 4.600.000.000 o $4.600.000.000
    const matches = [...bodyText.matchAll(/\$\s*([\d]{1,3}(?:\.[\d]{3})+)/g)]
    let pozoTradicional: number | null = null
    for (const m of matches) {
      const num = parseInt(m[1].replace(/\./g, ""), 10)
      if (num > 100_000_000) { pozoTradicional = num; break }
    }

    if (!pozoTradicional) continue

    const { error } = await db.from("pozos_acumulados").upsert(
      { id: 1, tradicional: pozoTradicional, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    return [error
      ? `✗ pozos quini6: ${error.message}`
      : `✓ pozos quini6 (${new URL(url).hostname}): $${Math.round(pozoTradicional / 1_000_000).toLocaleString("es-AR")} millones`
    ]
  }

  return ["– pozos quini6: no se pudo obtener el pozo de ninguna fuente"]
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

  // Quiniela — Lunes a Sábado (o forzado)
  if ((dia >= 1 && dia <= 6) || force === "quiniela" || force === "all") {
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
