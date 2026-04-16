import { supabase } from "@/lib/supabase"
import type {
  ValidacionResponse,
  DetalleGanancia,
  JugadaQuiniela,
  Loteria,
  ResultadoQuiniela,
  PendienteRazon,
} from "@/lib/types"
import { getMultiplicador, calcularPremioRedoblona } from "@/lib/prizes"

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
  const [y, m, d] = fechaSorteo.split("-").map(Number)
  const sorteoUTC = new Date(Date.UTC(y, m - 1, d, hora.h + 3, hora.m))
  const diffMin = (Date.now() - sorteoUTC.getTime()) / 60_000
  if (diffMin < 0)  return "antes_del_sorteo"
  if (diffMin < 90) return "cargando"
  return "demorado"
}

export async function validarJugada(id: string): Promise<ValidacionResponse | null> {
  const { data: jugada, error } = await supabase
    .from("jugadas")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !jugada) return null

  if (jugada.estado === "no_ganadora") {
    return { estado: "no_ganadora", jugada, ganancias: [] }
  }

  if (jugada.game_type === "quini6") {
    const { data: resultados } = await supabase
      .from("resultados_quini6")
      .select("*")
      .eq("fecha", jugada.fecha_sorteo)

    if (!resultados || resultados.length === 0) {
      return { estado: "pendiente", jugada, ganancias: [] }
    }

    const numerosJugados = jugada.numeros_quini6 ?? []
    let esGanadora = false
    for (const resultado of resultados) {
      const coincidencias = numerosJugados.filter((n) => resultado.numeros.includes(n)).length
      if (coincidencias >= 3) { esGanadora = true; break }
    }

    const nuevoEstado = esGanadora ? "ganadora" : "no_ganadora"
    if (jugada.estado === "pendiente") {
      await supabase.from("jugadas").update({ estado: nuevoEstado }).eq("id", id)
    }
    return { estado: nuevoEstado, jugada: { ...jugada, estado: nuevoEstado }, ganancias: [] }
  }

  if (jugada.game_type === "quiniela") {
    const loterías = jugada.quinielas ?? []
    const jugadasData: JugadaQuiniela[] = jugada.jugadas_data ?? []

    if (!loterías.length || !jugadasData.length) {
      return { estado: "pendiente", jugada, ganancias: [] }
    }

    const { data: resultados } = await supabase
      .from("resultados_quiniela")
      .select("*")
      .eq("fecha", jugada.fecha_sorteo)
      .eq("turno", jugada.turno!)
      .in("loteria", loterías)

    if (!resultados || resultados.length === 0) {
      return {
        estado: "pendiente",
        jugada,
        ganancias: [],
        pendiente_razon: calcularPendienteRazon(jugada.fecha_sorteo, jugada.turno!),
      }
    }

    const ganancias: DetalleGanancia[] = []
    for (const resultado of resultados as ResultadoQuiniela[]) {
      for (const jugadaItem of jugadasData) {
        const { numero, ubicacion, valor } = jugadaItem
        let categoria: DetalleGanancia["categoria"] | null = null
        if (ubicacion === "cabeza" && resultado.cabeza === numero) {
          categoria = "cabeza"
        } else if (ubicacion === "premios5" && resultado.premios_5?.includes(numero)) {
          categoria = "premios_5"
        } else if (ubicacion === "premios10" && resultado.premios_10?.includes(numero)) {
          categoria = "premios_10"
        } else if (ubicacion === "premios20" && resultado.premios_20?.includes(numero)) {
          categoria = "premios_20"
        }
        if (categoria) {
          const monto_ganado = jugada.redoblona ? undefined : Math.round(valor * getMultiplicador(numero, ubicacion))
          ganancias.push({ loteria: resultado.loteria as Loteria, numero, ubicacion, categoria, monto_ganado })
        }
      }
    }

    // Redoblona: ganadora solo si CADA jugada tiene al menos un acierto
    let nuevoEstado: "ganadora" | "no_ganadora"
    let monto_total_ganado: number | undefined
    if (jugada.redoblona) {
      const todasGanaron = jugadasData.every(j =>
        ganancias.some(g => g.numero === j.numero)
      )
      nuevoEstado = todasGanaron ? "ganadora" : "no_ganadora"
      if (todasGanaron) {
        monto_total_ganado = Math.round(calcularPremioRedoblona(jugada.monto_total, jugadasData))
      }
    } else {
      nuevoEstado = ganancias.length > 0 ? "ganadora" : "no_ganadora"
      monto_total_ganado = ganancias.reduce((s, g) => s + (g.monto_ganado ?? 0), 0) || undefined
    }

    if (jugada.estado === "pendiente") {
      await supabase.from("jugadas").update({ estado: nuevoEstado }).eq("id", id)
    }
    return { estado: nuevoEstado, jugada: { ...jugada, estado: nuevoEstado }, ganancias, monto_total_ganado }
  }

  return null
}
