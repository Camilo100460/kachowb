import { getListParticipant, getListMentionJids } from '../lib/list-participant.js'

const activeLists = new Map()
const slotEmojis = ['🦅', '🥷', '🥷', '🥷', '🥷', '🥷']
const BUTTON_IDS = ['ffinfinite6_titular', 'ffinfinite6_substitute', 'ffinfinite6_leave']

const USAGE_MESSAGE = `⚠️ *Formato incorrecto.*

> *.infinito6vs6 <hora>*`

const renderSquad = squad => squad
	.map((member, index) => `${slotEmojis[index]}•${member?.label || ''}`)
	.join('\n')

const buildList = ({ colorText, mexicoTime, colombiaTime, squad, substitutes }) => `
♾️ *𝙇𝙄𝙎𝙏𝘼 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙊 𝟲𝙑𝙎𝟲* ♾️

🕘◦ *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽◦ *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : ' '}
🇨🇴◦ *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : ' '}


          _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀*_
${renderSquad(squad)}

          _*𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄𝐒*_

${substitutes.map(member => `ㅤ.ೃ.𖣓 ${member?.label || ''}`).join('\n')}

`

const sendListWithButtons = async (conn, chat, listState, quoted) => {
	const listMessage = await conn.sendMessage(chat, {
		text: buildList(listState),
		contextInfo: { mentionedJid: getListMentionJids(listState) }
	}, { quoted })
	const buttonsMessage = await conn.sendButtonsLia(
		chat,
		'𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀 • Elige una opción',
		'𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀',
		[
			{ text: '👍 𝐓𝐈𝐓𝐔𝐋𝐀𝐑', id: 'ffinfinite6_titular' },
			{ text: '🙋 𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄', id: 'ffinfinite6_substitute' },
			{ text: '😢 𝐒𝐀𝐋𝐈𝐑', id: 'ffinfinite6_leave' }
		],
		listMessage
	)
	return { listMessageKey: listMessage.key, buttonsMessageKey: buttonsMessage.key }
}

const handler = async (m, { conn, text }) => {
	const time = text?.trim() || ''
	const match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)

	// Falta la hora o la hora no es válida
	if (!match) {
		return conn.sendMessage(m.chat, { text: USAGE_MESSAGE }, { quoted: m })
	}

	const mexicoTime = `${String(Number(match[1])).padStart(2, '0')}:${match[2]}`
	const colombiaTime = `${String((Number(match[1]) + 1) % 24).padStart(2, '0')}:${match[2]}`
	const listState = {
		colorText: '_______________',
		mexicoTime,
		colombiaTime,
		squad: Array(6).fill(null),
		substitutes: []
	}

	const sent = await sendListWithButtons(conn, m.chat, listState, m)
	listState.messageKey = sent.listMessageKey
	listState.buttonsMessageKey = sent.buttonsMessageKey
	activeLists.set(m.chat, listState)
}

handler.all = async (m, { conn }) => {
	const buttonId = m.text?.trim()
	if (!BUTTON_IDS.includes(buttonId)) return
	const listState = activeLists.get(m.chat)
	const responseTo = m.quoted?.id
		|| m.msg?.contextInfo?.stanzaId
		|| m.message?.interactiveResponseMessage?.contextInfo?.stanzaId
	if (!listState || !responseTo || responseTo !== listState.buttonsMessageKey?.id) return

	const userId = m.sender
	if (!userId) return
	if (buttonId === 'ffinfinite6_titular'
		&& listState.squad.every(member => member && member.id !== userId)) return
	if (buttonId === 'ffinfinite6_substitute'
		&& listState.substitutes.length >= 2
		&& !listState.substitutes.some(member => member.id === userId)) return

	const previousIndex = listState.squad.findIndex(member => member?.id === userId)
	if (previousIndex >= 0) listState.squad.splice(previousIndex, 1)
	const substituteIndex = listState.substitutes.findIndex(member => member?.id === userId)
	if (substituteIndex >= 0) listState.substitutes.splice(substituteIndex, 1)
	while (listState.squad.length < 6) listState.squad.push(null)

	if (buttonId === 'ffinfinite6_titular') {
		const slotIndex = listState.squad.findIndex(member => !member)
		if (slotIndex >= 0) {
			listState.squad[slotIndex] = await getListParticipant(m, conn)
		}
	} else if (buttonId === 'ffinfinite6_substitute') {
		listState.substitutes.push(await getListParticipant(m, conn))
	}

	const previousMessageKey = listState.messageKey
	const previousButtonsMessageKey = listState.buttonsMessageKey
	const sent = await sendListWithButtons(conn, m.chat, listState, m)
	listState.messageKey = sent.listMessageKey
	listState.buttonsMessageKey = sent.buttonsMessageKey
	for (const oldMessageKey of [previousButtonsMessageKey, previousMessageKey]) {
		if (!oldMessageKey?.id) continue
		try {
			await conn.sendMessage(m.chat, { delete: oldMessageKey })
		} catch (error) {
			console.warn(`[infinito6vs6] No se pudo reemplazar el mensaje anterior: ${error.message}`)
		}
	}
}

handler.command = ['infinito6vs6', 'infinito-6vs6']
handler.tags = ['listas']
handler.help = ['infinito6vs6 <hora>']

export default handler