import { findBotParticipant, participantJids } from '../lib/group-participant.js'

function activityForParticipant(activityMap, participant, conn) {
  const values = participantJids(participant, conn)
  const directTimes = values.map(jid => Number(activityMap?.[jid]) || 0)
  const digits = new Set(values.map(jid => String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')).filter(Boolean))

  for (const [jid, timestamp] of Object.entries(activityMap || {})) {
    const jidDigits = String(jid).split('@')[0].split(':')[0].replace(/\D/g, '')
    if (jidDigits && digits.has(jidDigits)) directTimes.push(Number(timestamp) || 0)
  }

  return directTimes.length ? Math.max(...directTimes) : 0
}

let handler = async (m, { conn, isAdmin, isBotAdmin }) => {
  if (!m.isGroup) return m.reply('[❗] Este comando solo funciona en grupos.')
  if (!isAdmin) return m.reply('[❗] Solo los administradores pueden usar este comando.')
  if (!isBotAdmin) return m.reply('[❗] El bot debe ser administrador para consultar el grupo.')

  try {
    const metadata = await conn.groupMetadata(m.chat)
    const activityMap = global.db.data.groupActivity?.[m.chat] || {}
    const botJids = new Set(participantJids(findBotParticipant(metadata.participants, conn), conn))

    const candidates = metadata.participants
      .filter(participant => !participant.admin)
      .filter(participant => !participantJids(participant, conn).some(jid => botJids.has(jid)))
      .map(participant => ({
        participant,
        lastActivity: activityForParticipant(activityMap, participant, conn)
      }))
      .sort((a, b) => a.lastActivity - b.lastActivity)
      .slice(0, 10)

    if (!candidates.length) return m.reply('[❗] No hay miembros normales para mostrar.')

    const lines = await Promise.all(candidates.map(async ({ participant, lastActivity }, index) => {
      const jids = participantJids(participant, conn)
      const jid = jids[0] || participant.id
      const name = await conn.getName(jid).catch(() => 'Usuario')
      const status = lastActivity
        ? new Date(lastActivity).toLocaleString('es-ES')
        : 'Sin actividad registrada'
      return `${index + 1}. @${jid.split('@')[0]}\n   > ${name}\n   > Última actividad: ${status}`
    }))

    const mentions = candidates.flatMap(({ participant }) => participantJids(participant, conn).slice(0, 1))
    return conn.sendMessage(m.chat, {
      text: `👻 *10 personas más inactivas*\n\n${lines.join('\n\n')}`,
      mentions
    }, { quoted: m })
  } catch (error) {
    console.error('Error en fantasmas:', error)
    return m.reply('[❌] No se pudo consultar la actividad del grupo.')
  }
}

handler.help = ['fantasmas']
handler.tags = ['grupo']
handler.command = ['fantasmas', 'inactivos', 'sider']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
