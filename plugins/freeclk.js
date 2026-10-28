import { getListMentionJids } from '../lib/list-participant.js'

const activeLists = new Map()
const slotEmojis = ['🦅', '🥷', '🥷', '🥷']

const USAGE_MESSAGE = `⚠️ *Formato incorrecto.*

> _*.clk <hora>*_`

const normalizeParticipantJid = (value, type) => {
	if (!value) return ''
	const jid = String(value)
	if (jid.includes('@')) return jid
	const digits = jid.replace(/\D/g, '')
	return digits ? `${digits}@${type}` : ''
}

const getNamedListParticipant = async (m, conn) => {
	const groupMetadata = await conn.groupMetadata(m.chat)
	const senderJids = new Set([
		m.sender,
		m.participant,
		m.key?.participant,
		m.key?.participantAlt,
		m.key?.remoteJidAlt,
		m.senderPn,
		m.participantPn,
		m.participantAlt
	].filter(Boolean).map(String))
	const groupParticipant = (groupMetadata.participants || []).find(participant => {
		const participantJids = [
			participant.id,
			participant.jid,
			normalizeParticipantJid(participant.lid, 'lid'),
			normalizeParticipantJid(participant.phoneNumber, 's.whatsapp.net')
		].filter(Boolean).map(String)
		return participantJids.some(jid => senderJids.has(jid))
	})
	const mentionJid = groupParticipant?.id || m.sender
	const mentionId = mentionJid.split('@')[0].split(':')[0]

	return {
		id: m.sender,
		mentionJid,
		label: `@${mentionId}`
	}
}

const buildList = ({ colorText, mexicoTime, colombiaTime, squad, substitutes }) => `
🦅 *𝙇𝙄𝙎𝙏𝘼 𝘾𝙇𝙆* 🪶

🕘◦ *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽◦ *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : ' '}
🇨🇴◦ *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : ' '}


          _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀*_
${squad.map((member, index) => `${slotEmojis[index]}• ${member?.label || ''}`).join('\n')}

          _*𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄𝐒*_

${substitutes.map(member => `ㅤ.ೃ.𖣓 ${member?.label || ''}`).join('\n')}`

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
			{ text: '👍 𝐓𝐈𝐓𝐔𝐋𝐀𝐑', id: 'clk_titular' },
			{ text: '🙋 𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄', id: 'clk_suplente' },
			{ text: '😢 𝐒𝐀𝐋𝐈𝐑', id: 'clk_salir' }
		],
		listMessage
	)
	return { listMessageKey: listMessage.key, buttonsMessageKey: buttonsMessage.key }
}

const handler = async (m, { conn, text }) => {
	const input = text?.trim() || ''
	const time = (input.includes('/') ? input.slice(input.lastIndexOf('/') + 1) : input).trim()

	// Falta la hora: se envía el mensaje de cómo usar el comando
	if (!time) {
		return conn.sendMessage(m.chat, { text: USAGE_MESSAGE }, { quoted: m })
	}

	const match = time.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
	if (time && !match) {
		return conn.sendMessage(m.chat, {
			text: 'Formato de hora inválido. Usa .clk HH:MM, por ejemplo: .clk 21:30.'
		}, { quoted: m })
	}
	const mexicoTime = match ? `${String(Number(match[1])).padStart(2, '0')}:${match[2]}` : ''
	const colombiaTime = match ? `${String((Number(match[1]) + 1) % 24).padStart(2, '0')}:${match[2]}` : ''
	const listState = {
		mexicoTime,
		colombiaTime,
		squad: Array(4).fill(null),
		substitutes: []
	}
	const sent = await sendListWithButtons(conn, m.chat, listState, m)
	listState.messageKey = sent.listMessageKey
	listState.buttonsMessageKey = sent.buttonsMessageKey
	activeLists.set(m.chat, listState)
}

handler.all = async (m, { conn }) => {
	const buttonId = m.text?.trim()
	if (!['clk_titular', 'clk_suplente', 'clk_salir'].includes(buttonId)) return
	const listState = activeLists.get(m.chat)
	const responseTo = m.quoted?.id || m.msg?.contextInfo?.stanzaId || m.message?.interactiveResponseMessage?.contextInfo?.stanzaId
	if (!listState || !responseTo || responseTo !== listState.buttonsMessageKey?.id) return

	const userId = m.sender
	if (!userId) return
	const previousIndex = listState.squad.findIndex(member => member?.id === userId)
	if (previousIndex >= 0) listState.squad.splice(previousIndex, 1)
	const substituteIndex = listState.substitutes.findIndex(member => member?.id === userId)
	if (substituteIndex >= 0) listState.substitutes.splice(substituteIndex, 1)
	while (listState.squad.length < 4) listState.squad.push(null)

	if (buttonId === 'clk_titular') {
		const slotIndex = listState.squad.findIndex(member => !member)
		if (slotIndex >= 0) listState.squad[slotIndex] = await getNamedListParticipant(m, conn)
	} else if (buttonId === 'clk_suplente' && listState.substitutes.length < 2) {
		listState.substitutes.push(await getNamedListParticipant(m, conn))
	}

	const previousListMessageKey = listState.messageKey
	const previousButtonsMessageKey = listState.buttonsMessageKey
	const sent = await sendListWithButtons(conn, m.chat, listState, m)
	listState.messageKey = sent.listMessageKey
	listState.buttonsMessageKey = sent.buttonsMessageKey
	for (const previousMessageKey of [previousButtonsMessageKey, previousListMessageKey]) {
		if (!previousMessageKey?.id) continue
		try {
			await conn.sendMessage(m.chat, { delete: previousMessageKey })
		} catch (error) {
			console.warn(`[clk] No se pudo reemplazar el mensaje anterior: ${error.message}`)
		}
	}
}

handler.command = ['clk']
handler.tags = ['listas']
handler.help = ['clk [HH:MM]']

export default handler