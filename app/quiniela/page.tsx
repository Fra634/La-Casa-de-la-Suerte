"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ArrowLeft, Plus, Trash2, MessageCircle, AlertTriangle, ChevronDown } from "lucide-react"

type Turno = "previa" | "primera" | "matutina" | "vespertina" | "nocturna" | ""

interface Jugada {
  id: number
  numero: string
  ubicacion: string
  valor: string
  esBajada?: boolean // true si fue creada al bajar un número
}

interface Quiniela {
  id: string
  nombre: string
  soloMatutinaNocturna?: boolean
}

const TURNOS = [
  { value: "previa", label: "La Previa 10:05" },
  { value: "primera", label: "La Primera 11:50" },
  { value: "matutina", label: "Matutina 14:50" },
  { value: "vespertina", label: "Vespertina 17:50" },
  { value: "nocturna", label: "Nocturna 20:50" },
]

const QUINIELAS: Quiniela[] = [
  { id: "provincia", nombre: "Provincia de Buenos Aires" },
  { id: "ciudad", nombre: "Ciudad" },
  { id: "cordoba", nombre: "Córdoba" },
  { id: "santafe", nombre: "Santa Fe" },
  { id: "entrerios", nombre: "Entre Ríos" },
  { id: "montevideo", nombre: "Montevideo", soloMatutinaNocturna: true },
]

const UBICACIONES = [
  { value: "cabeza", label: "Cabeza" },
  { value: "premios5", label: "01 a 05" },
  { value: "premios10", label: "01 a 10" },
  { value: "premios20", label: "01 a 20" },
]

const VALOR_MINIMO = 50

export default function QuinielaPage() {
  const [turno, setTurno] = useState<Turno>("")
  const [quinielasSeleccionadas, setQuinielasSeleccionadas] = useState<string[]>([])
  const [jugadas, setJugadas] = useState<Jugada[]>([
    { id: 1, numero: "", ubicacion: "", valor: "" },
  ])
  const [showMinValueAlert, setShowMinValueAlert] = useState(false)
  const [showMaxJugadasAlert, setShowMaxJugadasAlert] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const montevideoDisponible = turno === "matutina" || turno === "nocturna"

  const toggleQuiniela = (quinielaId: string) => {
    setQuinielasSeleccionadas((prev) =>
      prev.includes(quinielaId)
        ? prev.filter((q) => q !== quinielaId)
        : [...prev, quinielaId]
    )
  }

  // Si cambia el turno y Montevideo estaba seleccionado pero ya no está disponible, quitarlo
  const handleTurnoChange = (newTurno: Turno) => {
    setTurno(newTurno)
    if (newTurno !== "matutina" && newTurno !== "nocturna") {
      setQuinielasSeleccionadas((prev) => prev.filter((q) => q !== "montevideo"))
    }
  }

  const addJugada = () => {
    if (jugadas.length >= 16) {
      setShowMaxJugadasAlert(true)
      return
    }
    setJugadas([
      ...jugadas,
      { id: Date.now(), numero: "", ubicacion: "", valor: "" },
    ])
  }

  const removeJugada = (id: number) => {
    if (jugadas.length === 1) return
    setJugadas(jugadas.filter((j) => j.id !== id))
  }

  const updateJugada = (id: number, field: keyof Jugada, value: string) => {
    setJugadas(
      jugadas.map((j) => (j.id === id ? { ...j, [field]: value } : j))
    )
  }

  const validateValorMinimo = (id: number, valor: string) => {
    const valorNum = Number(valor)
    if (valor && valorNum < VALOR_MINIMO) {
      setShowMinValueAlert(true)
      updateJugada(id, "valor", String(VALOR_MINIMO))
    }
  }

  // Función para verificar si se puede bajar número
  // No mostrar en jugadas que fueron creadas al bajar un número
  const canBajarNumero = (jugada: Jugada) => {
    if (jugada.esBajada) return false // No mostrar en jugadas bajadas
    const numero = jugada.numero
    const esCabeza = jugada.ubicacion === "cabeza"
    const tieneValor = jugada.valor && Number(jugada.valor) >= VALOR_MINIMO
    return esCabeza && tieneValor && (numero.length === 3 || numero.length === 4)
  }

  // Función para bajar número (crear jugadas adicionales con las últimas cifras)
  const bajarNumero = (jugada: Jugada) => {
    if (!canBajarNumero(jugada)) return
    
    const numero = jugada.numero
    const valor = jugada.valor
    const nuevasJugadas: Jugada[] = []
    
    if (numero.length === 4) {
      // Si es de 4 cifras, crear jugada con últimas 3 cifras y últimas 2 cifras
      const ultimas3 = numero.slice(-3) // últimas 3 cifras (leyendo de derecha a izquierda)
      const ultimas2 = numero.slice(-2) // últimas 2 cifras
      
      nuevasJugadas.push({
        id: Date.now(),
        numero: ultimas3,
        ubicacion: "cabeza",
        valor: valor,
        esBajada: true, // Marcar como bajada para no mostrar botón
      })
      nuevasJugadas.push({
        id: Date.now() + 1,
        numero: ultimas2,
        ubicacion: "cabeza",
        valor: valor,
        esBajada: true,
      })
    } else if (numero.length === 3) {
      // Si es de 3 cifras, crear jugada con últimas 2 cifras
      const ultimas2 = numero.slice(-2)
      
      nuevasJugadas.push({
        id: Date.now(),
        numero: ultimas2,
        ubicacion: "cabeza",
        valor: valor,
        esBajada: true,
      })
    }
    
    // Verificar que no excedamos el límite de 16 jugadas
    if (jugadas.length + nuevasJugadas.length > 16) {
      setShowMaxJugadasAlert(true)
      return
    }
    
    setJugadas([...jugadas, ...nuevasJugadas])
  }

  const sumaJugadas = jugadas.reduce((sum, j) => sum + (Number(j.valor) || 0), 0)
  const cantidadQuinielas = quinielasSeleccionadas.length
  const total = sumaJugadas * (cantidadQuinielas || 1)

  const jugadasValidas = jugadas.filter(
    (j) => j.numero && j.ubicacion && j.valor && Number(j.valor) >= VALOR_MINIMO
  )

  const puedeEnviar = jugadasValidas.length > 0 && turno && quinielasSeleccionadas.length > 0

  const openPaymentModal = () => {
    if (!puedeEnviar) return
    setShowPaymentModal(true)
  }

  const enviarWhatsApp = () => {
    setShowPaymentModal(false)
    
    const turnoTexto = TURNOS.find((t) => t.value === turno)?.label || turno

    const quinielasTexto = quinielasSeleccionadas
      .map((qId) => QUINIELAS.find((q) => q.id === qId)?.nombre)
      .filter(Boolean)
      .join(", ")

    let mensaje = `*QUINIELA - ${turnoTexto}*\n`
    mensaje += `*Quinielas:* ${quinielasTexto}\n\n`
    mensaje += `*Jugadas:*\n`
    jugadasValidas.forEach((j, i) => {
      const ubicacionTexto = UBICACIONES.find((u) => u.value === j.ubicacion)?.label || j.ubicacion
      mensaje += `${i + 1}. Número: ${j.numero} | ${ubicacionTexto} | $${j.valor}\n`
    })
    mensaje += `\n*Total: $${total}*`

    const encoded = encodeURIComponent(mensaje)
    window.open(`https://wa.me/5491171121355?text=${encoded}`, "_blank")
  }

  return (
    <main className="min-h-screen bg-background pb-36">
      {/* Header */}
      <header className="bg-primary py-6 px-4">
        <div className="max-w-lg mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-3 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-xs font-medium tracking-wider text-primary-foreground/80 uppercase">
                  Agencia de Lotería
                </span>
              </div>
              <h1 className="text-2xl font-bold text-primary-foreground tracking-tight">
                &quot;La Casa de la Suerte&quot;
              </h1>
              <p className="text-[10px] text-primary-foreground/70 mt-1">
                Agencia Oficial de la Provincia de Buenos Aires - Legajo Nº 705883
              </p>
            </div>
            <div className="flex-shrink-0 w-16 h-16 relative ml-3">
              <Image
                src="/images/agency-logo.png"
                alt="Logo La Casa de la Suerte"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-lg mx-auto px-4 py-6">
        {/* Game Title */}
        <div className="text-center mb-5">
          <div className="relative w-40 h-14 mx-auto">
            <Image
              src="/images/quiniela-logo.png"
              alt="Quiniela"
              fill
              className="object-contain"
              priority
              loading="eager"
            />
          </div>
        </div>

        {/* Turno Selection */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <Label className="text-sm font-medium mb-3 block">Seleccionar</Label>
            <div className="grid grid-cols-2 gap-2">
              {TURNOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleTurnoChange(t.value as Turno)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    turno === t.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Lotería Montevideo disponible en Matutina y Nocturna
            </p>
          </CardContent>
        </Card>

        {/* Quinielas Selection */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <Label className="text-sm font-medium mb-3 block">Seleccionar Quinielas:</Label>
            <div className="space-y-1">
              {QUINIELAS.map((quiniela, index) => {
                const isMontevideoDisabled = quiniela.soloMatutinaNocturna && !montevideoDisponible
                const isSelected = quinielasSeleccionadas.includes(quiniela.id)
                return (
                  <button
                    key={quiniela.id}
                    type="button"
                    onClick={() => !isMontevideoDisabled && toggleQuiniela(quiniela.id)}
                    disabled={isMontevideoDisabled}
                    className={`w-full text-left p-3 rounded-lg text-sm transition-all ${
                      isMontevideoDisabled
                        ? "text-muted-foreground bg-muted/30 cursor-not-allowed"
                        : isSelected
                        ? "bg-primary text-primary-foreground font-medium"
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                  >
                    {index + 1}. {quiniela.nombre}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Jugadas */}
        <Card className="mb-4">
          <CardContent className="pt-4 pb-4">
            <div className="mb-2">
              <Label className="text-sm font-medium">Jugadas ({jugadas.length}/16)</Label>
            </div>
            
            {/* Header de tabla */}
            <div className="grid grid-cols-12 gap-1 text-xs text-muted-foreground mb-1 px-1">
              <div className="col-span-3">Núm.</div>
              <div className="col-span-4">Ubic.</div>
              <div className="col-span-4 text-right">Valor $</div>
              <div className="col-span-1"></div>
            </div>
            
            {/* Lista de jugadas compacta */}
            <div className="space-y-1">
              {jugadas.map((jugada) => (
                <div
                  key={jugada.id}
                  className="bg-muted/30 rounded p-1"
                >
                  <div className="grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-3">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={4}
                        placeholder="0000"
                        value={jugada.numero}
                        onChange={(e) =>
                          updateJugada(jugada.id, "numero", e.target.value.replace(/\D/g, ""))
                        }
                        className="h-10 text-center font-mono px-1"
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                    <div className="col-span-4">
                      <Select
                        value={jugada.ubicacion}
                        onValueChange={(v) => updateJugada(jugada.id, "ubicacion", v)}
                      >
                        <SelectTrigger className="h-10 px-2" style={{ fontSize: "16px" }}>
                          <SelectValue placeholder="Ubic." />
                        </SelectTrigger>
                        <SelectContent>
                          {UBICACIONES.map((ub) => (
                            <SelectItem key={ub.value} value={ub.value}>
                              {ub.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="50"
                        value={jugada.valor}
                        onChange={(e) =>
                          updateJugada(jugada.id, "valor", e.target.value.replace(/\D/g, ""))
                        }
                        onBlur={(e) => validateValorMinimo(jugada.id, e.target.value)}
                        className="h-10 text-right px-2"
                        style={{ fontSize: "16px" }}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeJugada(jugada.id)}
                        disabled={jugadas.length === 1}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Botón Bajar número - aparece debajo si aplica */}
                  {canBajarNumero(jugada) && (
                    <div className="mt-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => bajarNumero(jugada)}
                        className="w-full h-8 text-xs"
                      >
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Bajar número
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Botón agregar posición centrado abajo */}
            {jugadas.length < 16 ? (
              <div className="flex justify-center mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addJugada}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar posición
                </Button>
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground mt-3">
                Número máximo de jugadas alcanzado
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Fixed Bottom Bar - Total & Submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-medium">Total</span>
            <span className="text-xl font-bold text-primary">${total}</span>
          </div>
          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
            onClick={openPaymentModal}
            disabled={!puedeEnviar}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Enviar jugada por WhatsApp
          </Button>
        </div>
      </div>

      {/* Popup valor mínimo */}
      <Dialog open={showMinValueAlert} onOpenChange={setShowMinValueAlert}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Valor mínimo
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            El valor mínimo de cada jugada es de ${VALOR_MINIMO} pesos.
          </p>
          <DialogFooter>
            <Button onClick={() => setShowMinValueAlert(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup máximo de jugadas */}
      <Dialog open={showMaxJugadasAlert} onOpenChange={setShowMaxJugadasAlert}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Límite alcanzado
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Número máximo de jugadas alcanzado (16 jugadas).
          </p>
          <DialogFooter>
            <Button onClick={() => setShowMaxJugadasAlert(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Popup de pago antes de enviar */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-center">Recordatorio de pago</h3>
              <p className="text-center text-muted-foreground text-sm">
                Recordá que luego de enviar tu jugada por WhatsApp deberás transferir el valor total de tu jugada a nuestra cuenta y compartirnos el comprobante.
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Alias:</span> GEN.CUENCA.PISO
                </p>
                <p className="text-sm">
                  <span className="font-medium">Titular:</span> Javier Antonio Libertini
                </p>
                <p className="text-sm">
                  <span className="font-medium">Banco:</span> Provincia de Buenos Aires
                </p>
                <p className="text-sm font-bold text-primary">
                  <span className="font-medium">Total a transferir:</span> ${total}
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  size="lg"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={enviarWhatsApp}
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Enviar jugada por WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPaymentModal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  )
}
