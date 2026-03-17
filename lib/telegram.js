export async function sendTelegram(token, chatId, message) {
  if (!token || !chatId) return { ok: false, error: 'token or chatId missing' }

  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    })
  })
  return await res.json()
}
