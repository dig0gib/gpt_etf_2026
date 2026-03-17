import { useState, useEffect } from 'react'
import Head from 'next/head'

const ETF_LIST = [
  { id: 'sp500',   name: 'KODEX 미국S&P500',   code: '379800' },
  { id: 'nasdaq',  name: 'KODEX 미국나스닥100', code: '379810' },
  { id: 'semi',    name: 'TIGER 반도체TOP10',   code: '396500' },
  { id: 'defense', name: 'KODEX 방산TOP10',     code: '0080G0' },
  { id: 'value',   name: 'ACE 코리아밸류업',    code: '496120' },
]

export default function Home() {
  const [prices, setPrices]     = useState({})
  const [radar, setRadar]       = useState([])
  const [report, setReport]     = useState('')
  const [tgToken, setTgToken]   = useState('')
  const [tgChat, setTgChat]     = useState('')
  const [loading, setLoading]   = useState({})

  useEffect(() => {
    setTgToken(localStorage.getItem('tgToken') || '')
    setTgChat(localStorage.getItem('tgChat') || '')
  }, [])

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }))

  // 가격 불러오기
  async function fetchPrices() {
    setLoad('price', true)
    try {
      const codes = ETF_LIST.map(e => e.code).join(',')
      const r = await fetch(`/api/price?codes=${codes}`)
      const data = await r.json()
      setPrices(data)
    } catch (e) {
      alert('가격 불러오기 실패: ' + e.message)
    }
    setLoad('price', false)
  }

  // 레이더 스캔
  async function loadRadar() {
    setLoad('radar', true)
    try {
      const r = await fetch('/api/radar')
      const data = await r.json()
      setRadar(data)
    } catch (e) {
      alert('레이더 스캔 실패: ' + e.message)
    }
    setLoad('radar', false)
  }

  // AI 보고서
  async function generateReport() {
    setLoad('report', true)
    setReport('생성 중...')
    try {
      const priceText = ETF_LIST.map(e => {
        const d = prices[e.code]
        return d?.price ? `${e.name}: ${d.price}원 (${d.change > 0 ? '+' : ''}${d.change}%)` : `${e.name}: 미조회`
      }).join('\n')

      const radarText = radar.length
        ? radar.map(r => `${r.name}: ${r.momentum > 0 ? '+' : ''}${r.momentum}%`).join('\n')
        : '레이더 미조회'

      const r = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `오늘의 ETF 시황을 분석해줘.\n\n[현재가]\n${priceText}\n\n[모멘텀 레이더]\n${radarText}\n\n매수/매도 판단과 주요 이슈를 간결하게 분석해줘.`
          }]
        })
      })
      const j = await r.json()
      const text = j?.content?.[0]?.text || JSON.stringify(j, null, 2)
      setReport(text)

      // 텔레그램 자동 발송
      if (tgToken && tgChat) {
        await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tgToken, chatId: tgChat, message: `📊 ETF AI 보고서\n\n${text}` })
        })
      }
    } catch (e) {
      setReport('오류: ' + e.message)
    }
    setLoad('report', false)
  }

  // 텔레그램 저장
  function saveTg() {
    localStorage.setItem('tgToken', tgToken)
    localStorage.setItem('tgChat', tgChat)
    alert('저장 완료')
  }

  // 텔레그램 테스트
  async function testTg() {
    setLoad('tg', true)
    try {
      const r = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tgToken, chatId: tgChat, message: '✅ ETF AI System 텔레그램 연결 테스트 성공!' })
      })
      const j = await r.json()
      alert(j.ok ? '전송 성공!' : '전송 실패: ' + JSON.stringify(j))
    } catch (e) {
      alert('오류: ' + e.message)
    }
    setLoad('tg', false)
  }

  return (
    <>
      <Head>
        <title>ETF AI System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
      </Head>

      <div style={s.wrap}>
        <header style={s.header}>
          <h1 style={s.h1}>📈 ETF · AI SYSTEM</h1>
        </header>

        <main style={s.main}>

          {/* ETF 가격 */}
          <section style={s.card}>
            <h2 style={s.h2}>ETF 현재가</h2>
            <button style={s.btn} onClick={fetchPrices} disabled={loading.price}>
              {loading.price ? '불러오는 중...' : '가격 불러오기'}
            </button>
            <div style={{ marginTop: 12 }}>
              {ETF_LIST.map(e => {
                const d = prices[e.code]
                const up = d?.change > 0
                const dn = d?.change < 0
                return (
                  <div key={e.code} style={s.row}>
                    <span style={s.etfName}>{e.name}</span>
                    {d?.price
                      ? <span style={{ color: up ? '#68d391' : dn ? '#fc8181' : '#e2e8f0' }}>
                          {d.price.toLocaleString()}원&nbsp;
                          ({up ? '+' : ''}{d.change}%)
                        </span>
                      : <span style={{ color: '#718096' }}>—</span>
                    }
                  </div>
                )
              })}
            </div>
          </section>

          {/* 레이더 */}
          <section style={s.card}>
            <h2 style={s.h2}>모멘텀 레이더 (1개월)</h2>
            <button style={s.btn} onClick={loadRadar} disabled={loading.radar}>
              {loading.radar ? '스캔 중...' : '시장 스캔'}
            </button>
            <div style={{ marginTop: 12 }}>
              {radar.map((r, i) => (
                <div key={r.code} style={s.row}>
                  <span style={s.rank}>{i + 1}</span>
                  <span style={s.etfName}>{r.name}</span>
                  <span style={{ color: r.momentum >= 0 ? '#68d391' : '#fc8181' }}>
                    {r.momentum >= 0 ? '+' : ''}{r.momentum}%
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* AI 보고서 */}
          <section style={s.card}>
            <h2 style={s.h2}>AI 보고서</h2>
            <button style={s.btn} onClick={generateReport} disabled={loading.report}>
              {loading.report ? '생성 중...' : '보고서 생성'}
            </button>
            {report && <pre style={s.pre}>{report}</pre>}
          </section>

          {/* 텔레그램 설정 */}
          <section style={s.card}>
            <h2 style={s.h2}>텔레그램 설정</h2>
            <input
              style={s.input}
              placeholder="Bot Token"
              value={tgToken}
              onChange={e => setTgToken(e.target.value)}
            />
            <input
              style={s.input}
              placeholder="Chat ID"
              value={tgChat}
              onChange={e => setTgChat(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button style={s.btn} onClick={saveTg}>저장</button>
              <button style={{ ...s.btn, background: '#48bb78' }} onClick={testTg} disabled={loading.tg}>
                {loading.tg ? '전송 중...' : '테스트 전송'}
              </button>
            </div>
            <p style={{ color: '#718096', fontSize: 12, marginTop: 8 }}>
              ※ 보고서 생성 시 텔레그램 자동 발송됩니다
            </p>
          </section>

        </main>
      </div>
    </>
  )
}

const s = {
  wrap: { background: '#0a0f1e', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'sans-serif' },
  header: { background: '#111827', padding: '16px', textAlign: 'center', borderBottom: '1px solid #1f2937' },
  h1: { margin: 0, fontSize: 20, letterSpacing: 2 },
  main: { maxWidth: 500, margin: 'auto', padding: '16px' },
  card: { background: '#111827', borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #1f2937' },
  h2: { margin: '0 0 12px', fontSize: 15, color: '#90cdf4' },
  btn: { padding: '9px 16px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1f2937', fontSize: 14 },
  etfName: { color: '#a0aec0', flex: 1 },
  rank: { color: '#4a5568', width: 20, fontSize: 12 },
  pre: { background: '#0a0f1e', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', fontSize: 13, marginTop: 12, lineHeight: 1.6 },
  input: { display: 'block', width: '100%', padding: '9px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e2e8f0', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' }
}
