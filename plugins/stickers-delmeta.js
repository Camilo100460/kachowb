import { addExif } from '../lib/sticker.js'

/**
 * Cambia packname/autor de un sticker (estático o animado) sin re-encodear.
 * Uso: responder sticker + .delmeta nombre|autor
 * Si el autor va vacío → se usa el pushName del usuario.
 */
let handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    const q = m.quoted ? m.quoted : null
    const mime = ((q?.msg || q)?.mimetype || q?.mediaType || '').toLowerCase()
    const isSticker =
      !!q &&
      (
        /webp/.test(mime) ||
        q.mtype === 'stickerMessage' ||
        !!q.isAnimated ||
        typeof q.isAnimated !== 'undefined'
      )

    if (!q || !isSticker || typeof q.download !== 'function') {
      return conn.reply(
        m.chat,
        `*[❗] Responde a un *sticker* (normal o animado) con el comando.*\n\n` +
          `Ejemplos:\n` +
          `> ${usedPrefix + command} MAY-BOT|Sunkovv\n` +
          `> ${usedPrefix + command} Mi Pack\n` +
          `> ${usedPrefix + command} Mi Pack|`,
        m,
        global.rcanal
      )
    }

    const raw = String(text || '').trim()
    const pushname =
      m.pushName ||
      m.name ||
      conn.getName?.(m.sender) ||
      'Usuario'

    let packname = ''
    let author = ''

    if (!raw) {
      packname = String(pushname).trim() || 'Usuario'
      author = packname
    } else if (raw.includes('|')) {
      const parts = raw.split('|')
      packname = (parts[0] || '').trim()
      author = parts.slice(1).join('|').trim()
    } else {
      packname = raw
      author = ''
    }

    if (!packname) {
      return conn.reply(
        m.chat,
        `*[❗] Debes indicar al menos el *nombre* del pack.*\n\n` +
          `Ejemplo: ${usedPrefix + command} MAY-BOT|Sunkovv`,
        m,
        global.rcanal
      )
    }

    if (!author) author = String(pushname).trim() || 'Usuario'

    const buffer = await q.download()
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 10) {
      return conn.reply(m.chat, '[❌] No se pudo descargar el sticker.', m, global.rcanal)
    }

   
    const finalSticker = await addExif(buffer, packname, author)

    await conn.sendFile(
      m.chat,
      finalSticker,
      'sticker.webp',
      '',
      m,
      null,
      global.rcanal
    )
  } catch (e) {
    console.error('[delmeta]', e)
    return conn.reply(
      m.chat,
      `*[❌] Error al cambiar la metadata del sticker.*\n> ${e?.message || e}`,
      m,
      global.rcanal
    )
  }
}

handler.help = [
  '#delmeta • #remeta • #take + {responder sticker} nombre|autor\n→ Cambia pack y autor del sticker (si autor vacío usa tu nombre)'
]
handler.tags = ['stickers']
handler.command = ['delmeta', 'remeta', 'take', 'wm']

export default handler
