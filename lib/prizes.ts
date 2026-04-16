// Multiplicadores de quiniela según cantidad de cifras del número
const BASE: Record<number, number> = { 1: 7, 2: 70, 3: 600, 4: 3500 }

// Rango (posiciones cubiertas) según ubicación
const RANGO: Record<string, number> = {
  cabeza:    1,
  premios5:  5,
  premios10: 10,
  premios20: 20,
}

/**
 * Devuelve el multiplicador neto para una jugada simple.
 * Ej: número "55" (2 cifras) a "cabeza" → 70 / 1 = 70
 * Ej: número "55" (2 cifras) a "premios10" → 70 / 10 = 7
 */
export function getMultiplicador(numero: string, ubicacion: string): number {
  const cifras = Math.min(4, Math.max(1, numero.replace(/^0+/, "").length || 1))
  const base = BASE[cifras] ?? 7
  const divisor = RANGO[ubicacion] ?? 1
  return base / divisor
}

/**
 * Premio de una jugada simple.
 * premio = valor × multiplicador
 */
export function calcularPremioSimple(numero: string, ubicacion: string, valor: number): number {
  return valor * getMultiplicador(numero, ubicacion)
}

/**
 * Verifica si un número es elegible para redoblona.
 * La redoblona solo aplica a números de exactamente 2 cifras (00–99).
 */
export function esElegibleRedoblona(numero: string): boolean {
  return numero.replace(/\D/g, "").length === 2
}

/**
 * Premio de redoblona. Solo válido para números de 2 cifras.
 *
 * Fórmula oficial: inversión × (70/U1) × (70/U2) × ...
 * donde U1 ≤ U2 ≤ ... son los rangos ordenados de menor a mayor.
 *
 * Regla de reducción de posición: si U1 = 1 (cabeza), entonces U2 efectivo = U2 − 1,
 * porque la posición 1 ya está ocupada por la primera jugada.
 *
 * Ejemplo: $1000 en 55 a cabeza (U1=1) + $500 en 60 a los 10 (U2=10)
 *   inversión = $1500, U2 efectivo = 10 − 1 = 9
 *   premio = $1500 × (70/1) × (70/9) ≈ $816.667
 */
export function calcularPremioRedoblona(
  inversion: number,
  jugadas: { ubicacion: string }[]
): number {
  if (jugadas.length === 0) return 0

  // Ordenar rangos de menor a mayor (U1 ≤ U2 ≤ ...)
  const rangos = jugadas
    .map(j => RANGO[j.ubicacion] ?? 1)
    .sort((a, b) => a - b)

  return rangos.reduce((acc, r, i) => {
    // Reducción de posición: si el primer rango es cabeza (1),
    // el segundo rango (i=1) se reduce en 1
    const efectivo = (i === 1 && rangos[0] === 1 && r > 1) ? r - 1 : Math.max(1, r)
    return acc * (70 / efectivo)
  }, inversion)
}
