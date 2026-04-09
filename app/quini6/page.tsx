"use client"

// Quini 6 Page - Updated
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, MessageCircle, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

const NUMBERS = Array.from({ length: 46 }, (_, i) => i.toString().padStart(2, "0"))
const MAX_SELECTION = 6
const PRICE_PER_PLAY = 3000

export default function Quini6Page() {
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([])
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  const toggleNumber = (num: string) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num))
    } else if (selectedNumbers.length < MAX_SELECTION) {
      setSelectedNumbers([...selectedNumbers, num])
    }
  }

  const clearSelection = () => {
    setSelectedNumbers([])
  }

  const total = selectedNumbers.length === MAX_SELECTION ? PRICE_PER_PLAY : 0

  const openPaymentModal = () => {
    if (selectedNumbers.length !== MAX_SELECTION) return
    setShowPaymentModal(true)
  }

  const enviarWhatsApp = () => {
    setShowPaymentModal(false)
    if (selectedNumbers.length !== MAX_SELECTION) return
    
    let mensaje = `*QUINI 6 - Sorteo Completo*\n`
    mensaje += `Tradicional, Segunda, Revancha, Siempre Sale\n\n`
    mensaje += `*Números elegidos:*\n`
    mensaje += selectedNumbers.join(" - ")
    mensaje += `\n\n*Total: $${PRICE_PER_PLAY}*`

    const encoded = encodeURIComponent(mensaje)
    window.open(`https://wa.me/5491171121355?text=${encoded}`, "_blank")
  }

  return (
    <main className="min-h-screen bg-background pb-36">
      {/* Header */}
      <header className="bg-primary py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver</span>
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm font-medium tracking-wider text-primary-foreground/80 uppercase">
                  Agencia de Lotería
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground tracking-tight">
                &quot;La Casa de la Suerte&quot;
              </h1>
              <p className="text-xs text-primary-foreground/70 mt-2">
                Agencia Oficial de la Provincia de Buenos Aires - Legajo Nº 705883
              </p>
            </div>
            <div className="flex-shrink-0 w-20 h-20 relative ml-4">
              <Image
                src="/images/agency-logo.png"
                alt="Logo La Casa de la Suerte"
                fill
                className="object-contain"
                priority
                loading="eager"
              />
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-4 py-8">
        {/* Game Title */}
        <div className="text-center mb-6">
          <div className="relative w-48 h-20 mx-auto mb-4">
            <Image
              src="/images/quini6-logo.png"
              alt="Quini 6 - A 6 pasos de cumplir tus sueños"
              fill
              className="object-contain"
              priority
              loading="eager"
            />
          </div>
        </div>

        {/* Sorteo Info */}
        <Card className="mb-6 bg-muted/50">
          <CardContent className="pt-3 pb-3">
            <p className="text-center text-sm text-muted-foreground">
              Estás participando del Sorteo Completo:
            </p>
            <p className="text-center text-sm font-medium text-foreground">
              Tradicional, Segunda, Revancha y Siempre Sale
            </p>
          </CardContent>
        </Card>

        {/* Number Selection */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Elegí 6 números{" "}
                <span className={cn(
                  "text-muted-foreground",
                  selectedNumbers.length === MAX_SELECTION && "text-primary font-bold"
                )}>
                  {selectedNumbers.length}/{MAX_SELECTION}
                </span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                disabled={selectedNumbers.length === 0}
                className="text-muted-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Borrar selección
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-2">
              {NUMBERS.map((num) => {
                const isSelected = selectedNumbers.includes(num)
                const isDisabled = !isSelected && selectedNumbers.length >= MAX_SELECTION

                return (
                  <button
                    key={num}
                    onClick={() => toggleNumber(num)}
                    disabled={isDisabled}
                    className={cn(
                      "aspect-square rounded-lg font-bold text-sm md:text-base transition-all",
                      "border-2 flex items-center justify-center",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                        : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted",
                      isDisabled && "opacity-50 cursor-not-allowed hover:border-border hover:bg-card"
                    )}
                  >
                    {num}
                  </button>
                )
              })}
            </div>

            {/* Selected Numbers Display */}
            {selectedNumbers.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Números seleccionados:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedNumbers.map((num, index) => (
                    <span
                      key={`${num}-${index}`}
                      className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-bold"
                    >
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </section>

      {/* Fixed Bottom Bar - Total & Submit */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-medium">Total</span>
            <span className="text-xl font-bold text-primary">
              ${selectedNumbers.length === MAX_SELECTION ? PRICE_PER_PLAY : 0}
            </span>
          </div>
          <Button
            size="lg"
            className="w-full bg-green-600 hover:bg-green-700 text-white h-12"
            onClick={openPaymentModal}
            disabled={selectedNumbers.length !== MAX_SELECTION}
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Enviar jugada por WhatsApp
          </Button>
          {selectedNumbers.length > 0 && selectedNumbers.length < MAX_SELECTION && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              Seleccioná {MAX_SELECTION - selectedNumbers.length} número
              {MAX_SELECTION - selectedNumbers.length > 1 ? "s" : ""} más
            </p>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-center text-lg">Recordatorio de pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Recordá que luego de enviar tu jugada por WhatsApp deberás transferir el valor total de tu jugada a nuestra cuenta:
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
                  <span className="font-medium">Total a transferir:</span> ${PRICE_PER_PLAY}
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
