import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type {
  ValidacionResponse,
  DetalleGanancia,
  JugadaQuiniela,
  Loteria,
  ResultadoQuiniela,
  PendienteRazon,
} from "@/lib/types"

// Hora del sorteo en Argentina (UTC-3)
const SORTEO_HORAS: Record<string, { h: number; m: number }> = {
  previa:     { h: 10, m:  5 },
  primera:    { h: 11, m: 50 },
  matutina:   { h: 14, m: 50 },
  vespertina: { h: 17, m: 50 },
  nocturna:   { h: 20, m: 50 },
}

function calcularPendienteRazon(fechaSorteo: string, turno: string): PendienteRazon {
  const hora = SORTEO_HORAS[turno]
  if (!hora) return "demorado"

  // Convertir hora ART a UTC (+3h) para comparar con Date.now()
  const [y, m, d] = fechaSorteo.split("-").map(Number)
  const sorteoUTC = new Date(Date.UTC(y, m - 1, d, hora.h + 3, hora.m))
  const diffMin = (Date.now() - sorteoUTC.getTime()) / 60_000

  if (diffMin < 0)  return "antes_del_sorteo"
  if (diffMin < 90) return "cargando"
  return "demorado"
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 1. Buscar la jugada
  const { data: jugada, error: jugadaError } = await supabase
    .from("jugadas")
    .select("*")
    .eq("id", id)
    .single()

  if (jugadaError || !jugada) {
    return NextResponse.json({ error: "Jugada no encontrada" }, { status: 404 })
  }

  // 2. Si ya es no_ganadora, devolver directamente (no hay ganancias que calcular)
  if (jugada.estado === "no_ganadora") {
    return NextResponse.json({
      estado: "no_ganadora",
      jugada,
      ganancias: [],
    } satisfies ValidacionResponse)
  }
  // Si es ganadora, caemos al código de cálculo igual para reconstruir las ganancias

  // 3. Quini 6
  if (jugada.game_type === "quini6") {
    const { data: resultados } = await supabase
      .from("resultados_quini6")
      .select("*")
      .eq("fecha", jugada.fecha_sorteo)

    if (!resultados || resultados.length === 0) {
      return NextResponse.json({
        estado: "pendiente",
        jugada,
        ganancias: [],
      } satisfies ValidacionResponse)
    }

    const numerosJugados = jugada.numeros_quini6 ?? []
    let esGanadora = false

    for (const resultado of resultados) {
      const coincidencias = numerosJugados.filter((n) =>
        resultado.numeros.includes(n)
      ).length
      if (coincidencias >= 3) {
        esGanadora = true
        break
      }
    }

    const nuevoEstado = esGanadora ? "ganadora" : "no_ganadora"
    if (jugada.estado === "pendiente") {
      await supabase.from("jugadas").update({ estado: nuevoEstado }).eq("id", id)
    }

    return NextResponse.json({
      estado: nuevoEstado,
      jugada: { ...jugada, estado: nuevoEstado },
      ganancias: [],
    } satisfies ValidacionResponse)
  }

  // 4. Quiniela
  if (jugada.game_type === "quiniela") {
    const loterías = jugada.quinielas ?? []
    const jugadasData: JugadaQuiniela[] = jugada.jugadas_data ?? []

    if (!loterías.length || !jugadasData.length) {
      return NextResponse.json({
        estado: "pendiente",
        jugada,
        ganancias: [],
      } satisfies ValidacionResponse)
    }

    // Traer todos los resultados para esa fecha+turno y las loterías jugadas
    const { data: resultados } = await supabase
      .from("resultados_quiniela")
      .select("*")
      .eq("fecha", jugada.fecha_sorteo)
      .eq("turno", jugada.turno!)
      .in("loteria", loterías)

    if (!resultados || resultados.length === 0) {
      return NextResponse.json({
        estado: "pendiente",
        jugada,
        ganancias: [],
        pendiente_razon: calcularPendienteRazon(jugada.fecha_sorteo, jugada.turno!),
      } satisfies ValidacionResponse)
    }

    const ganancias: DetalleGanancia[] = []

    for (const resultado of resultados as ResultadoQuiniela[]) {
      for (const jugadaItem of jugadasData) {
        const { numero, ubicacion } = jugadaItem

        if (ubicacion === "cabeza" && resultado.cabeza === numero) {
          ganancias.push({
            loteria: resultado.loteria as Loteria,
            numero,
            ubicacion,
            categoria: "cabeza",
          })
        } else if (
          ubicacion === "premios5" &&
          resultado.premios_5?.includes(numero)
        ) {
          ganancias.push({
            loteria: resultado.loteria as Loteria,
            numero,
            ubicacion,
            categoria: "premios_5",
          })
        } else if (
          ubicacion === "premios10" &&
          resultado.premios_10?.includes(numero)
        ) {
          ganancias.push({
            loteria: resultado.loteria as Loteria,
            numero,
            ubicacion,
            categoria: "premios_10",
          })
        } else if (
          ubicacion === "premios20" &&
          resultado.premios_20?.includes(numero)
        ) {
          ganancias.push({
            loteria: resultado.loteria as Loteria,
            numero,
            ubicacion,
            categoria: "premios_20",
          })
        }
      }
    }

    const nuevoEstado = ganancias.length > 0 ? "ganadora" : "no_ganadora"
    if (jugada.estado === "pendiente") {
      await supabase.from("jugadas").update({ estado: nuevoEstado }).eq("id", id)
    }

    return NextResponse.json({
      estado: nuevoEstado,
      jugada: { ...jugada, estado: nuevoEstado },
      ganancias,
    } satisfies ValidacionResponse)
  }

  return NextResponse.json({ error: "game_type inválido" }, { status: 400 })
}
