import sharp from '../lib/sharp.js'
import { addExif } from '../lib/sticker.js'
import { resolveStickerMeta } from './stickers-sticker.js'

const SIZE = 512
const MAX_TEXT = 180
const MAX_LINES = 6
const BACKGROUND = '#FFFFFF'
const FOREGROUND = '#111111'

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(text, maxChars) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let current = ''

  for (const word of words) {
    if (word.length > maxChars) {
      if (current) lines.push(current)
      for (let index = 0; index < word.length; index += maxChars) {
        lines.push(word.slice(index, index + maxChars))
      }
      current = ''
      continue
    }

    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= maxChars) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) lines.push(current)
  return lines
}

function buildSvg(text) {
  const normalized = text.replace(/\\n/gi, '\n').trim()
  let lines = normalized.split('\n').flatMap(line => wrapText(line, 18))
  lines = lines.slice(0, MAX_LINES)

  if (lines.length === MAX_LINES && lines[MAX_LINES - 1].length >= 18) {
    lines[MAX_LINES - 1] = `${lines[MAX_LINES - 1].slice(0, -1)}…`
  }

  const longestLine = Math.max(...lines.map(line => line.length), 1)
  const widthLimit = Math.floor(440 / (longestLine * 0.56))
  const heightLimit = Math.floor(430 / (1 + (lines.length - 1) * 1.12))
  const fontSize = Math.max(32, Math.min(108, widthLimit, heightLimit))
  const lineHeight = fontSize * 1.12
  const textHeight = fontSize + (lines.length - 1) * lineHeight
  const startY = (SIZE - textHeight) / 2 + fontSize * 0.82
  const tspans = lines.map((line, index) => {
    const y = Math.round(startY + index * lineHeight)
    return `<tspan x="256" y="${y}">${escapeXml(line)}</tspan>`
  }).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
  <rect width="100%" height="100%" fill="${BACKGROUND}"/>
  <text x="256" text-anchor="middle" font-family="Arial" font-size="${fontSize}" font-weight="400" fill="${FOREGROUND}">${tspans}</text>
</svg>`
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const text = args.join(' ').trim() || (m.quoted?.text || '').trim()

  if (!text) {
    return conn.reply(
      m.chat,
      `⚪ Escribe el texto del sticker.\n\nEjemplo: ${usedPrefix + command} hola`,
      m,
      global.rcanal
    )
  }

  if (text.length > MAX_TEXT) {
    return conn.reply(
      m.chat,
      `❌ El texto es demasiado largo. Usa máximo ${MAX_TEXT} caracteres.`,
      m,
      global.rcanal
    )
  }

  try {
    const svg = buildSvg(text)
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    const webp = await sharp(png).webp({ quality: 92 }).toBuffer()
    const { packname, author } = resolveStickerMeta(m, conn)
    const sticker = await addExif(webp, packname, author)

    await conn.sendFile(m.chat, sticker, 'brat.webp', '', m, null, global.rcanal)
  } catch (error) {
    console.error('[brat] Error:', error)
    return conn.reply(
      m.chat,
      `❌ No se pudo crear el sticker: ${error.message || 'error desconocido'}`,
      m,
      global.rcanal
    )
  }
}

handler.help = ['brat <texto> → crea un sticker estilo Brat con texto']
handler.tags = ['stickers']
handler.command = ['brat']

export default handler
