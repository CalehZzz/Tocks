import type { Sale, StoreStats } from '../types'

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function saleMonthKey(sale: Sale): string {
  return monthKey(new Date(sale.created_at))
}

export function filterSalesByMonth(
  sales: Sale[],
  year: number,
  month: number,
): Sale[] {
  const key = `${year}-${String(month).padStart(2, '0')}`
  return sales.filter((s) => saleMonthKey(s) === key)
}

export function computeStats(sales: Sale[]): StoreStats {
  const salesTotal = sales.reduce((a, s) => a + Number(s.total), 0)
  const costTotal = sales.reduce((a, s) => a + Number(s.cost_total), 0)
  const unitsSold = sales.reduce(
    (a, s) => a + (s.items || []).reduce((b, i) => b + i.qty, 0),
    0,
  )
  return {
    salesTotal,
    costTotal,
    profit: salesTotal - costTotal,
    saleCount: sales.length,
    unitsSold,
  }
}

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]
