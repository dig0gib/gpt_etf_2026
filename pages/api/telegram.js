import { sendTelegram } from '../../lib/telegram'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { token, chatId, message } = req.body
  if (!token || !chatId || !message) {
    return res.status(400).json({ error: 'token, chatId, message 필요' })
  }

  const result = await sendTelegram(token, chatId, message)
  res.status(200).json(result)
}
