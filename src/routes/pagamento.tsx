import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/pagamento')({
  component: PagamentoPage,
})

interface Commitment {
  id: string
  name: string
  total_amount: number
}

interface CommitmentItem {
  id: string
  description: string
  amount: number
  installments_count: number
  paid: boolean
  payment_id: string | null
}

function PagamentoPage() {
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [selectedCommitment, setSelectedCommitment] = useState<string>('')
  const [items, setItems] = useState<CommitmentItem[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [amountInput, setAmountInput] = useState('')
  const [amountTouched, setAmountTouched] = useState(false)

  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('commitments')
        .select('id, name, total_amount')
        .eq('archived', false)
        .order('first_due_date', { ascending: true })

      if (!active) return

      if (error) {
        setError(error.message)
        setCommitments([])
      } else {
        setCommitments((data as Commitment[]) ?? [])
      }

      setLoading(false)
    }

    load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedCommitment) {
      setItems([])
      setSelected({})
      return
    }

    let active = true

    async function loadItems() {
      setLoadingItems(true)
      setFormError(null)
      setSuccess(null)
      setAmountTouched(false)

      const { data, error } = await supabase
        .from('commitment_items')
        .select('id, description, amount, installments_count, paid, payment_id')
        .eq('commitment_id', selectedCommitment)
        .order('created_at', { ascending: true })

      if (!active) return

      if (error) {
        setFormError(error.message)
        setItems([])
        setSelected({})
      } else {
        const list = (data as CommitmentItem[]) ?? []
        setItems(list)
        setSelected(
          Object.fromEntries(
            list.filter((i) => !i.paid).map((i) => [i.id, false]),
          ),
        )
      }

      setLoadingItems(false)
    }

    loadItems()
    return () => {
      active = false
    }
  }, [selectedCommitment])

  const selectedTotal = useMemo(
    () =>
      items
        .filter((i) => selected[i.id])
        .reduce((sum, i) => sum + Number(i.amount), 0),
    [items, selected],
  )

  useEffect(() => {
    if (!amountTouched) {
      setAmountInput(selectedTotal ? String(selectedTotal) : '')
    }
  }, [selectedTotal, amountTouched])

  function toggleItem(id: string) {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handlePay() {
    setSaving(true)
    setFormError(null)
    setSuccess(null)

    const chosenIds = items.filter((i) => selected[i.id]).map((i) => i.id)

    if (chosenIds.length === 0) {
      setFormError('Selecione ao menos um item para pagar.')
      setSaving(false)
      return
    }

    const amount = Number(amountInput)
    if (!amount || amount <= 0) {
      setFormError('Informe um valor de pagamento válido.')
      setSaving(false)
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setFormError('É preciso estar logado para registrar um pagamento.')
      setSaving(false)
      return
    }

    // payments.installment_id é obrigatório e referencia installments.
    // Usamos a primeira parcela do compromisso como vínculo do pagamento.
    const { data: installmentRows, error: installmentError } = await supabase
      .from('installments')
      .select('id')
      .eq('commitment_id', selectedCommitment)
      .order('number', { ascending: true })
      .limit(1)

    if (installmentError) {
      setFormError(installmentError.message)
      setSaving(false)
      return
    }

    const installmentId = installmentRows?.[0]?.id
    if (!installmentId) {
      setFormError(
        'Este compromisso não tem parcelas cadastradas em installments, e o pagamento precisa de uma parcela para ser registrado.',
      )
      setSaving(false)
      return
    }

    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: session.user.id,
        installment_id: installmentId,
        amount,
      })
      .select('id')
      .single()

    if (paymentError || !paymentData) {
      setFormError(paymentError?.message ?? 'Não foi possível registrar o pagamento.')
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('commitment_items')
      .update({ paid: true, payment_id: paymentData.id })
      .in('id', chosenIds)

    if (updateError) {
      setFormError(updateError.message)
      setSaving(false)
      return
    }

    setSuccess(
      `Pagamento de ${formatCurrency(amount)} registrado para ${chosenIds.length} item(ns).`,
    )
    setSaving(false)

    // Recarrega os itens para refletir o estado pago.
    const { data } = await supabase
      .from('commitment_items')
      .select('id, description, amount, installments_count, paid, payment_id')
      .eq('commitment_id', selectedCommitment)
      .order('created_at', { ascending: true })

    const list = (data as CommitmentItem[]) ?? []
    setItems(list)
    setSelected(
      Object.fromEntries(list.filter((i) => !i.paid).map((i) => [i.id, false])),
    )
    setAmountTouched(false)
  }

  const pendingItems = items.filter((i) => !i.paid)
  const paidItems = items.filter((i) => i.paid)

  return (
    <div className="container py-10">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Pagamento de fatura</h1>
        <p className="text-muted-foreground">
          Selecione os itens de um compromisso e registre um pagamento total ou parcial.
        </p>
      </div>

      {loading && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Carregando compromissos...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">
          Não foi possível carregar: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Compromisso</span>
              <select
                value={selectedCommitment}
                onChange={(e) => setSelectedCommitment(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione um compromisso</option>
                {commitments.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {formatCurrency(Number(c.total_amount))}
                  </option>
                ))}
              </select>
            </label>

            {loadingItems && (
              <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
                Carregando itens...
              </div>
            )}

            {!loadingItems && selectedCommitment && items.length === 0 && (
              <div className="rounded-lg border border-dashed bg-card p-10 text-center">
                <p className="text-foreground">Nenhum item neste compromisso.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cadastre itens em commitment_items para poder pagá-los aqui.
                </p>
              </div>
            )}

            {!loadingItems && pendingItems.length > 0 && (
              <div className="rounded-lg border bg-card p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-foreground">
                  Itens em aberto
                </h2>
                <ul className="space-y-2">
                  {pendingItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-md border bg-background p-3"
                    >
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={!!selected[item.id]}
                          onChange={() => toggleItem(item.id)}
                          className="h-4 w-4 rounded border"
                        />
                        <span className="text-foreground">{item.description}</span>
                      </label>
                      <span className="font-medium text-foreground">
                        {formatCurrency(Number(item.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!loadingItems && paidItems.length > 0 && (
              <div className="rounded-lg border bg-card p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-foreground">
                  Já pagos
                </h2>
                <ul className="space-y-2">
                  {paidItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 text-muted-foreground"
                    >
                      <span className="line-through">{item.description}</span>
                      <span className="font-medium line-through">
                        {formatCurrency(Number(item.amount))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Resumo do pagamento</h2>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Itens selecionados</span>
              <span className="font-medium text-foreground">
                {items.filter((i) => selected[i.id]).length}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Soma dos itens</span>
              <span className="font-medium text-foreground">
                {formatCurrency(selectedTotal)}
              </span>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Valor a pagar</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountInput}
                onChange={(e) => {
                  setAmountTouched(true)
                  setAmountInput(e.target.value)
                }}
                className="rounded-md border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                placeholder="0,00"
              />
              <span className="text-xs text-muted-foreground">
                Ajuste para registrar um pagamento parcial.
              </span>
            </label>

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

            <Button
              type="button"
              onClick={handlePay}
              disabled={saving || !selectedCommitment}
            >
              {saving ? 'Registrando...' : 'Registrar pagamento'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
