import {
  BOT_BANS_KEY,
  addEntry,
  findEntryKey,
  isProtectedId,
  isSenderListed,
  removeEntry,
  resolveTargetIds
} from '../lib/blacklist.js'

const BAN_MANAGERS_KEY = 'banManagers'

let handler = async (m, { conn, text, usedPrefix, command, isOwner, participants }) => {
  if (!isOwner && !isSenderListed(BAN_MANAGERS_KEY, m, conn, participants)) {
    return m.reply('*[❗] Solo los dueños o personas autorizadas pueden usar este comando.*')
  }

  const ids = await resolveTargetIds(m, conn, text, participants)
  if (!ids.length) {
    return m.reply(
      `*[❗] Indica un número, menciona o responde a un usuario.*\n\n` +
      `> ${usedPrefix}ban 573001112233 (inhabilitar)\n` +
      `> ${usedPrefix}add 573001112233 (habilitar de nuevo)`
    )
  }

  if (command === 'add') {
    const removed = await removeEntry(BOT_BANS_KEY, ids)
    return m.reply(removed
      ? `✅ +${ids[0]} fue habilitado de nuevo para usar el bot.`
      : `*[❗]* +${ids[0]} no estaba baneado.`)
  }

  if (isProtectedId(ids, conn) || findEntryKey(BAN_MANAGERS_KEY, ids) !== null) {
    return m.reply('*[❗] No puedes banear a un owner, a una persona autorizada ni al bot.*')
  }

  const added = await addEntry(BOT_BANS_KEY, ids, m.sender)
  return m.reply(added
    ? `🚫 +${ids[0]} fue baneado: ya no podrá usar el bot.`
    : `*[❗]* +${ids[0]} ya estaba baneado.`)
}

handler.help = ['ban <número|@usuario>', 'add <número|@usuario>']
handler.tags = ['owner']
handler.command = ['ban', 'add']
handler.rowner = true

export default handler
