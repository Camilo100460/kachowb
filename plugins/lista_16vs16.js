const activeLists = new Map()
const MAX_PLAYERS_PER_SQUAD = 4
const slotEmojis = ['🦅', '🪶', '🏹', '🛡️', '⚡', '🔥']

const getUserName = async (m, conn) => {
	if (m.pushName?.trim()) return m.pushName.trim()
	const contactName = await conn.getName?.(m.sender).catch?.(() => '')
	return contactName || `@${m.sender?.split('@')[0] || 'usuario'}`
}

const renderSquad = squad => squad
	.map((member, index) => `${slotEmojis[index % slotEmojis.length]}•${member?.name || ''}`)
	.join('\n')

const renderSubstitutes = substitutes => substitutes
	.map(member => `ㅤ.ೃ.𖣓 ${member.name}`)
	.join('\n')

const buildList = ({ colorText, mexicoTime, colombiaTime, squads, substitutes }) => `
🦅 *𝙇𝙄𝙎𝙏𝘼 𝟭𝟲𝙑𝙎𝟭𝟲* 🪶

🕘 *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽 *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : '________'}
🇨🇴 *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : '________'}

🎨 *𝐂𝐎𝐋𝐎𝐑:* ${colorText}

          _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 1*_

${renderSquad(squads[0])}

          _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 2*_

${renderSquad(squads[1])}

          _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 3*_

${renderSquad(squads[2])}

          _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 4*_

${renderSquad(squads[3])}

          _*𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄𝐒*_

${renderSubstitutes(substitutes)}

📝 *𝐈𝐍𝐒𝐂𝐑𝐈𝐏𝐂𝐈𝐎𝐍𝐄𝐒*
👍 Escuadra 1  |  ❤️ Escuadra 2
😮 Escuadra 3  |  😂 Escuadra 4
🙋 Suplente  |  😢 Salir`

const handler = async (m, { conn, text }) => {
	const [colorValue = '', timeValue = ''] = (text?.trim() || '').split('/')
	const time = timeValue.trim()
	const match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
	const mexicoTime = match ? `${String(Number(match[1])).padStart(2, '0')}:${match[2]}` : ''
	const colombiaTime = match ? `${String((Number(match[1]) + 1) % 24).padStart(2, '0')}:${match[2]}` : ''
	const listState = {
		colorText: colorValue.trim() || '_______________',
		mexicoTime,
		colombiaTime,
		squads: [
			Array(MAX_PLAYERS_PER_SQUAD).fill(null),
			Array(MAX_PLAYERS_PER_SQUAD).fill(null),
			Array(MAX_PLAYERS_PER_SQUAD).fill(null),
			Array(MAX_PLAYERS_PER_SQUAD).fill(null)
		],
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
	for (const squad of listState.squads) {
		const index = squad.findIndex(member => member?.id === userId)
		if (index >= 0) squad.splice(index, 1)
		while (squad.length < MAX_PLAYERS_PER_SQUAD) squad.push(null)
	}
	const substituteIndex = listState.substitutes.findIndex(member => member.id === userId)
	if (substituteIndex >= 0) listState.substitutes.splice(substituteIndex, 1)

	const reaction = m.msg.text
	const squadIndex = reaction === '👍' ? 0 : reaction === '❤️' ? 1 : reaction === '😮' ? 2 : reaction === '😂' ? 3 : -1
	if (squadIndex >= 0) {
		const slot = listState.squads[squadIndex].findIndex(member => !member)
		if (slot >= 0) listState.squads[squadIndex][slot] = { id: userId, name: await getUserName(m, conn) }
	} else if (reaction === '🙋' && listState.substitutes.length < 4) {
		listState.substitutes.push({ id: userId, name: await getUserName(m, conn) })
	}

	await conn.sendMessage(m.chat, { text: buildList(listState), edit: listState.messageKey })
}

handler.command = ['16vs16', '16v16']
handler.tags = ['listas']
handler.help = ['16vs16 <color>/<hora>']

export default handler
