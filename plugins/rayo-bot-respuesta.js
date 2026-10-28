const REPLIES = [
  '¿Que no hago nada? Si acabas de escribirme, no jodas 😏',
  'Mucho insulto y ni una instrucción clara. ¿Qué carajos necesitas?',
  'Qué joda contigo: me insultas y todavía esperas que te resuelva todo 🤖',
  'Si tan inútil soy, deja de dar lata y explícame qué necesitas.',
  'No chingues: primero dices que no sirvo y luego vienes a pedirme ayuda.'
]

const COOLDOWN_MS = 15_000
const lastReplyByChat = new Map()

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function isCommand(text = '', conn) {
  const prefixes = Array.isArray(conn.prefix)
    ? conn.prefix
    : [conn.prefix || global.prefix || '.']

  return prefixes.some(prefix => {
    if (prefix instanceof RegExp) return prefix.test(text)
    if (typeof prefix !== 'string' || !prefix) return false
    return text.startsWith(prefix)
  })
}

let handler = async () => {}

handler.all = async function (m, { conn }) {
  if (!m?.isGroup || m.fromMe || m.isBaileys || typeof m.text !== 'string') return

  const rawText = m.text.trim()
  if (!rawText || isCommand(rawText, conn)) return

  const text = normalizeText(rawText)
  const mentionsBot = /\b(?:mini(?:[\s-]*bot)?|kachow(?:[\s-]*bot)?|rayo)\b/.test(text)
  const insultsBot = /\b(no puedes hacer nada|no haces nada|no sirves|inutil|inservible|bot tonto|bot estupido|eres malo|bot malo)\b/.test(text)
  if (!mentionsBot || !insultsBot) return

  const now = Date.now()
  if (now - (lastReplyByChat.get(m.chat) || 0) < COOLDOWN_MS) return
  lastReplyByChat.set(m.chat, now)

  const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)]
  return conn.sendMessage(m.chat, { text: reply }, { quoted: m })
}

handler.command = []
handler.tags = ['diversion']

export default handler