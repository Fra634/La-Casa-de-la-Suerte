import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"


export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary py-8 px-4">
        <div className="max-w-2xl mx-auto">
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
              />
            </div>
          </div>
        </div>
      </header>

      {/* Games Section */}
      <section className="max-w-2xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
          Juegos
        </h2>

        <div className="grid gap-6">
          {/* Quiniela Card */}
          <Card className="overflow-hidden border-2 border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-6">
                <div className="flex-shrink-0 w-56 h-32 relative">
                  <Image
                    src="/images/quiniela-logo.png"
                    alt="Quiniela Provincia"
                    fill
                    className="object-contain"
                    loading="eager"
                    priority
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    Quiniela
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Elegí tus números y ganá
                  </p>
                </div>
                <Button asChild size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                  <Link href="/quiniela">Jugar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quini 6 Card */}
          <Card className="overflow-hidden border-2 border-border hover:border-primary/50 transition-colors">
            <CardContent className="p-0">
              <div className="flex flex-col sm:flex-row items-center gap-4 p-6">
                <div className="flex-shrink-0 w-56 h-32 relative">
                  <Image
                    src="/images/quini6-logo.png"
                    alt="Quini 6 - A 6 pasos de cumplir tus sueños"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    Quini 6
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Elegí 6 números del 00 al 45
                  </p>
                </div>
                <Button asChild size="lg" className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                  <Link href="/quini6">Jugar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-6 px-4 mt-auto">
        <div className="max-w-2xl mx-auto text-center text-muted-foreground text-sm">
          <p>La Casa de la Suerte - Tu agencia de confianza</p>
        </div>
      </footer>
    </main>
  )
}
