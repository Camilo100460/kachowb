import { getListParticipant, getListMentionJids } from '../lib/list-participant.js'

const activeLists = new Map()
const MAX_PLAYERS_PER_SQUAD = 4
const slotEmojis = ['🦅', '🥷', '🥷', '🥷']
const REACTION_SQUADS = new Map([
	['👍', 0],
	['❤️', 1],
	['😂', 2]
])

const TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/

const USAGE_MESSAGE = `⚠️ *Formato incorrecto.*

> *.12vs12 <color>/<hora>*`

const renderPlayers = squad => squad
	.map((member, index) => `${slotEmojis[index % slotEmojis.length]}•${member?.label || ''}`)
	.join('\n')

const buildList = ({ colorText, mexicoTime, colombiaTime, squads }) => `🦅 *𝙇𝙄𝙎𝙏𝘼 𝟭𝟮𝙑𝙎𝟭𝟮* 🪶

🕘◦ *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽◦ *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : ' '}
🇨🇴◦*𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : ' '}
🎨◦ *𝐂𝐎𝐋𝐎𝐑:* ${colorText}

          _*𝐄𝐐𝐔𝐈𝐏𝐎 1*_ 
${renderPlayers(squads[0])}

          _*𝐄𝐐𝐔𝐈𝐏𝐎 2*_
${renderPlayers(squads[1])}

		  _*𝐄𝐐𝐔𝐈𝐏𝐎 3*_
${renderPlayers(squads[2])}

		  _*𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄𝐒*_

ㅤ.ೃ.𖣓
ㅤ.ೃ.𖣓

> 𝘙𝘦𝘢𝘤𝘤𝘪𝘰𝘯𝘢 𝘢 𝘦𝘴𝘵𝘦 𝘮𝘦𝘯𝘴𝘢𝘫𝘦 𝘱𝘢𝘳𝘢 𝘪𝘯𝘴𝘤𝘳𝘪𝘣𝘪𝘳𝘵𝘦.📝`

const sendRoster = (conn, chat, listState, quoted) => conn.sendMessage(chat, {
	text: buildList(listState),
	contextInfo: { mentionedJid: getListMentionJids(listState) }
}, { quoted })

const handler = async (m, { conn, text }) => {
	const input = text?.trim() || ''
	const parts = input.split('/')

	// Debe haber exactamente un "/" => dos partes: color y hora
	if (parts.length !== 2) {
		return conn.sendMessage(m.chat, { text: USAGE_MESSAGE }, { quoted: m })
	}

	const color = parts[0].trim()
	const time = parts[1].trim()
	const match = time.match(TIME_REGEX)

	// Falta el color, falta la hora o la hora no es válida
	if (!color || !time || !match) {
		return conn.sendMessage(m.chat, { text: USAGE_MESSAGE }, { quoted: m })
	}

	const mexicoTime = `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`
	const colombiaTime = `${String((Number(match[1]) + 1) % 24).padStart(2, '0')}:${match[2]}`

	const listState = {
		colorText: color,
		mexicoTime,
		colombiaTime,
		squads: [
			Array(MAX_PLAYERS_PER_SQUAD).fill(null),
			Array(MAX_PLAYERS_PER_SQUAD).fill(null),
			Array(MAX_PLAYERS_PER_SQUAD).fill(null)
		]
	}
	const sent = await sendRoster(conn, m.chat, listState, m)
	listState.messageKey = sent.key
	activeLists.set(m.chat, listState)
}

handler.all = async (m, { conn }) => {
	const reaction = m.message?.reactionMessage
	if (!reaction) return
	const listState = activeLists.get(m.chat)
	if (!listState) return
	if (reaction.key?.id !== listState.messageKey?.id) return

	const squadIndex = REACTION_SQUADS.get(reaction.text)
	const leaving = reaction.text === '😢' || reaction.text === ''
	if (squadIndex === undefined && !leaving) return
	const userId = m.sender
	if (!userId) return

	if (squadIndex !== undefined) {
		const occupiedByOther = listState.squads[squadIndex].every(member => member && member.id !== userId)
		if (occupiedByOther) return
	}

	for (const squad of listState.squads) {
		const previousIndex = squad.findIndex(member => member?.id === userId)
		if (previousIndex >= 0) squad.splice(previousIndex, 1)
		while (squad.length < MAX_PLAYERS_PER_SQUAD) squad.push(null)
	}

	if (squadIndex !== undefined) {
		const slotIndex = listState.squads[squadIndex].findIndex(member => !member)
		if (slotIndex >= 0) listState.squads[squadIndex][slotIndex] = await getListParticipant(m, conn)
	}

	const previousMessageKey = listState.messageKey
	const sent = await sendRoster(conn, m.chat, listState)
	listState.messageKey = sent.key
	if (previousMessageKey?.id) {
		try {
			await conn.sendMessage(m.chat, { delete: previousMessageKey })
		} catch (error) {
			console.warn(`[12vs12] No se pudo reemplazar el roster anterior: ${error.message}`)
		}
	}
}

handler.command = ['12vs12', '12v12']
handler.tags = ['listas']
handler.help = ['12vs12 <color>/<hora>']

export default handler
