import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

interface RecurringBill {
  id: string
  name: string
  category: string | null
  amount: number
  due_day: number
}

interface Commitment {
  id: string
  name: string
  kind: string
  total_amount: number
  installments_count: number
  first_due_date: string
}

interface Installment {
  id: string
  number: number
  due_date: string
  amount: number
  commitment_id: string
}

function DashboardPage() {
  const [bills, setBills] = useState<RecurringBill[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      const [billsRes, commitmentsRes, installmentsRes] = await Promise.all([
        supabase
          .from('recurring_bills')
          .select('id, name, category, amount, due_day')
          .eq('active', true)
          .order('due_day', { ascending: true }),
        supabase
          .from('commitments')
          .select('id, name, kind, total_amount, installments_count, first_due_date')
          .eq('archived', false)
          .order('first_due_date', { ascending: true }),
        supabase
          .from('installments')
          .select('id, number, due_date, amount, commitment_id')
          .order('due_date', { ascending: true })
          .limit(5),
      ])

      if (!active) return

      const firstError =
        billsRes.error?.message ??
        commitmentsRes.error?.message ??
        installmentsRes.error?.message ??
        null

      if (firstError) {
        setError(firstError)
      } else {
        setBills((billsRes.data as RecurringBill[]) ?? [])
        setCommitments((commitmentsRes.data as Commitment[]) ?? [])
        setInstallments((installmentsRes.data as Installment[]) ?? [])
      }

      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const billsTotal = bills.reduce((sum, b) => sum + Number(b.amount), 0)
  const commitmentsTotal = commitments.reduce((sum, c) => sum + Number(c.total_amount), 0)

  return (
    <div className="container py-10">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral das suas contas recorrentes, compromissos e parcelas.
        </p>
      </div>

      {loading && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Carregando dados...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">
          Não foi possível carregar o dashboard: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Contas recorrentes</h2>
              <Link
                to="/recorrentes"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Total mensal: {formatCurrency(billsTotal)}
            </p>
            {bills.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma conta recorrente ativa.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {bills.slice(0, 5).map((bill) => (
                  <li key={bill.id} className="flex justify-between">
                    <span className="text-foreground">{bill.name}</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(Number(bill.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Compromissos</h2>
              <Link
                to="/compromissos"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Total: {formatCurrency(commitmentsTotal)}
            </p>
            {commitments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum compromisso cadastrado.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {commitments.slice(0, 5).map((c) => (
                  <li key={c.id} className="flex justify-between">
                    <span className="text-foreground">{c.name}</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(Number(c.total_amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Próximas parcelas</h2>
            {installments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma parcela registrada.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {installments.map((inst) => (
                  <li key={inst.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      Parcela {inst.number} — {formatDate(inst.due_date)}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(Number(inst.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
