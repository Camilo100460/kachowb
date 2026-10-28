import { getListParticipant, getListMentionJids } from '../lib/list-participant.js'

const activeLists = new Map()
const slotEmojis = ['🦅', '🥷', '🥷', '🥷']
const MAX_SUBSTITUTES = 2
const BUTTON_IDS = ['ffvv2_join', 'ffvv2_substitute', 'ffvv2_leave']

const USAGE_MESSAGE = `⚠️ *Formato incorrecto.*

> *.vv2 <hora>*`

const renderTeam = team => team
  .map((member, index) => `${slotEmojis[index]}•${member?.label || ''}`)
  .join('\n')

const buildList = ({ mexicoTime, colombiaTime, team, substitutes }) => `
⚔️ *𝙇𝙄𝙎𝙏𝘼 𝙑𝙑𝟮 · 𝟰𝙑𝙎𝟰* ⚔️

🕘◦ *𝐇𝐎𝐑𝐀𝐑𝐈𝐎*
🇲🇽◦ *𝐌𝐄́𝐗𝐈𝐂𝐎:* ${mexicoTime ? `${mexicoTime} PM` : ' '}
🇨🇴◦ *𝐂𝐎𝐋𝐎𝐌𝐁𝐈𝐀:* ${colombiaTime ? `${colombiaTime} PM` : ' '}

_*𝐄𝐐𝐔𝐈𝐏𝐎 · 4 INTEGRANTES*_
${renderTeam(team)}

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
    '𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀',
    '_*• Elige una opción*_',
    [
      { text: '👍 𝐈𝐍𝐒𝐂𝐑𝐈𝐁𝐈𝐑𝐌𝐄', id: 'ffvv2_join' },
      { text: '🙋 𝐒𝐔𝐏𝐋𝐄𝐍𝐓𝐄', id: 'ffvv2_substitute' },
      { text: '😢 𝐒𝐀𝐋𝐈𝐑', id: 'ffvv2_leave' }
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
    mexicoTime,
    colombiaTime,
    team: Array(4).fill(null),
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
  if (buttonId === 'ffvv2_join'
    && listState.team.every(member => member && member.id !== userId)) return
  if (buttonId === 'ffvv2_substitute'
    && listState.substitutes.length >= MAX_SUBSTITUTES
    && !listState.substitutes.some(member => member.id === userId)) return

  const previousIndex = listState.team.findIndex(member => member?.id === userId)
  if (previousIndex >= 0) listState.team.splice(previousIndex, 1)
  const substituteIndex = listState.substitutes.findIndex(member => member?.id === userId)
  if (substituteIndex >= 0) listState.substitutes.splice(substituteIndex, 1)
  while (listState.team.length < 4) listState.team.push(null)

  if (buttonId === 'ffvv2_join') {
    const slotIndex = listState.team.findIndex(member => !member)
    if (slotIndex >= 0) {
      listState.team[slotIndex] = await getListParticipant(m, conn)
    }
  } else if (buttonId === 'ffvv2_substitute') {
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
      console.warn(`[vv2] No se pudo reemplazar el mensaje anterior: ${error.message}`)
    }
  }
}

handler.command = ['vv2']
handler.tags = ['listas']
handler.help = ['vv2 <hora>']

export default handler