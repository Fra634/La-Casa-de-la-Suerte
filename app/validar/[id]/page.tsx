import { notFound } from "next/navigation"
import { XCircle } from "lucide-react"
import Link from "next/link"
import { validarJugada } from "@/lib/validar"
import { ValidarClient } from "./validar-client"

export const dynamic = "force-dynamic"

export default async function ValidarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await validarJugada(id)

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <nav className="px-4 h-14 flex items-center border-b border-border">
          <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            ← Inicio
          </Link>
        </nav>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold">Jugada no encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              El link puede ser incorrecto o la jugada fue eliminada.
            </p>
          </div>
          <Link href="/" className="mt-2 text-sm font-medium text-primary hover:opacity-80 transition-opacity">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return <ValidarClient data={data} />
}
