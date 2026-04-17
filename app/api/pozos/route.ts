import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

// GET /api/pozos — devuelve el pozo actual, o lo actualiza si viene ?secret=X&tradicional=N
export async function GET(request: NextRequest) {
  const secret      = request.nextUrl.searchParams.get("secret")
  const tradicional = request.nextUrl.searchParams.get("tradicional")

  // Si vienen parámetros de actualización, validar y guardar
  if (tradicional !== null) {
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const valor = parseInt(tradicional, 10)
    if (isNaN(valor) || valor < 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
    }
    const supabase = createAdminClient()
    const { error } = await supabase.from("pozos_acumulados").upsert(
      { id: 1, tradicional: valor, updated_at: new Date().toISOString() },
      { onConflict: "id" }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({
      ok: true,
      tradicional: valor,
      display: `$${Math.round(valor / 1_000_000).toLocaleString("es-AR")} millones`,
    })
  }

  // Sin parámetros — leer y devolver
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("pozos_acumulados")
    .select("*")
    .eq("id", 1)
    .single()

  if (!data) {
    return NextResponse.json({ tradicional: 0, segunda: 0, revancha: 0, siempre_sale: 0 })
  }
  return NextResponse.json(data)
}

// POST /api/pozos — protegido por ADMIN_API_KEY, actualiza el pozo
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-admin-key")
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { tradicional, segunda, revancha, siempre_sale } = body as {
    tradicional: number
    segunda: number
    revancha: number
    siempre_sale: number
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from("pozos_acumulados").upsert({
    id: 1,
    tradicional: tradicional ?? 0,
    segunda: segunda ?? 0,
    revancha: revancha ?? 0,
    siempre_sale: siempre_sale ?? 0,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
