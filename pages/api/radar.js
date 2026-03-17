const SYMBOLS = [
  { code: '379800', name: 'KODEX 미국S&P500' },
  { code: '379810', name: 'KODEX 미국나스닥100' },
  { code: '396500', name: 'TIGER 반도체TOP10' },
  { code: '069500', name: 'KODEX 200' },
  { code: '0080G0', name: 'KODEX 방산TOP10' },
  { code: '496120', name: 'ACE 코리아밸류업' }
]

export default async function handler(req, res) {
  const result = []

  for (const s of SYMBOLS) {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${s.code}.KS?interval=1d&range=1mo`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      const j = await r.json()
      const prices = j?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(Boolean)
      if (!prices || prices.length < 2) continue

      const first = prices[0]
      const last = prices[prices.length - 1]
      const momentum = ((last - first) / first * 100).toFixed(2)

      result.push({ code: s.code, name: s.name, momentum: parseFloat(momentum), price: last })
    } catch (e) {}
  }

  result.sort((a, b) => b.momentum - a.momentum)
  res.status(200).json(result)
}
