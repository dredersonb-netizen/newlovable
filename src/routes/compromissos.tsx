import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'

export const Route = createFileRoute('/compromissos')({
  component: CompromissosPage,
})

interface Commitment {
  id: string
  name: string
  kind: string
  institution: string | null
  total_amount: number
  installments_count: number
  first_due_date: string
  archived: boolean
}

function CompromissosPage() {
  const [items, setItems] = useState<Commitment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('commitments')
        .select(
          'id, name, kind, institution, total_amount, installments_count, first_due_date, archived',
        )
        .eq('archived', false)
        .order('first_due_date', { ascending: true })

      if (!active) return

      if (error) {
        setError(error.message)
        setItems([])
      } else {
        setItems((data as Commitment[]) ?? [])
      }

      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="container py-10">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Compromissos</h1>
        <p className="text-muted-foreground">
          Acompanhe seus compromissos parcelados e recorrentes.
        </p>
      </div>

      {loading && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Carregando compromissos...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">
          Não foi possível carregar os compromissos: {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-lg font-medium text-foreground">Nenhum compromisso ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Faça login e cadastre seu primeiro compromisso para vê-lo aqui.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">{item.name}</h2>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                  {item.kind}
                </span>
              </div>
              {item.institution && (
                <p className="text-sm text-muted-foreground">{item.institution}</p>
              )}
              <div className="mt-auto space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor total</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(Number(item.total_amount))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parcelas</span>
                  <span className="font-medium text-foreground">{item.installments_count}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">1º vencimento</span>
                  <span className="font-medium text-foreground">
                    {formatDate(item.first_due_date)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
