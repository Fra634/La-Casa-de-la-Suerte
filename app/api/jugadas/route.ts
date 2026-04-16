import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type {
  CrearJugadaPayload,
  CrearJugadaResponse,
} from "@/lib/types"

function calcularFechaSorteo(): string {
  // Siempre fecha de hoy en Argentina (UTC-3), formateada como YYYY-MM-DD
  const ar = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  })
  return ar
}

export async function POST(request: NextRequest) {
  let body: CrearJugadaPayload

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 })
  }

  const { game_type } = body

  if (game_type === "quiniela") {
    const { turno, quinielas, jugadas_data, monto_total } = body
    const redoblona = (body as any).redoblona === true
    if (!turno || !quinielas?.length || !jugadas_data?.length || !monto_total) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const fecha_sorteo = calcularFechaSorteo()

    const { data, error } = await supabase
      .from("jugadas")
      .insert({
        game_type: "quiniela",
        turno,
        quinielas,
        jugadas_data,
        numeros_quini6: null,
        monto_total,
        fecha_sorteo,
        estado: "pendiente",
        redoblona,
      })
      .select("id")
      .single()

    if (error || !data) {
      console.error("Error guardando jugada quiniela:", error)
      return NextResponse.json({ error: "Error al guardar jugada" }, { status: 500 })
    }

    const baseUrl = request.nextUrl.origin
    const response: CrearJugadaResponse = {
      id: data.id,
      link: `${baseUrl}/validar/${data.id}`,
    }
    return NextResponse.json(response, { status: 201 })
  }

  if (game_type === "quini6") {
    const { numeros_quini6, monto_total } = body
    if (!numeros_quini6?.length || !monto_total) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 })
    }

    const fecha_sorteo = calcularFechaSorteo()

    const { data, error } = await supabase
      .from("jugadas")
      .insert({
        game_type: "quini6",
        turno: null,
        quinielas: null,
        jugadas_data: null,
        numeros_quini6,
        monto_total,
        fecha_sorteo,
        estado: "pendiente",
      })
      .select("id")
      .single()

    if (error || !data) {
      console.error("Error guardando jugada quini6:", error)
      return NextResponse.json({ error: "Error al guardar jugada" }, { status: 500 })
    }

    const baseUrl = request.nextUrl.origin
    const response: CrearJugadaResponse = {
      id: data.id,
      link: `${baseUrl}/validar/${data.id}`,
    }
    return NextResponse.json(response, { status: 201 })
  }

  return NextResponse.json({ error: "game_type inválido" }, { status: 400 })
}
