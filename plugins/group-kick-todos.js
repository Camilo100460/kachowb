import { findGroupParticipant, isBotParticipantAdmin } from '../lib/group-participant.js'

const DELAY_MS = 700

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

let handler = async (m, { conn }) => {
  if (!m.isGroup) {
    return m.reply('[❗] Este comando solo puede usarse en grupos.')
  }

  try {
    const metadata = await conn.groupMetadata(m.chat)
    const participants = metadata.participants || []
    const actor = findGroupParticipant(participants, m, conn)
    const isAdmin = actor?.admin === 'admin' || actor?.admin === 'superadmin'

    if (!isAdmin) {
      return m.reply('[❗] Solo los administradores del grupo pueden usar este comando.')
    }

    if (!isBotParticipantAdmin(participants, conn)) {
      return m.reply('[❗] El bot debe ser administrador para expulsar miembros.')
    }

    const botJid = conn.decodeJid(conn.user?.jid || conn.user?.id)
    const removable = participants.filter(participant => {
      const jid = conn.decodeJid(participant.id)
      return jid && jid !== botJid && !participant.admin
    })

    if (!removable.length) {
      return m.reply('[❗] No hay miembros normales para expulsar. Los administradores no se eliminan.')
    }

    await m.reply(`⚠️ Se expulsarán ${removable.length} miembros normales. Los administradores y el bot permanecerán en el grupo.`)

    let removedCount = 0
    let failedCount = 0

    for (const participant of removable) {
      const jid = conn.decodeJid(participant.id)

      try {
        await conn.groupParticipantsUpdate(m.chat, [jid], 'remove')
        removedCount++
      } catch (error) {
        failedCount++
        console.error(`No se pudo expulsar a ${jid}:`, error?.message || error)
      }

      if (participant !== removable[removable.length - 1]) {
        await wait(DELAY_MS)
      }
    }

    return m.reply(
      `✅ Operación terminada.\n\n` +
      `> Expulsados: ${removedCount}\n` +
      `> Fallidos: ${failedCount}\n` +
      `> Administradores conservados: ${participants.filter(p => p.admin).length}`
    )
  } catch (error) {
    console.error('Error en kicktodos:', error)
    return m.reply('[❌] No se pudo obtener la información del grupo. Verifica que el bot sea administrador.')
  }
}

handler.help = ['kicktodos']
handler.tags = ['owner', 'grupo']
handler.command = ['kicktodos', 'expulsartodos']
handler.group = true
handler.botAdmin = true

export default handler
