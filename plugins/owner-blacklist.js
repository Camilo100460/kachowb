import {
  BLACKLIST_KEY,
  addEntry,
  isProtectedId,
  listEntries,
  removeEntry,
  removeFromAllGroups,
  resolveTargetIds
} from '../lib/blacklist.js'

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
    const entries = listEntries(BLACKLIST_KEY)
    if (!entries.length) return m.reply('📋 La lista negra está vacía.')

    const lines = entries.map((entry, index) => `${index + 1}. +${entry.ids?.[0] || entry.key}`)
    return m.reply(`🚫 *LISTA NEGRA* (${entries.length})\n\n${lines.join('\n')}`)
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
    const removed = await removeEntry(BLACKLIST_KEY, ids)
    return m.reply(removed
      ? `✅ +${ids[0]} fue quitado de la lista negra.`
      : `*[❗]* +${ids[0]} no estaba en la lista negra.`)
  }

  if (isProtectedId(ids, conn)) {
    return m.reply('*[❗] No puedes poner en la lista negra a un owner ni al bot.*')
  }

  const added = await addEntry(BLACKLIST_KEY, ids, m.sender)
  const result = await removeFromAllGroups(conn, ids)

  return m.reply(
    `🚫 *+${ids[0]}* ${added ? 'fue añadido a la lista negra' : 'ya estaba en la lista negra'}.\n\n` +
    `> Grupos donde estaba: ${result.found}\n` +
    `> Expulsado de: ${result.removed}\n` +
    `> No se pudo expulsar (el bot no es admin o es el creador): ${result.skipped}\n\n` +
    `Si vuelve a entrar a un grupo donde el bot sea admin, será expulsado automáticamente.`
  )
}

handler.help = ['blacklist <número|@usuario>', 'blacklist del <número>', 'blacklist lista']
handler.tags = ['owner']
handler.command = ['blacklist', 'listanegra']
handler.rowner = true

export default handler
