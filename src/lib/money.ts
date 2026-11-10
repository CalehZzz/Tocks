export function money(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('es-SV', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value || 0)
  } catch {
    return `$${(value || 0).toFixed(2)}`
  }
}

export function lineTotal(
  unitPrice: number,
  qty: number,
  discountPct = 0,
): number {
  return +(unitPrice * qty * (1 - (discountPct || 0) / 100)).toFixed(4)
}
