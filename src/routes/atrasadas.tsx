import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/atrasadas')({
  component: AtrasadasPage,
})

interface Installment {
  id: string
  number: number
  due_date: string
  amount: number
  commitment_id: string
  commitments?: { name: string } | null
}

function AtrasadasPage() {
  const [installments, setInstallments] = useState<Installment[]>([])
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set())
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  async function loadData() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('installments')
      .select('id, number, due_date, amount, commitment_id, commitments(name)')
      .lt('due_date', today)
      .order('due_date', { ascending: true })

    if (error) {
      setError(error.message)
      setInstallments([])
      setLoading(false)
      return
    }

    const list = (data as Installment[]) ?? []
    setInstallments(list)
    setAmounts(
      Object.fromEntries(list.map((i) => [i.id, String(Number(i.amount))])),
    )

    const ids = list.map((i) => i.id)
    if (ids.length > 0) {
      const { data: paidRows } = await supabase
        .from('payments')
        .select('installment_id')
        .in('installment_id', ids)

      const set = new Set<string>(
        (paidRows ?? []).map((p: { installment_id: string }) => p.installment_id),
      )
      setPaidIds(set)
    } else {
      setPaidIds(new Set())
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSaveAmount(inst: Installment) {
    setBusyId(inst.id)
    setFormError(null)
    setSuccess(null)

    const amount = Number(amounts[inst.id])
    if (!amount || amount <= 0) {
      setFormError('Informe um valor válido para a parcela.')
      setBusyId(null)
      return
    }

    const { error } = await supabase
      .from('installments')
      .update({ amount })
      .eq('id', inst.id)

    if (error) {
      setFormError(error.message)
      setBusyId(null)
      return
    }

    setInstallments((prev) =>
      prev.map((i) => (i.id === inst.id ? { ...i, amount } : i)),
    )
    setSuccess(`Valor da parcela ${inst.number} atualizado.`)
    setBusyId(null)
  }

  async function handlePay(inst: Installment) {
    setBusyId(inst.id)
    setFormError(null)
    setSuccess(null)

    const amount = Number(amounts[inst.id])
    if (!amount || amount <= 0) {
      setFormError('Informe um valor válido antes de dar baixa.')
      setBusyId(null)
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setFormError('É preciso estar logado para registrar um pagamento.')
      setBusyId(null)
      return
    }

    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: session.user.id,
        installment_id: inst.id,
        amount,
        paid_at: today,
      })
      .select('id')
      .single()

    if (paymentError || !paymentData) {
      setFormError(
        paymentError?.message ?? 'Não foi possível registrar o pagamento.',
      )
      setBusyId(null)
      return
    }

    // Marca os itens em aberto do mesmo compromisso como pagos, para o dashboard refletir.
    await supabase
      .from('commitment_items')
      .update({ paid: true, payment_id: paymentData.id })
      .eq('commitment_id', inst.commitment_id)
      .eq('paid', false)

    setPaidIds((prev) => new Set(prev).add(inst.id))
    setSuccess(
      `Pagamento de ${formatCurrency(amount)} registrado para a parcela ${inst.number}.`,
    )
    setBusyId(null)
  }

  const pending = installments.filter((i) => !paidIds.has(i.id))
  const paid = installments.filter((i) => paidIds.has(i.id))

  return (
    <div className="container py-10">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Parcelas atrasadas</h1>
        <p className="text-muted-foreground">
          Débitos com vencimento em meses anteriores. Edite o valor e dê baixa como pago.
        </p>
      </div>

      {loading && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Carregando parcelas...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">
          Não foi possível carregar: {error}
        </div>
      )}

      {!loading && !error && installments.length === 0 && (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-lg font-medium text-foreground">Nenhuma parcela atrasada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Todas as parcelas estão em dia ou ainda não venceram.
          </p>
        </div>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-8">
          {formError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </p>
          )}
          {success && (
            <p className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
              {success}
            </p>
          )}

          {pending.length > 0 && (
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Em aberto</h2>
              <ul className="space-y-3">
                {pending.map((inst) => (
                  <li
                    key={inst.id}
                    className="flex flex-col gap-3 rounded-md border bg-background p-4 sm:flex-row sm:items-end sm:justify-between"
                  >
                    <div className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-foreground">
                        {inst.commitments?.name ?? 'Compromisso'} — Parcela {inst.number}
                      </span>
                      <span className="text-muted-foreground">
                        Vencimento: {formatDate(inst.due_date)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-foreground">Valor</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amounts[inst.id] ?? ''}
                          onChange={(e) =>
                            setAmounts((prev) => ({
                              ...prev,
                              [inst.id]: e.target.value,
                            }))
                          }
                          className="w-32 rounded-md border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                        />
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleSaveAmount(inst)}
                        disabled={busyId === inst.id}
                      >
                        Salvar valor
                      </Button>
                      <Button
                        type="button"
                        onClick={() => handlePay(inst)}
                        disabled={busyId === inst.id}
                      >
                        {busyId === inst.id ? 'Registrando...' : 'Marcar como pago'}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {paid.length > 0 && (
            <section className="rounded-lg border bg-card p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Já pagas</h2>
              <ul className="space-y-2">
                {paid.map((inst) => (
                  <li
                    key={inst.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-muted-foreground"
                  >
                    <span className="line-through">
                      {inst.commitments?.name ?? 'Compromisso'} — Parcela {inst.number} ({formatDate(inst.due_date)})
                    </span>
                    <span className="font-medium line-through">
                      {formatCurrency(Number(inst.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
