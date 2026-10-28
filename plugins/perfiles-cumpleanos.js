import fs from 'node:fs'
import path from 'node:path'
import sharp from '../lib/sharp.js'

const BACKGROUND_PATH = path.join(process.cwd(), 'cumpleaños.jpg')
const AUDIO_PATH = path.join(process.cwd(), 'cumpleaños.mp3')
const AVATAR_SIZE = 440

function makeFallbackAvatar(jid) {
  const initials = String(jid.split('@')[0].slice(-2) || '?')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return Buffer.from(`<svg width="${AVATAR_SIZE}" height="${AVATAR_SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#8e62c7"/><stop offset="1" stop-color="#f078aa"/></linearGradient></defs>
    <circle cx="110" cy="110" r="110" fill="url(#bg)"/>
    <text x="110" y="132" text-anchor="middle" font-family="Arial,sans-serif" font-size="64" font-weight="700" fill="#fff">${initials}</text>
  </svg>`)
}

async function getAvatar(conn, jid) {
  try {
    const decodedJid = conn.decodeJid?.(jid) || jid
    const url = await conn.profilePictureUrl(decodedJid, 'image')
    const response = await fetch(url, { signal: AbortSignal.timeout(12_000) })
    if (!response.ok) throw new Error(`Avatar HTTP ${response.status}`)

    const avatar = Buffer.from(await response.arrayBuffer())
    if (!avatar.length || avatar.length > 8 * 1024 * 1024) {
      throw new Error('La foto de perfil está vacía o supera el tamaño permitido.')
    }
    return await sharp(avatar)
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .png()
      .toBuffer()
  } catch {
    return sharp(makeFallbackAvatar(jid)).png().toBuffer()
  }
}

async function makeBirthdayImage(conn, jid) {
  if (!fs.existsSync(BACKGROUND_PATH)) throw new Error('No se encontró cumpleaños.jpg.')

  const [background, avatar] = await Promise.all([
    sharp(BACKGROUND_PATH).rotate().png().toBuffer(),
    getAvatar(conn, jid)
  ])
  const { width, height } = await sharp(background).metadata()
  const size = Math.min(AVATAR_SIZE, width, height)
  const left = Math.round((width - size) / 2)
  const top = Math.round((height - size) / 2)
  const roundMask = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`)
  const roundAvatar = await sharp(avatar)
    .resize(size, size, { fit: 'cover' })
    .composite([{ input: roundMask, blend: 'dest-in' }])
    .png()
    .toBuffer()
  const border = Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 4}" fill="none" stroke="#fff" stroke-width="8"/></svg>`)

  return sharp(background)
    .composite([
      { input: roundAvatar, left, top },
      { input: border, left, top }
    ])
    .jpeg({ quality: 92 })
    .toBuffer()
}

let handler = async (m, { conn, usedPrefix, command }) => {
  const mentioned = [...new Set((m.mentionedJid || []).map(jid => conn.decodeJid?.(jid) || jid))]
  const quoted = m.quoted?.sender ? conn.decodeJid?.(m.quoted.sender) || m.quoted.sender : ''
  const target = mentioned[0] || quoted
  if (!target) {
    return m.reply(`Menciona a la persona que cumple años o responde a uno de sus mensajes.\n\nEjemplo: ${usedPrefix + command} @persona`)
  }

  try {
    if (!fs.existsSync(AUDIO_PATH)) throw new Error('No se encontró maravilla.mp3.')

    const image = await makeBirthdayImage(conn, target)
    await conn.sendMessage(m.chat, {
      image,
      caption: `🎂 ¡Feliz cumpleaños, @${target.split('@')[0]}!`,
      contextInfo: {
        ...(global.rcanal?.contextInfo || {}),
        mentionedJid: [target]
      }
    }, { quoted: m })
    return conn.sendMessage(m.chat, {
      audio: fs.readFileSync(AUDIO_PATH),
      mimetype: 'audio/mpeg',
      fileName: 'maravilla.mp3',
      ptt: false
    }, { quoted: m })
  } catch (error) {
    console.error('[cumpleaños] No se pudo enviar la felicitación:', error)
    return m.reply('No pude preparar la felicitación de cumpleaños. Verifica que estén disponibles la imagen, el audio y la foto de perfil.')
  }
}

handler.help = ['cumpleaños @persona']
handler.tags = ['perfiles']
handler.command = ['cumpleaños']
handler.group = true

export default handler
