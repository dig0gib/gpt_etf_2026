import { useState, useEffect } from 'react'
import Head from 'next/head'
import { calcPortfolio } from '../lib/portfolio'

const ETF_LIST = [
  { id: 'sp500',   name: 'KODEX 미국S&P500',   code: '379800' },
  { id: 'nasdaq',  name: 'KODEX 미국나스닥100', code: '379810' },
  { id: 'semi',    name: 'TIGER 반도체TOP10',   code: '396500' },
  { id: 'defense', name: 'KODEX 방산TOP10',     code: '0080G0' },
  { id: 'value',   name: 'ACE 코리아밸류업',    code: '496120' },
]

const TABS = ['시세', '레이더', 'AI보고서', '매매내역', '설정']

const emptyTrade = { date: '', etf: '379800', type: 'buy', qty: '', price: '' }

export default function Home() {
  const [tab, setTab]             = useState(0)
  const [prices, setPrices]       = useState({})
  const [radar, setRadar]         = useState([])
  const [report, setReport]       = useState('')
  const [tgToken, setTgToken]     = useState('')
  const [tgChat, setTgChat]       = useState('')
  const [loading, setLoading]     = useState({})
  const [trades, setTrades]       = useState([])
  const [form, setForm]           = useState(emptyTrade)
  const [portfolio, setPortfolio] = useState({})

  useEffect(() => {
    setTgToken(localStorage.getItem('tgToken') || '')
    setTgChat(localStorage.getItem('tgChat') || '')
    const saved = localStorage.getItem('trades')
    if (saved) {
      const t = JSON.parse(saved)
      setTrades(t)
      setPortfolio(calcPortfolio(t))
    }
  }, [])

  const setLoad = (key, val) => setLoading(p => ({ ...p, [key]: val }))

  function saveTrades(updated) {
    updated.sort((a, b) => new Date(a.date) - new Date(b.date))
    setTrades(updated)
    setPortfolio(calcPortfolio(updated))
    localStorage.setItem('trades', JSON.stringify(updated))
  }

  function addTrade() {
    if (!form.date || !form.qty || !form.price) return alert('날짜, 수량, 단가를 입력해주세요')
    const t = { ...form, qty: Number(form.qty), price: Number(form.price), id: Date.now() }
    saveTrades([...trades, t])
    setForm(emptyTrade)
  }

  function deleteTrade(id) {
    if (!confirm('삭제할까요?')) return
    saveTrades(trades.filter(t => t.id !== id))
  }

  async function fetchPrices() {
    setLoad('price', true)
    try {
      const codes = ETF_LIST.map(e => e.code).join(',')
      const r = await fetch(`/api/price?codes=${codes}`)
      setPrices(await r.json())
    } catch { alert('가격 불러오기 실패') }
    setLoad('price', false)
  }

  async function loadRadar() {
    setLoad('radar', true)
    try {
      const r = await fetch('/api/radar')
      setRadar(await r.json())
    } catch { alert('레이더 스캔 실패') }
    setLoad('radar', false)
  }

  async function generateReport() {
    setLoad('report', true)
    setReport('생성 중...')
    try {
      const priceText = ETF_LIST.map(e => {
        const d = prices[e.code]
        return d?.price ? `${e.name}: ${d.price.toLocaleString()}원 (${d.change > 0 ? '+' : ''}${d.change}%)` : `${e.name}: 미조회`
      }).join('\n')

      const radarText = radar.length
        ? radar.map(r => `${r.name}: ${r.momentum >= 0 ? '+' : ''}${r.momentum}%`).join('\n')
        : '레이더 미조회'

      const portRows = getPortfolioRows()
      const portText = portRows.map(r => {
        const pnl = r.pnlPct !== null ? ` 수익률${r.pnlPct.toFixed(2)}%` : ''
        return `${r.name}: ${r.qty}주 평균${r.avg.toLocaleString()}원${pnl}`
      }).join('\n') || '없음'

      const r = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `오늘의 ETF 시황을 분석해줘.\n\n[현재가]\n${priceText}\n\n[모멘텀 레이더]\n${radarText}\n\n[내 포트폴리오]\n${portText}\n\n매수/매도 판단과 주요 이슈를 간결하게 분석해줘.`
          }]
        })
      })
      const j = await r.json()
      const text = j?.content?.[0]?.text || JSON.stringify(j, null, 2)
      setReport(text)

      if (tgToken && tgChat) {
        await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tgToken, chatId: tgChat, message: `📊 ETF AI 보고서\n\n${text}` })
        })
      }
    } catch (e) { setReport('오류: ' + e.message) }
    setLoad('report', false)
  }

  function saveTg() {
    localStorage.setItem('tgToken', tgToken)
    localStorage.setItem('tgChat', tgChat)
    alert('저장 완료')
  }

  async function testTg() {
    setLoad('tg', true)
    try {
      const r = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tgToken, chatId: tgChat, message: '✅ ETF AI System 연결 성공!' })
      })
      const j = await r.json()
      alert(j.ok ? '전송 성공!' : '실패: ' + JSON.stringify(j))
    } catch (e) { alert('오류: ' + e.message) }
    setLoad('tg', false)
  }

  function getPortfolioRows() {
    return Object.entries(portfolio).map(([code, p]) => {
      const etf = ETF_LIST.find(e => e.code === code)
      const avg = p.qty > 0 ? p.totalCost / p.qty : 0
      const cur = prices[code]?.price || null
      const unrealized = cur && p.qty > 0 ? (cur - avg) * p.qty : null
      const pnlPct = cur && avg > 0 ? ((cur - avg) / avg * 100) : null
      return { code, name: etf?.name || code, qty: p.qty, avg: Math.round(avg), cur, unrealized, pnlPct, realized: p.realized }
    }).filter(r => r.qty > 0 || r.realized !== 0)
  }

  const portRows = getPortfolioRows()
  const totalUnrealized = portRows.reduce((s, r) => s + (r.unrealized || 0), 0)
  const totalRealized   = portRows.reduce((s, r) => s + (r.realized  || 0), 0)

  return (
    <>
      <Head>
        <title>ETF AI System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <div style={s.wrap}>
        <header style={s.header}><h1 style={s.h1}>📈 ETF · AI SYSTEM</h1></header>

        <div style={s.tabBar}>
          {TABS.map((t, i) => (
            <button key={i} style={{ ...s.tabBtn, ...(tab === i ? s.tabActive : {}) }} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>

        <main style={s.main}>

          {/* 시세 */}
          {tab === 0 && (
            <section style={s.card}>
              <h2 style={s.h2}>ETF 현재가</h2>
              <button style={s.btn} onClick={fetchPrices} disabled={loading.price}>
                {loading.price ? '불러오는 중...' : '가격 불러오기'}
              </button>
              <div style={{ marginTop: 12 }}>
                {ETF_LIST.map(e => {
                  const d = prices[e.code]
                  const up = d?.change > 0, dn = d?.change < 0
                  return (
                    <div key={e.code} style={s.row}>
                      <span style={s.etfName}>{e.name}</span>
                      {d?.price
                        ? <span style={{ color: up ? '#68d391' : dn ? '#fc8181' : '#e2e8f0', fontWeight: 600 }}>
                            {d.price.toLocaleString()}원 <span style={{ fontSize: 11 }}>({up ? '+' : ''}{d.change}%)</span>
                          </span>
                        : <span style={{ color: '#4a5568' }}>—</span>}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* 레이더 */}
          {tab === 1 && (
            <section style={s.card}>
              <h2 style={s.h2}>모멘텀 레이더 (1개월)</h2>
              <button style={s.btn} onClick={loadRadar} disabled={loading.radar}>
                {loading.radar ? '스캔 중...' : '시장 스캔'}
              </button>
              <div style={{ marginTop: 12 }}>
                {radar.length === 0 && <p style={{ color: '#4a5568', fontSize: 13 }}>스캔 버튼을 눌러주세요</p>}
                {radar.map((r, i) => (
                  <div key={r.code} style={s.row}>
                    <span style={{ ...s.rank, color: i === 0 ? '#f6c90e' : '#4a5568' }}>{i + 1}</span>
                    <span style={s.etfName}>{r.name}</span>
                    <span style={{ color: r.momentum >= 0 ? '#68d391' : '#fc8181', fontWeight: 600 }}>
                      {r.momentum >= 0 ? '+' : ''}{r.momentum}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* AI 보고서 */}
          {tab === 2 && (
            <section style={s.card}>
              <h2 style={s.h2}>AI 보고서</h2>
              <p style={{ color: '#718096', fontSize: 12, margin: '0 0 10px' }}>시세/레이더 먼저 불러오면 포트폴리오 포함 분석됩니다</p>
              <button style={s.btn} onClick={generateReport} disabled={loading.report}>
                {loading.report ? '생성 중...' : '보고서 생성'}
              </button>
              {report && <pre style={s.pre}>{report}</pre>}
            </section>
          )}

          {/* 매매내역 */}
          {tab === 3 && (
            <>
              {portRows.length > 0 && (
                <section style={s.card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ ...s.h2, margin: 0 }}>포트폴리오 현황</h2>
                    <button style={{ ...s.btn, fontSize: 11, padding: '5px 10px' }} onClick={fetchPrices}>현재가 갱신</button>
                  </div>
                  {portRows.map(r => (
                    <div key={r.code} style={{ ...s.row, flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        <span style={{ color: '#90cdf4', fontWeight: 600, fontSize: 13 }}>{r.name}</span>
                        {r.pnlPct !== null && (
                          <span style={{ color: r.pnlPct >= 0 ? '#68d391' : '#fc8181', fontWeight: 700, fontSize: 14 }}>
                            {r.pnlPct >= 0 ? '+' : ''}{r.pnlPct.toFixed(2)}%
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#718096', fontSize: 11, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <span>{r.qty}주</span>
                        <span>평균 {r.avg.toLocaleString()}원</span>
                        {r.cur && <span>현재 {r.cur.toLocaleString()}원</span>}
                        {r.unrealized !== null && (
                          <span style={{ color: r.unrealized >= 0 ? '#68d391' : '#fc8181' }}>
                            평가손익 {r.unrealized >= 0 ? '+' : ''}{Math.round(r.unrealized).toLocaleString()}원
                          </span>
                        )}
                        {r.realized !== 0 && (
                          <span style={{ color: r.realized >= 0 ? '#68d391' : '#fc8181' }}>
                            실현손익 {r.realized >= 0 ? '+' : ''}{Math.round(r.realized).toLocaleString()}원
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div style={{ borderTop: '1px solid #2d3748', marginTop: 10, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#718096' }}>총 평가손익</span>
                      <span style={{ color: totalUnrealized >= 0 ? '#68d391' : '#fc8181', fontWeight: 700 }}>
                        {totalUnrealized >= 0 ? '+' : ''}{Math.round(totalUnrealized).toLocaleString()}원
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span style={{ color: '#718096' }}>총 실현손익</span>
                      <span style={{ color: totalRealized >= 0 ? '#68d391' : '#fc8181', fontWeight: 700 }}>
                        {totalRealized >= 0 ? '+' : ''}{Math.round(totalRealized).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </section>
              )}

              <section style={s.card}>
                <h2 style={s.h2}>거래 입력</h2>
                <input style={s.input} type="date" value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                <select style={s.input} value={form.etf}
                  onChange={e => setForm(p => ({ ...p, etf: e.target.value }))}>
                  {ETF_LIST.map(e => <option key={e.code} value={e.code}>{e.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button style={{ ...s.typeBtn, ...(form.type === 'buy'  ? s.buyActive  : {}) }}
                    onClick={() => setForm(p => ({ ...p, type: 'buy'  }))}>매수</button>
                  <button style={{ ...s.typeBtn, ...(form.type === 'sell' ? s.sellActive : {}) }}
                    onClick={() => setForm(p => ({ ...p, type: 'sell' }))}>매도</button>
                </div>
                <input style={s.input} type="number" placeholder="수량 (주)" value={form.qty}
                  onChange={e => setForm(p => ({ ...p, qty: e.target.value }))} />
                <input style={s.input} type="number" placeholder="단가 (원)" value={form.price}
                  onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
                {form.qty && form.price && (
                  <p style={{ color: '#718096', fontSize: 12, margin: '0 0 8px' }}>
                    거래금액: {(Number(form.qty) * Number(form.price)).toLocaleString()}원
                  </p>
                )}
                <button style={{ ...s.btn, width: '100%' }} onClick={addTrade}>+ 거래 추가</button>
              </section>

              <section style={s.card}>
                <h2 style={s.h2}>거래 내역 ({trades.length}건)</h2>
                {trades.length === 0
                  ? <p style={{ color: '#4a5568', fontSize: 13 }}>거래 내역이 없습니다</p>
                  : [...trades].reverse().map(t => {
                    const etf = ETF_LIST.find(e => e.code === t.etf)
                    return (
                      <div key={t.id} style={{ ...s.row, gap: 6 }}>
                        <span style={{ color: '#718096', fontSize: 11, minWidth: 68 }}>{t.date}</span>
                        <span style={{ color: t.type === 'buy' ? '#68d391' : '#fc8181', fontSize: 11, minWidth: 26 }}>
                          {t.type === 'buy' ? '매수' : '매도'}
                        </span>
                        <span style={{ flex: 1, fontSize: 11, color: '#a0aec0' }}>{etf?.name || t.etf}</span>
                        <span style={{ fontSize: 11, color: '#e2e8f0' }}>
                          {t.qty}주/{t.price.toLocaleString()}원
                        </span>
                        <button onClick={() => deleteTrade(t.id)}
                          style={{ background: 'none', border: 'none', color: '#fc8181', cursor: 'pointer', fontSize: 13, padding: '0 2px' }}>✕</button>
                      </div>
                    )
                  })}
              </section>
            </>
          )}

          {/* 설정 */}
          {tab === 4 && (
            <section style={s.card}>
              <h2 style={s.h2}>텔레그램 설정</h2>
              <input style={s.input} placeholder="Bot Token" value={tgToken}
                onChange={e => setTgToken(e.target.value)} />
              <input style={s.input} placeholder="Chat ID" value={tgChat}
                onChange={e => setTgChat(e.target.value)} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={s.btn} onClick={saveTg}>저장</button>
                <button style={{ ...s.btn, background: '#48bb78' }} onClick={testTg} disabled={loading.tg}>
                  {loading.tg ? '전송 중...' : '테스트 전송'}
                </button>
              </div>
              <p style={{ color: '#718096', fontSize: 12, marginTop: 10, lineHeight: 1.8 }}>
                ※ AI 보고서 생성 시 자동 발송<br />
                ※ 평일 오전 7시 / 오후 6시 자동 보고서
              </p>
              <div style={{ borderTop: '1px solid #1f2937', marginTop: 20, paddingTop: 16 }}>
                <h2 style={s.h2}>데이터 관리</h2>
                <button style={{ ...s.btn, background: '#e53e3e' }}
                  onClick={() => {
                    if (!confirm('모든 거래내역을 삭제할까요?')) return
                    localStorage.removeItem('trades')
                    setTrades([])
                    setPortfolio({})
                    alert('삭제 완료')
                  }}>거래내역 전체 삭제</button>
              </div>
            </section>
          )}

        </main>
      </div>
    </>
  )
}

const s = {
  wrap:       { background: '#0a0f1e', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'sans-serif' },
  header:     { background: '#111827', padding: '14px', textAlign: 'center', borderBottom: '1px solid #1f2937' },
  h1:         { margin: 0, fontSize: 18, letterSpacing: 2 },
  tabBar:     { display: 'flex', background: '#111827', borderBottom: '1px solid #1f2937' },
  tabBtn:     { flex: 1, padding: '10px 2px', background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: 12 },
  tabActive:  { color: '#90cdf4', borderBottom: '2px solid #3182ce', fontWeight: 700 },
  main:       { maxWidth: 500, margin: 'auto', padding: '14px' },
  card:       { background: '#111827', borderRadius: 12, padding: 16, marginBottom: 14, border: '1px solid #1f2937' },
  h2:         { margin: '0 0 12px', fontSize: 14, color: '#90cdf4', fontWeight: 700 },
  btn:        { padding: '9px 16px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  row:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #1a2035', fontSize: 13 },
  etfName:    { color: '#a0aec0', flex: 1 },
  rank:       { width: 20, fontSize: 12, fontWeight: 700 },
  pre:        { background: '#0a0f1e', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap', fontSize: 13, marginTop: 12, lineHeight: 1.7 },
  input:      { display: 'block', width: '100%', padding: '9px 12px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#e2e8f0', fontSize: 14, marginBottom: 8, boxSizing: 'border-box' },
  typeBtn:    { flex: 1, padding: '8px', background: '#1f2937', border: '1px solid #374151', borderRadius: 6, color: '#718096', cursor: 'pointer', fontSize: 14 },
  buyActive:  { background: '#1a3a2a', border: '1px solid #48bb78', color: '#68d391', fontWeight: 700 },
  sellActive: { background: '#3a1a1a', border: '1px solid #fc8181', color: '#fc8181', fontWeight: 700 },
}
