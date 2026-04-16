import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ResultadosView } from "@/components/resultados-view"

export default function ResultadosPage() {
  return (
    <main className="min-h-screen bg-background pb-8">
      <nav className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Inicio</span>
          </Link>
          <p className="font-semibold text-base">Resultados</p>
        </div>
      </nav>
      <div className="max-w-lg mx-auto">
        <ResultadosView />
      </div>
    </main>
  )
}
