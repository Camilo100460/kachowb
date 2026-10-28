function parseTopInput(text) {
  const raw = String(text || '').trim()
  if (!raw) return null

  const pipeIndex = raw.indexOf('|')
  const name = (pipeIndex === -1 ? raw : raw.slice(0, pipeIndex)).trim()
  const emoji = pipeIndex === -1 ? '' : raw.slice(pipeIndex + 1).trim()

  if (!name || name.length > 40) return null

  return {
    name,
    emoji: emoji || null,
  }
}

function pickRandomParticipants(participants, botJid, limit = 10) {
  const pool = participants.filter(p => p.id && p.id !== botJid)
  const selected = []
  const maxUsers = Math.min(limit, pool.length)

  for (let i = 0; i < maxUsers; i++) {
    const user = pool[Math.floor(Math.random() * pool.length)]
    if (!selected.find(u => u.id === user.id)) {
      selected.push(user)
    } else {
      i--
    }
  }

  return selected
}

// Convierte letras y números a la fuente negrita matemática (𝐀𝐁𝐂 𝟏𝟐𝟑)
function toBoldFont(str) {
  return [...String(str).normalize('NFD')]
    .map(ch => {
      const c = ch.codePointAt(0)
      if (c >= 65 && c <= 90) return String.fromCodePoint(0x1D400 + c - 65)
      if (c >= 97 && c <= 122) return String.fromCodePoint(0x1D41A + c - 97)
      if (c >= 48 && c <= 57) return String.fromCodePoint(0x1D7CE + c - 48)
      return ch
    })
    .join('')
    .normalize('NFC')
}

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

const HEADER_EMOJIS = ['🔥', '😎', '🤡', '👑', '💀', '😈']

function pickHeaderEmojis(customEmoji) {
  if (customEmoji) return [customEmoji, customEmoji]

  const left = HEADER_EMOJIS[Math.floor(Math.random() * HEADER_EMOJIS.length)]
  let right
  do {
    right = HEADER_EMOJIS[Math.floor(Math.random() * HEADER_EMOJIS.length)]
  } while (right === left)

  return [left, right]
}

function lineEmoji(position, customEmoji) {
  if (customEmoji) return customEmoji
  if (position === 1) return '🥇'
  if (position === 2) return '🥈'
  if (position === 3) return '🥉'
  return '•'
}

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!m.isGroup) {
    return conn.sendMessage(m.chat, {
      text: '[❗] Este comando solo puede usarse en grupos.',
      contextInfo: { ...rcanal.contextInfo },
    }, { quoted: m })
  }

  const parsed = parseTopInput(text)
  if (!parsed) {
    return conn.sendMessage(m.chat, {
      text: [
        '╭〔 🏆 *TOP PERSONALIZADO* 〕╮',
        '┃',
        '┃ ✍️ *ESCRIBE UN TÍTULO*',
        `┃ 🏷️ ${usedPrefix}top <nombre>`,
        `┃ 🎨 ${usedPrefix}top <nombre>|<emoji>`,
        '┣━━━━━━━━━━',
        '┃',
        '┃ 💡 *EJEMPLOS*',
        `┃ 🪙 ${usedPrefix}top coneros|🪙`,
        `┃ 😈 ${usedPrefix}top los mas malos|😈`,
        '┣━━━━━━━━━━',
        '┃',
        '┃ 🎲 Elige 10 miembros al azar',
        '┃    y los menciona en el grupo.',
        '╰━━━━━━━━━━'
      ].join('\n'),
      contextInfo: { ...rcanal.contextInfo },
    }, { quoted: m })
  }

  try {
    const groupMetadata = await conn.groupMetadata(m.chat)
    const participants = groupMetadata.participants || []
    const botJid = conn.decodeJid(conn.user?.jid || conn.user?.id)
    const selectedUsers = pickRandomParticipants(participants, botJid, 10)

    if (selectedUsers.length === 0) {
      return conn.sendMessage(m.chat, {
        text: '[❗] No hay suficientes usuarios en el grupo para crear el top.',
        contextInfo: { ...rcanal.contextInfo },
      }, { quoted: m })
    }

    const title = toBoldFont(`TOP ${parsed.name.toUpperCase()}`)
    const [leftEmoji, rightEmoji] = pickHeaderEmojis(parsed.emoji)
    let txt = `${leftEmoji} ${title} ${rightEmoji}\n\n`

    selectedUsers.forEach((user, index) => {
      const position = index + 1
      const emoji = lineEmoji(position, parsed.emoji)
      txt += `${NUMBER_EMOJIS[index]} ${emoji} @${user.id.split('@')[0]}\n`
    })

    return conn.sendMessage(m.chat, {
      text: txt,
      contextInfo: {
        ...rcanal.contextInfo,
        mentionedJid: selectedUsers.map(user => user.id),
      },
    }, { quoted: m })
  } catch (e) {
    console.error('Error en top personalizado:', e)
    return conn.sendMessage(m.chat, {
      text: '[❌] Ocurrió un error al generar el top.',
      contextInfo: { ...rcanal.contextInfo },
    }, { quoted: m })
  }
}

handler.help = ['top <nombre>|emoji']
handler.tags = ['fun', 'grupos']
handler.command = ['top']
handler.group = true

export default handler