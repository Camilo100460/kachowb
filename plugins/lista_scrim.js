const activeLists = new Map()
const slotEmojis = ['🦅', '🪶', '🏹', '🛡️']

const getUserName = async (m, conn) => {
	if (m.pushName?.trim()) return m.pushName.trim()
	const contactName = await conn.getName?.(m.sender).catch?.(() => '')
	return contactName || `@${m.sender?.split('@')[0] || 'usuario'}`
}

const renderSquad = squad => squad
	.map((member, index) => `${slotEmojis[index]}•${member?.name || ''}`)
	.join('\n')

const buildList = ({ mexicoTime, colombiaTime, squad, substitutes }) => `
🐣 *𝙇𝙄𝙎𝙏𝘼 𝙎𝘾𝙍𝙄𝙈* 🌷

🕘 *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽 *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : '________'}
🇨🇴 *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : '________'}

          _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀*_

${renderSquad(squad)}

          _*𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄𝐒*_

${substitutes.map(member => `ㅤ.ೃ.𖣓 ${member?.name || ''}`).join('\n')}

📝 *𝐈𝐍𝐒𝐂𝐑𝐈𝐏𝐂𝐈𝐎𝐍𝐄𝐒*
👍 Titular  |  🙋 Suplente  |  😢 Salir`

const handler = async (m, { conn, text }) => {
	const time = (text?.trim() || '').replace(/^\//, '').trim()
	const match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
	const mexicoTime = match ? `${String(Number(match[1])).padStart(2, '0')}:${match[2]}` : ''
	const colombiaTime = match ? `${String((Number(match[1]) + 1) % 24).padStart(2, '0')}:${match[2]}` : ''
	const listState = {
		mexicoTime,
		colombiaTime,
		squad: Array(4).fill(null),
		substitutes: []
	}

	const sent = await conn.sendMessage(m.chat, { text: buildList(listState) }, { quoted: m })
	listState.messageKey = sent.key
	activeLists.set(m.chat, listState)
}

handler.all = async (m, { conn }) => {
	if (m.mtype !== 'reactionMessage' || !m.msg?.key) return
	const listState = activeLists.get(m.chat)
	if (!listState || m.msg.key.id !== listState.messageKey.id) return

	const userId = m.sender
	if (!userId) return

	const previousIndex = listState.squad.findIndex(member => member?.id === userId)
	if (previousIndex >= 0) listState.squad.splice(previousIndex, 1)
	while (listState.squad.length < 4) listState.squad.push(null)

	const substituteIndex = listState.substitutes.findIndex(member => member?.id === userId)
	if (substituteIndex >= 0) listState.substitutes.splice(substituteIndex, 1)

	if (m.msg.text === '👍') {
		const slotIndex = listState.squad.findIndex(member => !member)
		if (slotIndex >= 0) listState.squad[slotIndex] = { id: userId, name: await getUserName(m, conn) }
	} else if (m.msg.text === '🙋' && listState.substitutes.length < 2) {
		listState.substitutes.push({ id: userId, name: await getUserName(m, conn) })
	}

	await conn.sendMessage(m.chat, { text: buildList(listState), edit: listState.messageKey })
}

handler.command = ['scrim', 'listascrim']
handler.tags = ['listas']
handler.help = ['scrim <hora>']

export default handler
