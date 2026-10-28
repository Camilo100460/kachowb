import { getListParticipant, getListMentionJids } from '../lib/list-participant.js'

const activeLists = new Map()
const MAX_PLAYERS_PER_SQUAD = 4
const MAX_SUBSTITUTES = 4
const MIN_SUBSTITUTE_LINES = 2
const SUBSTITUTE_SYMBOL = 'ㅤ.ೃ.𖣓'
const slotEmojis = ['🦅', '🥷', '🥷', '🥷',]

// Quita variantes de género, tonos de piel y selectores para comparar emojis
const normalizeEmoji = emoji => (emoji || '')
	.replace(/[\u{1F3FB}-\u{1F3FF}\u200D\u2640\u2642\uFE0F]/gu, '')

const REACTION_SQUADS = new Map([
	['👍', 0],
	['❤️', 1],
	['😮', 2],
	['😂', 3]
].map(([emoji, index]) => [normalizeEmoji(emoji), index]))
const SUBSTITUTE_REACTION = normalizeEmoji('🙋')
const LEAVE_REACTION = normalizeEmoji('😢')

const TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/

const USAGE_MESSAGE = `⚠️ *Formato incorrecto.*

> *.16vs16 <color>/<hora>*`

const renderSquad = squad => squad
	.map((member, index) => `${slotEmojis[index % slotEmojis.length]}•${member?.label || ''}`)
	.join('\n')

// Cada suplente va al frente del símbolo; siempre se muestran mínimo 2 líneas
const renderSubstitutes = substitutes => Array
	.from({ length: Math.max(MIN_SUBSTITUTE_LINES, substitutes.length) }, (_, index) => {
		const member = substitutes[index]
		return member ? `${SUBSTITUTE_SYMBOL} ${member.label}` : SUBSTITUTE_SYMBOL
	})
	.join('\n')

const buildList = ({ colorText, mexicoTime, colombiaTime, squads, substitutes }) => `
🦅 *𝙇𝙄𝙎𝙏𝘼 𝟭𝟲𝙑𝙎𝟭𝟲* 🪶

🕘◦ *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽◦ *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : ' '}
🇨🇴◦ *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : ' '}
🎨◦ *𝐂𝐎𝐋𝐎𝐑:* ${colorText}

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
			Array(MAX_PLAYERS_PER_SQUAD).fill(null),
			Array(MAX_PLAYERS_PER_SQUAD).fill(null)
		],
		substitutes: []
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

	// Para depurar, descomenta esta línea y mira qué texto llega realmente:
	// console.log('[16vs16] reacción recibida:', JSON.stringify(reaction.text))

	const reactionText = normalizeEmoji(reaction.text)
	const squadIndex = REACTION_SQUADS.get(reactionText)
	const isSubstitute = reactionText === SUBSTITUTE_REACTION
	const isLeaving = reactionText === LEAVE_REACTION || reactionText === ''
	if (squadIndex === undefined && !isSubstitute && !isLeaving) return
	const userId = m.sender
	if (!userId) return
	if (squadIndex !== undefined && listState.squads[squadIndex].every(member => member && member.id !== userId)) return
	if (isSubstitute
		&& listState.substitutes.length >= MAX_SUBSTITUTES
		&& !listState.substitutes.some(member => member.id === userId)) return

	for (const squad of listState.squads) {
		const index = squad.findIndex(member => member?.id === userId)
		if (index >= 0) squad.splice(index, 1)
		while (squad.length < MAX_PLAYERS_PER_SQUAD) squad.push(null)
	}
	const substituteIndex = listState.substitutes.findIndex(member => member.id === userId)
	if (substituteIndex >= 0) listState.substitutes.splice(substituteIndex, 1)

	if (squadIndex !== undefined) {
		const slot = listState.squads[squadIndex].findIndex(member => !member)
		if (slot >= 0) listState.squads[squadIndex][slot] = await getListParticipant(m, conn)
	} else if (isSubstitute) {
		listState.substitutes.push(await getListParticipant(m, conn))
	}

	const previousMessageKey = listState.messageKey
	const sent = await sendRoster(conn, m.chat, listState)
	listState.messageKey = sent.key
	if (previousMessageKey?.id) {
		try {
			await conn.sendMessage(m.chat, { delete: previousMessageKey })
		} catch (error) {
			console.warn(`[16vs16] No se pudo reemplazar el roster anterior: ${error.message}`)
		}
	}
}

handler.command = ['16vs16', '16v16']
handler.tags = ['listas']
handler.help = ['16vs16 <color>/<hora>']

export default handler
