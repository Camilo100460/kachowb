import { getListParticipant, getListMentionJids } from '../lib/list-participant.js'

const activeLists = new Map()
const pendingLists = new Map()
const slotEmojis = ['🦅', '🥷', '🥷', '🥷']
const REACTION_SQUADS = new Map([
	['👍', 0],
	['❤️', 1],
	['😂', 2]
])

const CASILLA_OPTIONS = new Map([
	['cuadrilatero_casillas_1', '1, 2 y 3'],
	['cuadrilatero_casillas_2', '4, 5 y 6'],
	['cuadrilatero_casillas_3', '7, 8 y 9'],
	['cuadrilatero_casillas_4', '10, 11 y 12']
])

const USAGE_MESSAGE = `⚠️ *Formato incorrecto.*

> _*.cuadrilatero <color>/<hora>*_`

const buildList = ({ colorText, mexicoTime, colombiaTime, casillas, squads }) => `
🦅 *𝙇𝙄𝙎𝙏𝘼 𝘾𝙐𝘼𝘿𝙍𝙄𝙇𝘼𝙏𝙀𝙍𝙊* 🪶

🕘 *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽 *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : ' '}
🇨🇴 *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : ' '}
🎨 *𝐂𝐎𝐋𝐎𝐑:* ${colorText}
🎲 *𝐂𝐀𝐒𝐈𝐋𝐋𝐀𝐒:* ${casillas}

		  _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 1*_
${squads[0].map((member, index) => `${slotEmojis[index]}•${member?.label || ''}`).join('\n')}

		  _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 2*_
${squads[1].map((member, index) => `${slotEmojis[index]}•${member?.label || ''}`).join('\n')}

		  _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 3*_
${squads[2].map((member, index) => `${slotEmojis[index]}•${member?.label || ''}`).join('\n')}

		  _*𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄𝐒*_

ㅤ.ೃ.𖣓
ㅤ.ೃ.𖣓

> 𝘙𝘦𝘢𝘤𝘤𝘪𝘰𝘯𝘢 𝘢 𝘦𝘴𝘵𝘦 𝘮𝘦𝘯𝘴𝘢𝘫𝘦 𝘱𝘢𝘳𝘢 𝘪𝘯𝘴𝘤𝘳𝘪𝘣𝘪𝘳𝘵𝘦.📝`

const sendRoster = (conn, chat, listState, quoted) => conn.sendMessage(chat, {
	text: buildList(listState),
	contextInfo: { mentionedJid: getListMentionJids(listState) }
}, { quoted })

const sendCasillasButtons = (conn, chat, quoted) => conn.sendButtonsLia(
	chat,
	'𝐂𝐀𝐒𝐈𝐋𝐋𝐀𝐒',
	'_*• Elige una opción*_📝',
	[
		{ text: '𝐂𝐀𝐒𝐈𝐋𝐋𝐀𝐒 1, 2 y 3', id: 'cuadrilatero_casillas_1' },
		{ text: '𝐂𝐀𝐒𝐈𝐋𝐋𝐀𝐒 4, 5 y 6', id: 'cuadrilatero_casillas_2' },
		{ text: '𝐂𝐀𝐒𝐈𝐋𝐋𝐀𝐒 7, 8 y 9', id: 'cuadrilatero_casillas_3' },
		{ text: '𝐂𝐀𝐒𝐈𝐋𝐋𝐀𝐒 10, 11 y 12', id: 'cuadrilatero_casillas_4' }
	],
	quoted
)

const handler = async (m, { conn, text, usedPrefix, command }) => {
	const input = text?.trim() || ''
	const parts = input.split('/')

	// Debe haber exactamente un "/" => dos partes: color y hora
	if (parts.length !== 2) {
		return conn.sendMessage(m.chat, { text: USAGE_MESSAGE }, { quoted: m })
	}

	const color = parts[0].trim()
	const time = parts[1].trim()
	const match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)

	// Falta el color, falta la hora o la hora no es válida
	if (!color || !time || !match) {
		return conn.sendMessage(m.chat, { text: USAGE_MESSAGE }, { quoted: m })
	}

	const mexicoTime = `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`
	const colombiaTime = `${String((Number(match[1]) + 1) % 24).padStart(2, '0')}:${match[2]}`

	// Primero solo se envía el mensaje con los botones; la lista se envía al elegir las casillas
	const buttonsMessage = await sendCasillasButtons(conn, m.chat, m)
	pendingLists.set(m.chat, {
		colorText: color,
		mexicoTime,
		colombiaTime,
		buttonsMessageKey: buttonsMessage.key
	})
}

handler.all = async (m, { conn }) => {
	// Botones de casillas: crean la lista una sola vez
	const buttonId = m.text?.trim()
	if (CASILLA_OPTIONS.has(buttonId)) {
		const pending = pendingLists.get(m.chat)
		const responseTo = m.quoted?.id
			|| m.msg?.contextInfo?.stanzaId
			|| m.message?.interactiveResponseMessage?.contextInfo?.stanzaId
		if (!pending || !responseTo || responseTo !== pending.buttonsMessageKey?.id) return

		pendingLists.delete(m.chat)
		const listState = {
			colorText: pending.colorText,
			mexicoTime: pending.mexicoTime,
			colombiaTime: pending.colombiaTime,
			casillas: CASILLA_OPTIONS.get(buttonId),
			squads: [
				Array(slotEmojis.length).fill(null),
				Array(slotEmojis.length).fill(null),
				Array(slotEmojis.length).fill(null)
			]
		}
		const sent = await sendRoster(conn, m.chat, listState, m)
		listState.messageKey = sent.key
		activeLists.set(m.chat, listState)

		try {
			await conn.sendMessage(m.chat, { delete: pending.buttonsMessageKey })
		} catch (error) {
			console.warn(`[cuadrilatero] No se pudo borrar el mensaje de botones: ${error.message}`)
		}
		return
	}

	// Reacciones de escuadras
	const reaction = m.message?.reactionMessage
	if (!reaction) return
	const listState = activeLists.get(m.chat)
	if (!listState) return
	if (reaction.key?.id !== listState.messageKey?.id) return

	const squadIndex = REACTION_SQUADS.get(reaction.text)
	const isLeaving = reaction.text === '😢' || reaction.text === ''
	if (squadIndex === undefined && !isLeaving) return

	const userId = m.sender
	if (!userId) return
	if (squadIndex !== undefined && listState.squads[squadIndex].every(member => member && member.id !== userId)) return
	for (const squad of listState.squads) {
		const previousIndex = squad.findIndex(member => member?.id === userId)
		if (previousIndex >= 0) squad.splice(previousIndex, 1)
		while (squad.length < slotEmojis.length) squad.push(null)
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
			console.warn(`[cuadrilatero] No se pudo reemplazar el roster anterior: ${error.message}`)
		}
	}
}

handler.command = ['cuadrilatero']
handler.tags = ['listas']
handler.help = ['cuadrilatero <color>/<hora>']

export default handler