export default async function handler(req, res) {
  const { codes } = req.query
  if (!codes) return res.status(400).json({ error: 'codes required' })

  const result = {}

  for (const code of codes.split(',')) {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${code}.KS?interval=1d&range=5d`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      const j = await r.json()
      const meta = j?.chart?.result?.[0]?.meta
      result[code] = {
        price: meta?.regularMarketPrice ?? null,
        prevClose: meta?.previousClose ?? null,
        change: meta?.regularMarketPrice && meta?.previousClose
          ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2)
          : null
      }
    } catch (e) {
      result[code] = { price: null, prevClose: null, change: null }
    }
  }

  res.status(200).json(result)
}
