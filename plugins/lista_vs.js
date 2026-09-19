const activeLists = new Map()
const slotEmojis = ['🦅', '🪶', '🏹', '🛡️']

const getUserName = async (m, conn) => {
	if (m.pushName?.trim()) return m.pushName.trim()
	const contactName = await conn.getName?.(m.sender).catch?.(() => '')
	return contactName || `@${m.sender?.split('@')[0] || 'usuario'}`
}

const buildList = ({ colorText, mexicoTime, colombiaTime, squads }) => `
🦅 *𝙇𝙄𝙎𝙏𝘼 𝘾𝙐𝘼𝘿𝙍𝙄𝙇𝘼𝙏𝙀𝙍𝙊* 🪶

🕘 *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽 *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : '________'}
🇨🇴 *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : '________'}

🎨 *𝐂𝐎𝐋𝐎𝐑:* ${colorText}
🎲 *𝐂𝐀𝐒𝐈𝐋𝐋𝐀𝐒:* 4, 5 y 6

		  _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 1*_

${squads[0].map((member, index) => `${slotEmojis[index]}•${member?.name || ''}`).join('\n')}

		  _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 2*_

${squads[1].map((member, index) => `${slotEmojis[index]}•${member?.name || ''}`).join('\n')}

		  _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 3*_

${squads[2].map((member, index) => `${slotEmojis[index]}•${member?.name || ''}`).join('\n')}

		  _*𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄𝐒*_

ㅤ.ೃ.𖣓
ㅤ.ೃ.𖣓

📝 *𝐈𝐍𝐒𝐂𝐑𝐈𝐏𝐂𝐈𝐎𝐍𝐄𝐒*
👍 Escuadra 1  |  ❤️ Escuadra 2  |  😂 Escuadra 3
😢 Salir de la lista`

const handler = async (m, { conn, text, usedPrefix, command }) => {
	const [colorValue = '', timeValue = ''] = (text?.trim() || '').split('/')
	const color = colorValue.trim()
	const time = timeValue.trim()
	const match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)

	const mexicoTime = match ? `${String(Number(match[1])).padStart(2, '0')}:${match[2]}` : ''
	const colombiaTime = match
		? `${String((Number(match[1]) + 1) % 24).padStart(2, '0')}:${match[2]}`
		: ''
	const colorText = color || '_______________'
	const scheduleText = match ? `${mexicoTime} 🇲🇽  |  ${colombiaTime} 🇨🇴` : '_______________'

	const listState = {
		colorText,
		mexicoTime,
		colombiaTime,
		squads: [[], [], []]
	}
	const emptySquads = listState.squads.map(() => Array(4).fill(null))
	listState.squads = emptySquads
	const sent = await conn.sendMessage(m.chat, { text: buildList(listState) }, { quoted: m })
	listState.messageKey = sent.key
	activeLists.set(m.chat, listState)
}

handler.all = async (m, { conn }) => {
	if (m.mtype !== 'reactionMessage' || !m.msg?.key || !m.msg.text) return

	const listState = activeLists.get(m.chat)
	if (!listState || m.msg.key.id !== listState.messageKey.id) return

	const reaction = m.msg.text
	const squadIndex = reaction === '👍'
		? 0
		: reaction === '❤️'
			? 1
			: reaction === '😂'
				? 2
				: -1

	const userId = m.sender
	if (!userId) return
	for (const squad of listState.squads) {
		const previousIndex = squad.findIndex(member => member?.id === userId)
		if (previousIndex >= 0) squad.splice(previousIndex, 1)
		while (squad.length < slotEmojis.length) squad.push(null)
	}
	if (squadIndex < 0) {
		await conn.sendMessage(m.chat, { text: buildList(listState), edit: listState.messageKey })
		return
	}

	const userName = await getUserName(m, conn)
	const slotIndex = listState.squads[squadIndex].findIndex(member => !member)
	if (slotIndex < 0) return

	listState.squads[squadIndex][slotIndex] = { id: userId, name: userName }
	await conn.sendMessage(m.chat, {
		text: buildList(listState),
		silent: true,
		edit: listState.messageKey
	})
}

handler.command = ['cuadrilatero']
handler.tags = ['listas']
handler.help = ['cuadrilatero <color>/<hora>']

export default handler
