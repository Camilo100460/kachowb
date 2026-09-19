const activeLists = new Map()
const slotEmojis = ['🦅', '🪶', '🏹', '🛡️', '⚡', '🔥']

const getUserName = async (m, conn) => {
  if (m.pushName?.trim()) return m.pushName.trim()
  const contactName = await conn.getName?.(m.sender).catch?.(() => '')
  return contactName || `@${m.sender?.split('@')[0] || 'usuario'}`
}

const renderTeam = team => team
  .map((member, index) => `${slotEmojis[index]}•${member?.name || ''}`)
  .join('\n')

const buildList = ({ mexicoTime, colombiaTime, team }) => `
⚔️ *𝙇𝙄𝙎𝙏𝘼 𝙑𝙑𝟮 · 𝟲𝙑𝙎𝟲* ⚔️

🕘 *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽 *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : '________'}
🇨🇴 *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : '________'}

_*𝐄𝐐𝐔𝐈𝐏𝐎 · 6 INTEGRANTES*_
${renderTeam(team)}

📝 *𝐈𝐍𝐒𝐂𝐑𝐈𝐏𝐂𝐈𝐎𝐍𝐄𝐒*
👍 Inscribirse  |  😢 Salir`

const handler = async (m, { conn, text }) => {
  const time = (text?.trim() || '').split('/').pop().trim()
  const match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  const mexicoTime = match ? `${String(Number(match[1])).padStart(2, '0')}:${match[2]}` : ''
  const colombiaTime = match ? `${String((Number(match[1]) + 1) % 24).padStart(2, '0')}:${match[2]}` : ''
  const listState = {
    mexicoTime,
    colombiaTime,
    team: Array(6).fill(null)
  }

  const sent = await conn.sendMessage(m.chat, { text: buildList(listState) }, { quoted: m })
  listState.messageKey = sent.key
  activeLists.set(m.chat, listState)
}

handler.all = async (m, { conn }) => {
  if (m.mtype !== 'reactionMessage' || !m.msg?.key || !m.msg.text) return
  const listState = activeLists.get(m.chat)
  if (!listState || m.msg.key.id !== listState.messageKey.id) return

  const userId = m.sender
  if (!userId) return

  const previousIndex = listState.team.findIndex(member => member?.id === userId)
  if (previousIndex >= 0) listState.team.splice(previousIndex, 1)
  while (listState.team.length < 6) listState.team.push(null)

  if (m.msg.text === '👍') {
    const slotIndex = listState.team.findIndex(member => !member)
    if (slotIndex >= 0) {
      listState.team[slotIndex] = {
        id: userId,
        name: await getUserName(m, conn)
      }
    }
  }

  await conn.sendMessage(m.chat, {
    text: buildList(listState),
    silent: true,
    edit: listState.messageKey
  })
}

handler.command = ['vv2-6', 'vv26']
handler.tags = ['listas']
handler.help = ['vv2-6 <hora>']

export default handler
