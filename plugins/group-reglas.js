import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import uploadFile from '../lib/uploadFile.js'

const RULES_DIR = path.join(process.cwd(), 'storage', 'group-rules')
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

function getImageTarget(m) {
  const candidates = [m, m.quoted].filter(Boolean)
  for (const target of candidates) {
    const message = target.msg || target
    const mime = String(message.mimetype || target.mediaType || '').toLowerCase()
    if (mime.startsWith('image/') && typeof target.download === 'function') {
      return { target, mime }
    }
  }
  return null
}

function getStoredFile(chat, ext) {
  const chatKey = crypto.createHash('sha256').update(chat).digest('hex')
  return path.join(RULES_DIR, `${chatKey}.${ext}`)
}

function react(conn, m, emoji) {
  return conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }).catch(() => {})
}

let handler = async (m, { conn, text, isAdmin, isOwner, usedPrefix, command }) => {
  if (!m.isGroup) return m.reply('Este comando solo funciona en grupos.')

  const rules = global.db?.data?.groupRules || (global.db.data.groupRules = {})
  const target = getImageTarget(m)
  const action = String(text || '').trim().toLowerCase()

  if (/^\d{4}$/.test(action)) return

  if (action === 'borrar' || action === 'eliminar' || action === 'delete') {
    if (!isAdmin && !isOwner) return m.reply('Solo un administrador puede borrar la imagen de reglas.')
    const saved = rules[m.chat]
    if (!saved) return m.reply('Este grupo todavía no tiene una imagen de reglas guardada.')
    if (saved.file) await fs.unlink(saved.file).catch(() => {})
    delete rules[m.chat]
    await global.db.write()
    return m.reply('Se eliminó la imagen de reglas guardada para este grupo.')
  }

  if (target) {
    if (!isAdmin && !isOwner) return react(conn, m, '❌')

    try {
      const image = await target.target.download()
      if (!image?.length || image.length > MAX_IMAGE_BYTES) return react(conn, m, '❌')

      const detected = await fileTypeFromBuffer(image)
      if (!detected?.mime?.startsWith('image/')) return react(conn, m, '❌')

      await fs.mkdir(RULES_DIR, { recursive: true })
      const file = getStoredFile(m.chat, detected.ext)
      await fs.writeFile(file, image)

      const previousFile = rules[m.chat]?.file
      rules[m.chat] = {
        file,
        url: '',
        mime: detected.mime,
        updatedAt: Date.now(),
        updatedBy: m.sender
      }
      await global.db.write()
      if (previousFile && previousFile !== file) await fs.unlink(previousFile).catch(() => {})

      let url = ''
      try {
        url = await uploadFile(image)
      } catch (error) {
        console.error('[reglas] No se pudo subir una copia pública:', error?.message || error)
      }

      if (url) {
        rules[m.chat].url = url
        await global.db.write()
      }

      return react(conn, m, '✅')
    } catch (error) {
      console.error('[reglas] Error guardando la imagen:', error)
      return react(conn, m, '❌')
    }
  }

  const saved = rules[m.chat]
  if (!saved) {
    return m.reply(`No hay una imagen de reglas guardada. Un administrador debe responder a una imagen con ${usedPrefix + command}.`)
  }

  try {
    const image = saved.file ? await fs.readFile(saved.file) : null
    if (image?.length) {
      return conn.sendMessage(m.chat, {
        image,
        mimetype: saved.mime || 'image/jpeg',
        caption: '📋 Reglas del grupo'
      }, { quoted: m })
    }

    if (saved.url) {
      return conn.sendMessage(m.chat, {
        image: { url: saved.url },
        caption: '📋 Reglas del grupo'
      }, { quoted: m })
    }

    return m.reply('La imagen de reglas ya no está disponible. Un administrador puede volver a guardarla respondiendo a la imagen con .reglas.')
  } catch (error) {
    console.error('[reglas] Error leyendo la imagen persistida:', error)
    return m.reply('No pude leer la imagen de reglas guardada. Un administrador puede volver a guardarla respondiendo a la imagen con .reglas.')
  }
}

handler.help = ['reglas (responde a una imagen para guardarla; .reglas borrar para eliminarla)']
handler.tags = ['grupo']
handler.command = [/^reglas$/]
handler.group = true

export default handler
