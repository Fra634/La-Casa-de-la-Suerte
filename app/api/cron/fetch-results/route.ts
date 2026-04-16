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
      // Identificar jurisdicción por clase del div de nombre
      let loteria: Loteria | null = null
      for (const { clase, loteria: lot } of LOTERIAS) {
        if ($(bloque).find(`.${clase}`).length) { loteria = lot; break }
      }
      if (!loteria) continue

      // Números en orden DOM: col1 = 1-10, col2 = 11-20
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

  // Headings en orden DOM
  const titulos: string[] = []
  $("h2.quini-titulos").each((_, el) => titulos.push($(el).text().trim().toUpperCase()))

  // Todos los números en orden DOM
  const todos: string[] = []
  $(".quini-numeros").each((_, el) => {
    const n = $(el).text().trim()
    if (n) todos.push(n)
  })

  // Emparejar: i-ésimo heading → números [i*6 .. i*6+5]
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

// ─── Loto Plus ────────────────────────────────────────────────────────────────

async function scrapearLotoPlus(fecha: string): Promise<string[]> {
  const html = await fetchHtml(`${BASE}/Loto.aspx`)
  const $    = cheerio.load(html)
  const db   = createAdminClient()

  const numeros: string[] = []
  $(".loto-numeros").each((_, el) => {
    const n = $(el).text().trim()
    if (/^\d+$/.test(n)) numeros.push(n.padStart(2, "0"))
  })

  const principales = numeros.slice(0, 6)
  if (principales.length !== 6) {
    return [`✗ lotoplus: solo ${principales.length} números encontrados`]
  }

  const { error } = await db.from("resultados_lotoplus").upsert(
    { fecha, numeros: principales },
    { onConflict: "fecha" }
  )
  return [error
    ? `✗ lotoplus: ${error.message}`
    : `✓ lotoplus: ${principales.join("-")}`
  ]
}

// ─── Handler principal ────────────────────────────────────────────────────────
// GET /api/cron/fetch-results
// Vercel envía automáticamente: Authorization: Bearer <CRON_SECRET>
// Para testing manual: ?secret=<CRON_SECRET>&force=all|quini6|lotoplus

export async function GET(request: NextRequest) {
  // Auth
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const secretParam = request.nextUrl.searchParams.get("secret")
    const authHeader  = request.headers.get("authorization")
    if (secretParam !== cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
  }

  const fecha = fechaArgentina()
  const dia   = diaArgentina() // 0=Dom 1=Lun 2=Mar 3=Mié 4=Jue 5=Vie 6=Sáb
  const force = request.nextUrl.searchParams.get("force") // "quini6"|"lotoplus"|"all"

  const logs: string[] = []

  // Quiniela — Lunes a Sábado
  if ((dia >= 1 && dia <= 6) || force === "all") {
    try { logs.push(...await scrapearQuiniela(fecha)) }
    catch (e) { logs.push(`✗ quiniela error: ${e}`) }
  }

  // Quini 6 — Miércoles (3) y Domingo (0)
  if (dia === 3 || dia === 0 || force === "quini6" || force === "all") {
    try { logs.push(...await scrapearQuini6(fecha)) }
    catch (e) { logs.push(`✗ quini6 error: ${e}`) }
  }

  // Loto Plus — Martes (2) y Viernes (5)
  if (dia === 2 || dia === 5 || force === "lotoplus" || force === "all") {
    try { logs.push(...await scrapearLotoPlus(fecha)) }
    catch (e) { logs.push(`✗ lotoplus error: ${e}`) }
  }

  return NextResponse.json({ ok: true, fecha, dia, logs })
}
