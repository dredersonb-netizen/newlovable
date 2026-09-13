import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/recorrentes')({
  component: RecorrentesPage,
})

interface RecurringBill {
  id: string
  name: string
  category: string | null
  amount: number
  due_day: number
  active: boolean
  notes: string | null
}

function RecorrentesPage() {
  const [items, setItems] = useState<RecurringBill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('1')
  const [notes, setNotes] = useState('')

  async function load() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('recurring_bills')
      .select('id, name, category, amount, due_day, active, notes')
      .eq('active', true)
      .order('due_day', { ascending: true })

    if (error) {
      setError(error.message)
      setItems([])
    } else {
      setItems((data as RecurringBill[]) ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setFormError('É preciso estar logado para cadastrar uma conta recorrente.')
      setSaving(false)
      return
    }

    const { error } = await supabase.from('recurring_bills').insert({
      user_id: session.user.id,
      name: name.trim(),
      category: category.trim() || null,
      amount: Number(amount) || 0,
      due_day: Number(dueDay) || 1,
      notes: notes.trim() || null,
      active: true,
    })

    if (error) {
      setFormError(error.message)
      setSaving(false)
      return
    }

    setName('')
    setCategory('')
    setAmount('')
    setDueDay('1')
    setNotes('')
    setSaving(false)
    await load()
  }

  return (
    <div className="container py-10">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Contas recorrentes</h1>
        <p className="text-muted-foreground">
          Cadastre e acompanhe as contas que se repetem todo mês.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-foreground">Nova conta</h2>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Nome</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: Aluguel"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Categoria</span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-md border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              placeholder="Ex: Moradia"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Valor</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                placeholder="0,00"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-foreground">Dia de vencimento</span>
              <input
                required
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="rounded-md border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-foreground">Observações</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-md border bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          {formError && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Cadastrar conta'}
          </Button>
        </form>

        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">Cadastradas</h2>

          {loading && (
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              Carregando...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">
              Não foi possível carregar: {error}
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-lg border border-dashed bg-card p-10 text-center">
              <p className="text-foreground">Nenhuma conta recorrente ainda.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cadastre a primeira usando o formulário ao lado.
              </p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <ul className="space-y-3">
              {items.map((bill) => (
                <li
                  key={bill.id}
                  className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">{bill.name}</p>
                    {bill.category && (
                      <p className="text-sm text-muted-foreground">{bill.category}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Vence no dia {bill.due_day}
                    </p>
                  </div>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(Number(bill.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
