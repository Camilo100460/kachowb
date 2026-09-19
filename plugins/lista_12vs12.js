const activeLists = new Map()
const MAX_PLAYERS_PER_SQUAD = 4
const slotEmojis = ['🦅', '🪶', '🏹', '🛡️']

const getUserName = async (m, conn) => {
	if (m.pushName?.trim()) return m.pushName.trim()
	const contactName = await conn.getName?.(m.sender).catch?.(() => '')
	return contactName || `@${m.sender?.split('@')[0] || 'usuario'}`
}

const renderPlayers = squad => squad
	.map((member, index) => `${slotEmojis[index % slotEmojis.length]}•${member?.name || ''}`)
	.join('\n')

const buildList = ({ colorText, mexicoTime, colombiaTime, squads }) => `
🦅 *𝙇𝙄𝙎𝙏𝘼 𝟭𝟮𝙑𝙎𝟭𝟮* 🪶

🕘 *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽 *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : '________'}
🇨🇴 *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : '________'}

🎨 *𝐂𝐎𝐋𝐎𝐑:* ${colorText}

          _*𝐄𝐐𝐔𝐈𝐏𝐎 1*_ 

${renderPlayers(squads[0])}

          _*𝐄𝐐𝐔𝐈𝐏𝐎 2*_

${renderPlayers(squads[1])}

		  _*𝐄𝐐𝐔𝐈𝐏𝐎 3*_

${renderPlayers(squads[2])}

		  _*𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄𝐒*_

ㅤ.ೃ.𖣓
ㅤ.ೃ.𖣓

📝 *𝐈𝐍𝐒𝐂𝐑𝐈𝐏𝐂𝐈𝐎𝐍𝐄𝐒*
👍 Equipo 1  |  ❤️ Equipo 2  |  😂 Equipo 3
😢 Salir de la lista`

const handler = async (m, { conn, text }) => {
	const [colorValue = '', timeValue = ''] = (text?.trim() || '').split('/')
	const color = colorValue.trim()
	const time = timeValue.trim()
	const match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)

	const mexicoTime = match ? `${String(Number(match[1])).padStart(2, '0')}:${match[2]}` : ''
	const colombiaTime = match
		? `${String((Number(match[1]) + 1) % 24).padStart(2, '0')}:${match[2]}`
		: ''

	const listState = {
		colorText: color || '_______________',
		mexicoTime,
		colombiaTime,
		squads: [
			Array(MAX_PLAYERS_PER_SQUAD).fill(null),
			Array(MAX_PLAYERS_PER_SQUAD).fill(null),
			Array(MAX_PLAYERS_PER_SQUAD).fill(null)
		]
	}
	const sent = await conn.sendMessage(m.chat, { text: buildList(listState) }, { quoted: m })
	listState.messageKey = sent.key
	activeLists.set(m.chat, listState)
}

handler.all = async (m, { conn }) => {
	if (m.mtype !== 'reactionMessage' || !m.msg?.key) return

	const listState = activeLists.get(m.chat)
	if (!listState || m.msg.key.id !== listState.messageKey.id) return

	const squadIndex = m.msg.text === '👍'
		? 0
		: m.msg.text === '❤️'
			? 1
			: m.msg.text === '😂'
				? 2
				: -1
	const userId = m.sender
	if (!userId) return

	for (const squad of listState.squads) {
		const previousIndex = squad.findIndex(member => member?.id === userId)
		if (previousIndex >= 0) squad.splice(previousIndex, 1)
		while (squad.length < MAX_PLAYERS_PER_SQUAD) squad.push(null)
	}

	if (squadIndex < 0) {
		await conn.sendMessage(m.chat, { text: buildList(listState), edit: listState.messageKey })
		return
	}

	const slotIndex = listState.squads[squadIndex].findIndex(member => !member)
	if (slotIndex < 0) return

	listState.squads[squadIndex][slotIndex] = {
		id: userId,
		name: await getUserName(m, conn)
	}

	await conn.sendMessage(m.chat, {
		text: buildList(listState),
		silent: true,
		edit: listState.messageKey
	})
}

handler.command = ['12vs12', '12v12']
handler.tags = ['listas']
handler.help = ['12vs12 <color>/<hora>']

export default handler
