import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

// GET /api/pozos — devuelve el pozo actual, o lo actualiza si viene ?secret=X&tradicional=N&lotoplus=N
export async function GET(request: NextRequest) {
  const secret      = request.nextUrl.searchParams.get("secret")
  const tradicional = request.nextUrl.searchParams.get("tradicional")
  const lotoplus    = request.nextUrl.searchParams.get("lotoplus")

  // Si vienen parámetros de actualización, validar y guardar
  if (tradicional !== null || lotoplus !== null) {
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (tradicional !== null) {
      const v = parseInt(tradicional, 10)
      if (isNaN(v) || v < 0) return NextResponse.json({ error: "tradicional inválido" }, { status: 400 })
      update.tradicional = v
    }
    if (lotoplus !== null) {
      const v = parseInt(lotoplus, 10)
      if (isNaN(v) || v < 0) return NextResponse.json({ error: "lotoplus inválido" }, { status: 400 })
      update.lotoplus = v
    }
    const supabase = createAdminClient()
    const { error } = await supabase.from("pozos_acumulados").upsert(
      { id: 1, ...update },
      { onConflict: "id" }
    )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, ...update })
  }

  // Sin parámetros — leer y devolver
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("pozos_acumulados")
    .select("*")
    .eq("id", 1)
    .single()

  if (!data) {
    return NextResponse.json({ tradicional: 0, lotoplus: 0 })
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

  const { tradicional, segunda, revancha, siempre_sale, lotoplus } = body as {
    tradicional?: number
    segunda?: number
    revancha?: number
    siempre_sale?: number
    lotoplus?: number
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (tradicional !== undefined) update.tradicional = tradicional
  if (segunda      !== undefined) update.segunda      = segunda
  if (revancha     !== undefined) update.revancha     = revancha
  if (siempre_sale !== undefined) update.siempre_sale = siempre_sale
  if (lotoplus     !== undefined) update.lotoplus     = lotoplus

  const supabase = createAdminClient()
  const { error } = await supabase.from("pozos_acumulados").upsert({
    id: 1,
    ...update,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
