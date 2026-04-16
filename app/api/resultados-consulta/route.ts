import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import type { Turno } from "@/lib/types"

// GET /api/resultados-consulta?fecha=YYYY-MM-DD&turno=nocturna    → quiniela
// GET /api/resultados-consulta?fecha=YYYY-MM-DD&tipo=quini6       → quini 6
// GET /api/resultados-consulta?fecha=YYYY-MM-DD&tipo=lotoplus     → loto plus
export async function GET(request: NextRequest) {
  const fecha = request.nextUrl.searchParams.get("fecha")
  const tipo  = request.nextUrl.searchParams.get("tipo")
  const turno = request.nextUrl.searchParams.get("turno") as Turno | null

  const supabase = createAdminClient()

  if (tipo === "quini6") {
    // Si no viene fecha, buscar el último sorteo disponible
    let fechaQ6 = fecha
    if (!fechaQ6) {
      const { data: ultimo } = await supabase
        .from("resultados_quini6")
        .select("fecha")
        .order("fecha", { ascending: false })
        .limit(1)
        .maybeSingle()
      fechaQ6 = ultimo?.fecha ?? null
    }
    if (!fechaQ6) return NextResponse.json({ resultados: [], fecha: null })

    const { data, error } = await supabase
      .from("resultados_quini6")
      .select("tipo, numeros")
      .eq("fecha", fechaQ6)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ resultados: data ?? [], fecha: fechaQ6 })
  }

  if (tipo === "lotoplus") {
    // Si no viene fecha, buscar el último sorteo disponible
    let fechaLP = fecha
    if (!fechaLP) {
      const { data: ultimo } = await supabase
        .from("resultados_lotoplus")
        .select("fecha")
        .order("fecha", { ascending: false })
        .limit(1)
        .maybeSingle()
      fechaLP = ultimo?.fecha ?? null
    }
    if (!fechaLP) return NextResponse.json({ numeros: null, fecha: null })

    const { data, error } = await supabase
      .from("resultados_lotoplus")
      .select("numeros, numeros_match, numeros_desquite, numeros_sale, numero_plus, pozo_proximo")
      .eq("fecha", fechaLP)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      numeros:          data?.numeros          ?? null,
      numeros_match:    data?.numeros_match    ?? null,
      numeros_desquite: data?.numeros_desquite ?? null,
      numeros_sale:     data?.numeros_sale     ?? null,
      numero_plus:      data?.numero_plus      ?? null,
      pozo_proximo:     data?.pozo_proximo     ?? null,
      fecha: fechaLP,
    })
  }

  // Quiniela (default)
  if (!fecha) {
    return NextResponse.json({ error: "Falta parámetro: fecha" }, { status: 400 })
  }
  if (!turno) {
    return NextResponse.json({ error: "Falta parámetro: turno" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("resultados_quiniela")
    .select("loteria, cabeza, premios_20")
    .eq("fecha", fecha)
    .eq("turno", turno)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ resultados: data ?? [] })
}
