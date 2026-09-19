const URL_PATTERN = /https?:\/\/\S+|www\.\S+/i

function ensureLinks() {
  if (!Array.isArray(global.db.data.links)) global.db.data.links = []
  return global.db.data.links
}

function parseLinkInput(value) {
  const input = String(value || '').trim()
  const urlMatch = input.match(URL_PATTERN)
  if (!urlMatch) return null

  const url = urlMatch[0].replace(/[),.;!?]+$/, '')
  const description = input
    .slice(0, urlMatch.index)
    .replace(/[\s/]+$/, '')
    .trim()

  if (!description || !url) return null
  return { description, url }
}

let handler = async (m, { conn, text, usedPrefix, command, isOwner, isAdmin }) => {
  const links = ensureLinks()
  const action = String(command || '').toLowerCase()

  if (action === 'link') {
    if (!links.length) {
      return conn.reply(m.chat, '🔗 No hay enlaces guardados todavía.', m, global.rcanal)
    }

    const lines = links.map((entry, index) => `${index + 1}. *${entry.description}*\n${entry.url}`)
    return conn.sendMessage(m.chat, {
      text: `🔗 *ENLACES GUARDADOS*\n\n${lines.join('\n\n')}`,
      contextInfo: { ...global.rcanal?.contextInfo }
    }, { quoted: m })
  }

  if (!isOwner && !isAdmin) {
    return conn.reply(m.chat, '❌ Solo los administradores pueden guardar enlaces.', m, global.rcanal)
  }

  const entry = parseLinkInput(text)
  if (!entry) {
    return conn.reply(
      m.chat,
      `❌ Formato inválido.\n\nUsa:\n${usedPrefix}${command} descripción/https://ejemplo.com`,
      m,
      global.rcanal
    )
  }

  const duplicate = links.some(saved => saved.url === entry.url && saved.description === entry.description)
  if (duplicate) return conn.reply(m.chat, '⚠️ Ese enlace ya está guardado.', m, global.rcanal)

  links.push({ ...entry, addedAt: Date.now(), addedBy: m.sender })
  await global.db.write()

  return conn.reply(m.chat, `✅ Enlace guardado:\n\n*${entry.description}*\n${entry.url}`, m, global.rcanal)
}

handler.help = ['mandarlink descripción/https://enlace → guarda un enlace', 'link → muestra los enlaces guardados']
handler.tags = ['owner', 'herramientas']
handler.command = ['mandarlink', 'link']

export default handler