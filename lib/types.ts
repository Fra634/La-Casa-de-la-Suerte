// ─── Quiniela ────────────────────────────────────────────────────────────────

export type Turno =
  | "previa"
  | "primera"
  | "matutina"
  | "vespertina"
  | "nocturna"

export type Loteria =
  | "provincia"
  | "ciudad"
  | "cordoba"
  | "santafe"
  | "entrerios"
  | "montevideo"

export type Ubicacion = "cabeza" | "premios5" | "premios10" | "premios20"

export interface JugadaQuiniela {
  numero: string
  ubicacion: Ubicacion
  valor: number
}

// ─── Jugadas (BD) ────────────────────────────────────────────────────────────

export type GameType = "quiniela" | "quini6"

export type EstadoJugada = "pendiente" | "ganadora" | "no_ganadora"

export interface Jugada {
  id: string
  created_at: string
  game_type: GameType

  // Quiniela
  turno: Turno | null
  quinielas: Loteria[] | null
  jugadas_data: JugadaQuiniela[] | null

  // Quini 6
  numeros_quini6: string[] | null

  // Comunes
  monto_total: number
  fecha_sorteo: string // ISO date YYYY-MM-DD
  estado: EstadoJugada
  redoblona?: boolean
}

// ─── Resultados Quiniela (BD) ─────────────────────────────────────────────────

export interface ResultadoQuiniela {
  id: string
  created_at: string
  fecha: string        // ISO date YYYY-MM-DD
  turno: Turno
  loteria: Loteria
  cabeza: string | null        // número de 4 dígitos ganador
  premios_5: string[] | null   // primeros 5
  premios_10: string[] | null  // primeros 10
  premios_20: string[] | null  // primeros 20
}

// ─── Resultados Quini 6 (BD) ──────────────────────────────────────────────────

export type TipoQuini6 =
  | "tradicional"
  | "segunda"
  | "revancha"
  | "siempre_sale"

export interface ResultadoQuini6 {
  id: string
  created_at: string
  fecha: string       // ISO date YYYY-MM-DD
  tipo: TipoQuini6
  numeros: string[]   // 6 números ganadores
}

// ─── Resultados Loto Plus (BD) ────────────────────────────────────────────────

export interface ResultadoLotoPlus {
  id: string
  created_at: string
  fecha: string                      // ISO date YYYY-MM-DD
  numeros: string[]                  // TRADICIONAL (6 números)
  numeros_match: string[] | null     // MATCH (6 números)
  numeros_desquite: string[] | null  // DESQUITE (6 números)
  numeros_sale: string[] | null      // SALE O SALE (6 números)
  numero_plus: string | null         // Número Plus
  pozo_proximo: number | null        // Próximo pozo estimado (en pesos)
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CrearJugadaQuinielaPayload {
  game_type: "quiniela"
  turno: Turno
  quinielas: Loteria[]
  jugadas_data: JugadaQuiniela[]
  monto_total: number
}

export interface CrearJugadaQuini6Payload {
  game_type: "quini6"
  numeros_quini6: string[]
  monto_total: number
}

export type CrearJugadaPayload =
  | CrearJugadaQuinielaPayload
  | CrearJugadaQuini6Payload

export interface CrearJugadaResponse {
  id: string
  link: string
}

// ─── Validación ───────────────────────────────────────────────────────────────

export type EstadoValidacion =
  | "pendiente"   // sorteo aún no ocurrió o resultados no ingresados
  | "ganadora"
  | "no_ganadora"

export interface DetalleGanancia {
  loteria: Loteria
  numero: string
  ubicacion: Ubicacion
  categoria: "cabeza" | "premios_5" | "premios_10" | "premios_20"
  monto_ganado?: number
}

export interface PozoAcumulado {
  id: number
  updated_at: string
  tradicional: number
  segunda: number
  revancha: number
  siempre_sale: number
}

export type PendienteRazon = "antes_del_sorteo" | "cargando" | "demorado"

export interface ValidacionResponse {
  estado: EstadoValidacion
  jugada: Jugada
  ganancias: DetalleGanancia[]  // vacío si no_ganadora o pendiente
  pendiente_razon?: PendienteRazon
  monto_total_ganado?: number   // solo si ganadora
}
