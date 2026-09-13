import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="container flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-6 py-12 text-center">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-foreground">Gestão de Compromissos e Pagamentos</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">
          Organize compromissos parcelados, contas recorrentes e acompanhe os pagamentos em um só lugar.
        </p>
      </div>
      <div className="flex gap-3">
        <Button size="lg">Começar</Button>
        <Button size="lg" variant="outline">
          Saiba mais
        </Button>
      </div>
    </div>
  )
}
