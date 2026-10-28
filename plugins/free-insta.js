function normalizeInstagramUrl(value) {
  const input = String(value || '').trim()
  if (!input) return null

  try {
    const url = new URL(input)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    if (url.protocol !== 'https:' || !['instagram.com', 'instagr.am'].includes(host)) return null
    return url.toString()
  } catch {
    return null
  }
}

function react(conn, m, emoji) {
  return conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})
}

let handler = async (m, { conn, text, isAdmin, isOwner, usedPrefix, command }) => {
  const links = global.db.data.socialLinks || (global.db.data.socialLinks = {})
  const value = String(text || '').trim()

  if (value) {
    if (m.isGroup && !isAdmin && !isOwner) return react(conn, m, '❌')

    const url = normalizeInstagramUrl(value)
    if (!url) return react(conn, m, '❌')

    try {
      links[m.chat] ||= {}
      links[m.chat].instagram = { url, updatedAt: Date.now(), updatedBy: m.sender }
      await global.db.write()
      return react(conn, m, '✅')
    } catch (error) {
      console.error('[free-insta] Error guardando el enlace:', error)
      return react(conn, m, '❌')
    }
  }

  const saved = links[m.chat]?.instagram?.url
  if (!saved) return m.reply(`No hay enlace de Instagram guardado. Envíalo con ${usedPrefix + command} <enlace>.`)
  return conn.reply(m.chat, `Instagram del grupo:\n${saved}`, m)
}

handler.help = ['insta <enlace> (guardar); .insta (mostrar)']
handler.tags = ['social']
handler.command = ['insta']

export default handler
