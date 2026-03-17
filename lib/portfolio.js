export function calcPortfolio(trades) {
  const map = {}
  trades.sort((a, b) => new Date(a.date) - new Date(b.date))

  for (const t of trades) {
    if (!map[t.etf]) map[t.etf] = { qty: 0, totalCost: 0, realized: 0 }
    const p = map[t.etf]

    if (t.type === 'buy') {
      p.totalCost += t.qty * t.price
      p.qty += t.qty
    } else if (t.type === 'sell') {
      const avg = p.qty > 0 ? p.totalCost / p.qty : 0
      p.realized += (t.price - avg) * t.qty
      p.totalCost -= avg * t.qty
      p.qty -= t.qty
    }
  }
  return map
}

export function parseTimings(text) {
  const start = text.indexOf('[매매타이밍]')
  const end = text.indexOf('[/매매타이밍]')
  if (start === -1) return null

  const block = text.slice(start, end)
  const lines = block.split('\n')
  const result = {}

  lines.forEach(l => {
    if (!l.includes('|')) return
    const p = l.split('|')
    if (p.length >= 6) {
      result[p[0].trim()] = { buy: p[2]?.trim(), sell: p[5]?.trim() }
    }
  })
  return result
}
