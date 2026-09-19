import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { findGroupParticipant, findBotParticipant } from '../lib/group-participant.js'

const ROOT_DIR = path.join(process.cwd())
const STICKER_HASHES = {
  open: getFileHash('abrirgrupo.webp'),
  close: getFileHash('cerrargrupo.webp')
}

function getFileHash(fileName) {
  const filePath = path.join(ROOT_DIR, fileName)
  if (!fs.existsSync(filePath)) return ''
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('base64')
}

function getStickerMessage(message) {
  return message?.msg?.stickerMessage ||
    message?.message?.stickerMessage ||
    (message?.mtype === 'stickerMessage' ? message.msg : null) ||
    (message?.stickerMessage ? message : null)
}

async function getStickerHashes(message) {
  const sticker = getStickerMessage(message)
  const hashes = []
  const hash = sticker?.fileSha256

  if (hash) {
    hashes.push(Buffer.isBuffer(hash) || hash instanceof Uint8Array
      ? Buffer.from(hash).toString('base64')
      : Buffer.from(String(hash), 'base64').toString('base64'))
  }

  if (typeof message?.download === 'function') {
    try {
      const buffer = await message.download()
      if (buffer?.length) {
        hashes.push(crypto.createHash('sha256').update(buffer).digest('base64'))
      }
    } catch {}
  }

  return hashes
}

async function getGroupPermissions(m, conn) {
  const metadata = await conn.groupMetadata(m.chat).catch(() => null)
  if (!metadata) return { metadata: null, isAdmin: false, isBotAdmin: false }

  const participants = metadata.participants || []
  const user = findGroupParticipant(participants, m, conn) || {}
  const bot = findBotParticipant(participants, conn) || {}

  return {
    metadata,
    isAdmin: user.admin === 'admin' || user.admin === 'superadmin',
    isBotAdmin: Boolean(bot.admin)
  }
}

async function updateGroup(m, conn, action) {
  const { metadata } = await getGroupPermissions(m, conn)
  if (!metadata) return

  const shouldOpen = action === 'open'

  if (shouldOpen && !metadata.announce) {
    return conn.sendMessage(m.chat, {
      text: '[❗] Este grupo ya está abierto.',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  if (!shouldOpen && metadata.announce) {
    return conn.sendMessage(m.chat, {
      text: '[❗] Este grupo ya está cerrado.',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  try {
    await conn.groupSettingUpdate(m.chat, shouldOpen ? 'not_announcement' : 'announcement')
  } catch (error) {
    console.error('[sticker-group-control] Error cambiando estado del grupo:', error)
    return conn.sendMessage(m.chat, {
      text: '[❗] Debo ser admin para ejecutar este Comando.',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }
}

let handler = async () => {}

handler.all = async (m, { conn, isAdmin, isOwner }) => {
  if (!m.isGroup || m.fromMe) return

  const hashes = await getStickerHashes(m)
  if (!hashes.length) return

  const action = hashes.includes(STICKER_HASHES.open)
    ? 'close'
    : hashes.includes(STICKER_HASHES.close)
      ? 'open'
      : ''
  if (!action) return
  if (!isAdmin && !isOwner) return

  try {
    await updateGroup(m, conn, action)
  } catch (error) {
    console.error('[sticker-group-control] Error:', error)
  }
}

handler.help = []
handler.tags = ['grupo']
handler.command = []
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
