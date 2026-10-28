import { getListParticipant, getListMentionJids } from '../lib/list-participant.js'
import { getListSelection, replaceListWithOptions, sendListWithOptionsAndRoster } from '../lib/list-interaction.js'

const activeLists = new Map()
const slotEmojis = ['🦅', '🥷', '🥷', '🥷']
const LIST_OPTIONS = [
	{ id: 'ffinfinite_titular', label: '👍 𝐓𝐈𝐓𝐔𝐋𝐀𝐑' },
	{ id: 'ffinfinite_substitute', label: '🙋 𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄' },
	{ id: 'ffinfinite_leave', label: '😢 𝐒𝐀𝐋𝐈𝐑' }
]

const USAGE_MESSAGE = `⚠️ *Formato incorrecto.*

> *.infinito <hora>*`

const buildList = ({ colorText, mexicoTime, colombiaTime, squad, substitutes }) => `
♾️ *𝙇𝙄𝙎𝙏𝘼 𝙄𝙉𝙁𝙄𝙉𝙄𝙏𝙊* ♾️

🕘◦ *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽◦ *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : ' '}
🇨🇴◦ *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : ' '}


          _*𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀*_
${squad.map((member, index) => `${slotEmojis[index]}•${member?.label || ''}`).join('\n')}

          _*𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄𝐒*_

${substitutes.map(member => `ㅤ.ೃ.𖣓 ${member?.label || ''}`).join('\n')}

`

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
		squad: Array(4).fill(null),
		substitutes: []
	}
	const sent = await sendListWithOptionsAndRoster(conn, m.chat, buildList(listState), LIST_OPTIONS, m)
	listState.messageKey = sent.key
	activeLists.set(m.chat, listState)
}

handler.all = async (m, { conn }) => {
	const listState = activeLists.get(m.chat)
	if (!listState) return
	const selection = getListSelection(m, listState.messageKey, 'ffinfinite_')
	if (!LIST_OPTIONS.some(option => option.id === selection)) return

	const userId = m.sender
	if (!userId) return
	if (selection === 'ffinfinite_titular'
		&& listState.squad.every(member => member && member.id !== userId)) return
	if (selection === 'ffinfinite_substitute'
		&& listState.substitutes.length >= 2
		&& !listState.substitutes.some(member => member.id === userId)) return

	const previousIndex = listState.squad.findIndex(member => member?.id === userId)
	if (previousIndex >= 0) listState.squad.splice(previousIndex, 1)
	const substituteIndex = listState.substitutes.findIndex(member => member?.id === userId)
	if (substituteIndex >= 0) listState.substitutes.splice(substituteIndex, 1)
	while (listState.squad.length < 4) listState.squad.push(null)

	if (selection === 'ffinfinite_titular') {
		const slotIndex = listState.squad.findIndex(member => !member)
		if (slotIndex >= 0) listState.squad[slotIndex] = await getListParticipant(m, conn)
	} else if (selection === 'ffinfinite_substitute') {
		listState.substitutes.push(await getListParticipant(m, conn))
	}

	const previousMessageKey = listState.messageKey
	const sent = await replaceListWithOptions(
		conn, m.chat, buildList(listState), LIST_OPTIONS, m, previousMessageKey, getListMentionJids(listState)
	)
	listState.messageKey = sent.key
}

handler.command = ['infinito', 'lista-infinito']
handler.tags = ['listas']
handler.help = ['infinito <hora>']

export default handler