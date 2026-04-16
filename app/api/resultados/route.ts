import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import type { Turno, Loteria, TipoQuini6 } from "@/lib/types"

// ─── Autenticación simple por API key ─────────────────────────────────────────

function autenticar(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-admin-key")
  return apiKey === process.env.ADMIN_API_KEY
}

// ─── POST /api/resultados ─────────────────────────────────────────────────────
// Body para quiniela:
// {
//   game_type: "quiniela",
//   fecha: "2025-01-15",
//   turno: "nocturna",
//   loteria: "provincia",
//   cabeza: "1234",
//   premios_5: ["1234","5678","9012","3456","7890"],
//   premios_10: [...],
//   premios_20: [...]
// }
//
// Body para quini6:
// {
//   game_type: "quini6",
//   fecha: "2025-01-15",
//   tipo: "tradicional",
//   numeros: ["01","05","12","23","34","45"]
// }

export async function POST(request: NextRequest) {
  if (!autenticar(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const supabaseAdmin = createAdminClient()

  if (body.game_type === "quiniela") {
    const { fecha, turno, loteria, cabeza, premios_5, premios_10, premios_20 } =
      body as {
        fecha: string
        turno: Turno
        loteria: Loteria
        cabeza: string
        premios_5: string[]
        premios_10: string[]
        premios_20: string[]
      }

    if (!fecha || !turno || !loteria) {
      return NextResponse.json(
        { error: "Faltan fecha, turno o loteria" },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("resultados_quiniela")
      .upsert(
        { fecha, turno, loteria, cabeza, premios_5, premios_10, premios_20 },
        { onConflict: "fecha,turno,loteria" }
      )

    if (error) {
      console.error("Error guardando resultado quiniela:", error)
      return NextResponse.json({ error: "Error al guardar resultado" }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  }

  if (body.game_type === "quini6") {
    const { fecha, tipo, numeros } = body as {
      fecha: string
      tipo: TipoQuini6
      numeros: string[]
    }

    if (!fecha || !tipo || !numeros?.length) {
      return NextResponse.json(
        { error: "Faltan fecha, tipo o numeros" },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from("resultados_quini6")
      .upsert({ fecha, tipo, numeros }, { onConflict: "fecha,tipo" })

    if (error) {
      console.error("Error guardando resultado quini6:", error)
      return NextResponse.json({ error: "Error al guardar resultado" }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 201 })
  }

  return NextResponse.json({ error: "game_type inválido" }, { status: 400 })
}
