import { sendTelegram } from '../../lib/telegram'

export default async function handler(req, res) {
  // Vercel cron 보안 헤더 확인
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    // CRON_SECRET 없으면 그냥 통과 (선택적 보안)
  }

  try {
    // 1. 가격 수집
    const codes = '379800,379810,396500,0080G0,496120'
    const priceRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/price?codes=${codes}`)
    const prices = await priceRes.json()

    // 2. 레이더 수집
    const radarRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/radar`)
    const radar = await radarRes.json()

    // 3. Claude 보고서 생성
    const priceText = Object.entries(prices)
      .map(([code, d]) => `${code}: ${d.price}원 (${d.change > 0 ? '+' : ''}${d.change}%)`)
      .join('\n')

    const radarText = radar
      .map(r => `${r.name}: ${r.momentum > 0 ? '+' : ''}${r.momentum}%`)
      .join('\n')

    const claudeRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `오늘의 ETF 시황을 간략히 분석해줘.\n\n[현재가]\n${priceText}\n\n[모멘텀 레이더]\n${radarText}\n\n매수/매도 타이밍과 주요 이슈를 3줄 이내로 요약해줘.`
        }]
      })
    })

    const claudeData = await claudeRes.json()
    const report = claudeData?.content?.[0]?.text || '보고서 생성 실패'

    // 4. 텔레그램 발송
    const token = process.env.TG_TOKEN
    const chatId = process.env.TG_CHAT_ID

    if (token && chatId) {
      const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      await sendTelegram(token, chatId, `📊 *ETF AI 보고서* (${now})\n\n${report}`)
    }

    res.status(200).json({ status: 'ok', report })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.toString() })
  }
}
