import {
  addEntry,
  isProtectedId,
  listEntries,
  removeEntry,
  resolveTargetIds
} from '../lib/blacklist.js'

const BAN_MANAGERS_KEY = 'banManagers'

const REMOVE_WORDS = ['del', 'delete', 'remove', 'quitar', 'rm']
const LIST_WORDS = ['list', 'lista']

let handler = async (m, { conn, args, usedPrefix, command, isOwner, participants }) => {
  if (!isOwner) return m.reply('*[❗] Solo los dueños pueden usar este comando.*')

  const sub = (args[0] || '').toLowerCase()
  const isRemove = REMOVE_WORDS.includes(sub)
  const isList = LIST_WORDS.includes(sub)
  const targetText = (isRemove || isList ? args.slice(1) : args).join(' ')
  const ids = isList ? [] : await resolveTargetIds(m, conn, targetText, participants)

  if (isList || (!ids.length && !args.length && !m.quoted)) {
    const entries = listEntries(BAN_MANAGERS_KEY)
    if (!entries.length) return m.reply('📋 Nadie tiene permiso para usar .ban y .add.')

    const lines = entries.map((entry, index) => `${index + 1}. +${entry.ids?.[0] || entry.key}`)
    return m.reply(`🛡️ *AUTORIZADOS PARA .ban Y .add* (${entries.length})\n\n${lines.join('\n')}`)
  }

  if (!ids.length) {
    return m.reply(
      `*[❗] Indica un número, menciona o responde a un usuario.*\n\n` +
      `> ${usedPrefix + command} 573001112233\n` +
      `> ${usedPrefix + command} del 573001112233\n` +
      `> ${usedPrefix + command} lista`
    )
  }

  if (isRemove) {
    const removed = await removeEntry(BAN_MANAGERS_KEY, ids)
    return m.reply(removed
      ? `✅ +${ids[0]} ya no puede usar .ban ni .add.`
      : `*[❗]* +${ids[0]} no tenía permiso.`)
  }

  if (isProtectedId(ids, conn)) {
    return m.reply('*[❗] Los owners ya tienen todos los permisos.*')
  }

  const added = await addEntry(BAN_MANAGERS_KEY, ids, m.sender)
  return m.reply(added
    ? `🛡️ +${ids[0]} ahora puede usar *.ban* y *.add* sin ser owner.`
    : `*[❗]* +${ids[0]} ya tenía ese permiso.`)
}

handler.help = ['addme <número|@usuario>', 'addme del <número>', 'addme lista']
handler.tags = ['owner']
handler.command = ['addme']
handler.rowner = true

export default handler
