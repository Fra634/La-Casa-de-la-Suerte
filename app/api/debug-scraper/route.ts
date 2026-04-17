import { NextRequest, NextResponse } from "next/server"
import * as cheerio from "cheerio"

const ENDPOINT = "https://quiniela.loteriadelaciudad.gob.ar/resultadosQuiniela/consultaResultados.php"
const MAIN_PAGE = "https://quiniela.loteriadelaciudad.gob.ar/"
const CODIGO = "0080"

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const action       = request.nextUrl.searchParams.get("action") ?? "sorteos"
  const jurisdiccion = request.nextUrl.searchParams.get("jurisdiccion") ?? "51"
  const sorteo       = request.nextUrl.searchParams.get("sorteo") ?? ""

  try {
    if (action === "sorteos") {
      const res  = await fetch(MAIN_PAGE, { headers: { "User-Agent": "Mozilla/5.0" } })
      const html = await res.text()
      const $    = cheerio.load(html)

      const opciones: { value: string; texto: string }[] = []
      $("#valor3 option").each((_, el) => {
        opciones.push({ value: $(el).attr("value") ?? "", texto: $(el).text().trim() })
      })

      // Buscar todos los selects para entender la estructura
      const selects: { id: string; name: string; opciones: { value: string; texto: string }[] }[] = []
      $("select").each((_, el) => {
        const opts: { value: string; texto: string }[] = []
        $(el).find("option").each((_, o) => {
          opts.push({ value: $(o).attr("value") ?? "", texto: $(o).text().trim() })
        })
        selects.push({ id: $(el).attr("id") ?? "", name: $(el).attr("name") ?? "", opciones: opts })
      })

      return NextResponse.json({ opciones: opciones.slice(0, 10), selects })
    }

    if (action === "numeros") {
      if (!sorteo) return NextResponse.json({ error: "Falta ?sorteo=XXXXX" }, { status: 400 })

      const body = new URLSearchParams({ codigo: CODIGO, juridiccion: jurisdiccion, sorteo })
      const res  = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
          Referer: MAIN_PAGE,
        },
        body: body.toString(),
      })

      const html = await res.text()
      const $    = cheerio.load(html)

      // Parseo con .pos
      const numerosConPos: { pos: number; numero: string }[] = []
      $(".infoJuego td").each((_, td) => {
        let pos = -1; let numero = ""
        $(td).find("div").each((_, div) => {
          const txt = $(div).text().trim()
          if ($(div).hasClass("pos")) pos = parseInt(txt, 10)
          else if (/^\d{4}$/.test(txt)) numero = txt
        })
        if (pos > 0 && numero) numerosConPos.push({ pos, numero })
      })
      numerosConPos.sort((a, b) => a.pos - b.pos)

      // Parseo alternativo — todos los divs con 4 dígitos en orden DOM
      const numerosDOM: string[] = []
      $(".infoJuego div").each((_, div) => {
        const txt = $(div).text().trim()
        if (/^\d{4}$/.test(txt)) numerosDOM.push(txt)
      })

      // Raw de los primeros 5 tds
      const tdsRaw: string[] = []
      $(".infoJuego td").each((_, td) => { tdsRaw.push($(td).html()?.trim() ?? "") })

      return NextResponse.json({
        jurisdiccion,
        sorteo,
        htmlLength: html.length,
        empty: html.trim().length < 100,
        numerosConPos,           // método actual (sort por .pos)
        numerosDOM,              // método alternativo (orden DOM)
        tdsRaw: tdsRaw.slice(0, 6),
        htmlSnippet: html.substring(0, 3000),
      })
    }

    // ── Probar varios códigos de jurisdicción para encontrar Entre Ríos ─────────
    if (action === "buscar-entrerios") {
      if (!sorteo) return NextResponse.json({ error: "Falta ?sorteo=XXXXX" }, { status: 400 })

      // Rango amplio de códigos
      const candidatos = Array.from({ length: 60 }, (_, i) => String(i + 40))
      const resultados: { code: string; tiene_datos: boolean; cabeza?: string; html_length: number; html_snippet?: string }[] = []

      for (const code of candidatos) {
        const body = new URLSearchParams({ codigo: CODIGO, juridiccion: code, sorteo })
        const res  = await fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mozilla/5.0", Referer: MAIN_PAGE },
          body: body.toString(),
        })
        const html = await res.text()
        const $    = cheerio.load(html)
        const numerosConPos: { pos: number; numero: string }[] = []
        $(".infoJuego").first().find("td").each((_, td) => {
          let pos = -1; let numero = ""
          $(td).find("div").each((_, div) => {
            const txt = $(div).text().trim()
            if ($(div).hasClass("pos")) pos = parseInt(txt, 10)
            else if (/^\d{4}$/.test(txt)) numero = txt
          })
          if (pos > 0 && numero) numerosConPos.push({ pos, numero })
        })
        numerosConPos.sort((a, b) => a.pos - b.pos)
        const entry: typeof resultados[0] = {
          code,
          tiene_datos: numerosConPos.length > 0,
          cabeza: numerosConPos[0]?.numero,
          html_length: html.length,
        }
        // Si tiene tamaño distinto al vacío (1182), mostrar snippet
        if (html.length !== 1182) entry.html_snippet = html.substring(0, 500)
        resultados.push(entry)
        await new Promise((r) => setTimeout(r, 150))
      }

      return NextResponse.json({ sorteo, resultados: resultados.filter(r => r.html_length !== 1182 || r.tiene_datos) })
    }

    // ── Extraer función resultadosRios y código 59 ─────────────────────────────
    if (action === "main-html") {
      const res  = await fetch(MAIN_PAGE, { headers: { "User-Agent": "Mozilla/5.0" } })
      const html = await res.text()

      // Extraer bloque de la función resultadosRios completa
      const fnMatch = html.match(/function resultadosRios[\s\S]{0,2000}?(?=\nfunction|\n<\/script>)/)
      const fnCompleta = fnMatch ? fnMatch[0] : null

      // Buscar URLs en esa función
      const urlsEnFn = fnCompleta?.match(/['"]([^'"]*\.php[^'"]*)['"]/g) ?? []

      // Buscar qué es el código 59
      const lineas59 = html.split("\n").filter(l => l.includes("59") || l.includes("Corrientes") || l.includes("Entre"))

      return NextResponse.json({ fnCompleta, urlsEnFn, lineas59 })
    }

    // ── Debug HTML del Quini 6 — prueba múltiples fuentes ───────────────────
    if (action === "quini6-html") {
      const URLS = [
        "https://iplyc.gba.gob.ar/quini6",
        "https://www.loteriaentrerios.gov.ar/",
        "https://quiniela.loteriadelaciudad.gob.ar/quini6",
        "https://quinielaonline.com.ar/resultados-quini6",
        "https://www.laquiniela.online/quini-6",
        "https://resultados-de-quiniela.com.ar/quini-6",
      ]

      const resultados: { url: string; status: number; htmlLength: number; htmlSnippet: string }[] = []

      for (const url of URLS) {
        try {
          const res  = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            signal: AbortSignal.timeout(8000),
          })
          const html = await res.text()
          resultados.push({ url, status: res.status, htmlLength: html.length, htmlSnippet: html.substring(0, 1500) })
        } catch (e) {
          resultados.push({ url, status: 0, htmlLength: 0, htmlSnippet: String(e) })
        }
      }

      return NextResponse.json({ resultados })
    }

    // ── Debug HTML de Loto Plus — muestra selectores usados ─────────────────
    if (action === "loto-html") {
      const res  = await fetch("https://www.jugandoonline.com.ar/Loto.aspx", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; debug-bot/1.0)" },
        signal: AbortSignal.timeout(15000),
      })
      const html = await res.text()
      const $    = cheerio.load(html)

      // Todos los .loto-numeros con su posición DOM
      const lotoNumeros: { i: number; text: string; outerHtml: string }[] = []
      $(".loto-numeros").each((i, el) => {
        lotoNumeros.push({ i, text: $(el).text().trim(), outerHtml: ($.html(el) ?? "").slice(0, 200) })
      })

      // Todos los headings (h1-h4) con su texto y clase
      const headings: { tag: string; class: string; text: string }[] = []
      $("h1, h2, h3, h4").each((_, el) => {
        headings.push({ tag: el.tagName, class: $(el).attr("class") ?? "", text: $(el).text().trim().slice(0, 80) })
      })

      // Elementos que contienen "PLUS" en su texto (excluyendo scripts)
      const plusEls: { tag: string; class: string; text: string; outerHtml: string }[] = []
      $("*:not(script):not(style)").each((_, el) => {
        const own = $(el).clone().children().remove().end().text().trim()
        if (/plus/i.test(own) && own.length < 120) {
          plusEls.push({ tag: el.tagName, class: $(el).attr("class") ?? "", text: own, outerHtml: ($.html(el) ?? "").slice(0, 250) })
        }
      })

      // Elementos que contienen "Pozo" en su texto propio
      const pozoEls: { tag: string; class: string; text: string }[] = []
      $("*:not(script):not(style)").each((_, el) => {
        const own = $(el).clone().children().remove().end().text().trim()
        if (/pozo/i.test(own) && own.length < 200) {
          pozoEls.push({ tag: el.tagName, class: $(el).attr("class") ?? "", text: own })
        }
      })

      // ── Buscar elementos que contienen números grandes (montos de pozo) ──────
      const bigNumbers: { tag: string; id: string; class: string; text: string; outerHtml: string }[] = []
      $("*").each((_, el) => {
        const own = $(el).clone().children().remove().end().text().trim()
        // Buscar números con puntos como separador de miles, >= 9 dígitos (>=100M)
        if (/\d{1,3}(\.\d{3}){2,}/.test(own) && own.length < 100) {
          bigNumbers.push({
            tag:      el.tagName,
            id:       $(el).attr("id") ?? "",
            class:    $(el).attr("class") ?? "",
            text:     own,
            outerHtml: ($.html(el) ?? "").slice(0, 300),
          })
        }
      })

      // ── Buscar por ID que contenga "Pozo" o "pozo" ───────────────────────────
      const pozoById: { id: string; text: string }[] = []
      $("[id*='ozo'], [id*='oto'], [id*='undo'], [id*='monto'], [id*='premio']").each((_, el) => {
        const txt = $(el).text().trim()
        if (txt) pozoById.push({ id: $(el).attr("id") ?? "", text: txt.slice(0, 80) })
      })

      // Snippet del HTML completo (primeros 5000 chars)
      const htmlSnippet = html.slice(0, 5000)

      return NextResponse.json({ lotoNumeros, headings, plusEls: plusEls.slice(0, 20), pozoEls, bigNumbers: bigNumbers.slice(0, 20), pozoById: pozoById.slice(0, 20) })
    }

    // ── Debug: ver todos los números grandes en jugandoonline Quini 6 ─────────
    if (action === "pozo-debug") {
      const html = await fetch("https://www.jugandoonline.com.ar/Quini6/sorteos.asp", {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; bot/1.0)" },
        signal: AbortSignal.timeout(20000),
      }).then(r => r.text())
      const $ = cheerio.load(html)

      // Cada número grande con su contexto: texto del padre y del abuelo
      const bigEls: { tag: string; id: string; class: string; text: string; parentText: string; grandparentHtml: string }[] = []
      $("*").each((_, el) => {
        const own = $(el).clone().children().remove().end().text().trim()
        if (/\d{1,3}(?:\.\d{3}){2,}/.test(own) && own.length < 120) {
          const parent   = $(el).parent()
          const grandpa  = parent.parent()
          bigEls.push({
            tag:            el.tagName,
            id:             $(el).attr("id") ?? "",
            class:          $(el).attr("class") ?? "",
            text:           own,
            parentText:     parent.text().trim().slice(0, 200),
            grandparentHtml: ($.html(grandpa) ?? "").slice(0, 400),
          })
        }
      })

      return NextResponse.json({ bigEls: bigEls.slice(0, 20) })
    }

    return NextResponse.json({ error: "action inválida. Usá ?action=sorteos, numeros, o buscar-entrerios" }, { status: 400 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
