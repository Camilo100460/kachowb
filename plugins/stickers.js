import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import fetch from 'node-fetch'
import sharp from '../lib/sharp.js'
import { addExif } from '../lib/sticker.js'
import { resolveStickerMeta } from './stickers-sticker.js'

const MAX_VIDEO_SECONDS = 7
const MAX_MEDIA_BYTES = 20 * 1024 * 1024
const COOLDOWN_MS = 10_000
const lastUsedAt = new Map()

function getQuotedOrCurrentMedia(m) {
  return m.quoted || m
}

function getMediaInfo(target) {
  const message = target.msg || target
  return {
    mime: String(message.mimetype || target.mediaType || '').toLowerCase(),
    seconds: Number(message.seconds || 0)
  }
}

async function downloadFromUrl(url) {
  const parsed = new URL(url)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('El enlace debe comenzar con http:// o https://.')
  }

  const response = await fetch(parsed, { timeout: 30_000, size: MAX_MEDIA_BYTES })
  if (!response.ok) throw new Error(`No se pudo descargar el enlace (HTTP ${response.status}).`)

  const mime = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase()
  if (!/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/.test(mime)) {
    throw new Error('El enlace debe apuntar directamente a una imagen o video compatible.')
  }

  const buffer = Buffer.from(await response.buffer())
  if (!buffer.length || buffer.length > MAX_MEDIA_BYTES) {
    throw new Error('El archivo está vacío o supera el límite de 20 MB.')
  }

  return { buffer, mime, seconds: 0 }
}

async function convertVideoToSticker(buffer, mime) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prueba-sticker-'))
  const inputExt = mime === 'video/webm' ? 'webm' : mime === 'video/quicktime' ? 'mov' : 'mp4'
  const inputPath = path.join(tempDir, `input-video.${inputExt}`)
  const outputPath = path.join(tempDir, 'sticker.webp')

  try {
    await fs.writeFile(inputPath, buffer)
    await new Promise((resolve, reject) => {
      const args = [
        '-y', '-i', inputPath,
        '-vcodec', 'libwebp',
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,fps=15,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse',
        '-loop', '0', '-preset', 'default', '-an', '-q:v', '85',
        outputPath
      ]
      const ffmpeg = spawn('ffmpeg', args, { windowsHide: true })
      let stderr = ''
      ffmpeg.stderr.setEncoding('utf8')
      ffmpeg.stderr.on('data', chunk => { stderr += chunk })
      ffmpeg.once('error', reject)
      ffmpeg.once('close', code => {
        if (code === 0) resolve()
        else reject(new Error(`FFmpeg terminó con código ${code}: ${stderr.trim().slice(-1200)}`))
      })
    })

    return await fs.readFile(outputPath)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

async function convertToSticker(buffer, mime) {
  if (mime.startsWith('video/')) return convertVideoToSticker(buffer, mime)

  const metadata = await sharp(buffer, { animated: true }).metadata()
  if ((metadata.pages || 1) > 1) {
    return sharp(buffer, { animated: true })
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .webp({
        quality: 90,
        alphaQuality: 100,
        effort: 6,
        loop: metadata.loop || 0,
        delay: metadata.delay
      })
      .toBuffer()
  }

  return sharp(buffer)
    .rotate()
    .resize(512, 512, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 95, alphaQuality: 100, effort: 6, smartSubsample: false })
    .toBuffer()
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const now = Date.now()
  const lastUsed = lastUsedAt.get(m.sender) || 0
  const remaining = COOLDOWN_MS - (now - lastUsed)
  if (remaining > 0) {
    return conn.reply(m.chat, `Espera ${Math.ceil(remaining / 1000)} segundos antes de volver a usar este comando.`, m, global.rcanal)
  }

  let media
  try {
    const target = getQuotedOrCurrentMedia(m)
    const { mime, seconds } = getMediaInfo(target)
    const url = String(args[0] || '').trim()

    if (url) {
      media = await downloadFromUrl(url)
    } else if (/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/.test(mime) && typeof target.download === 'function') {
      if (mime.startsWith('video/') && seconds > MAX_VIDEO_SECONDS) {
        return m.reply(`El video no debe durar más de ${MAX_VIDEO_SECONDS} segundos.`)
      }
      const buffer = await target.download()
      if (!buffer?.length) throw new Error('No se pudo descargar el archivo adjunto.')
      if (buffer.length > MAX_MEDIA_BYTES) throw new Error('El archivo supera el límite de 20 MB.')
      media = { buffer, mime, seconds }
    } else {
      return conn.reply(
        m.chat,
        `Responde a una imagen o video de hasta ${MAX_VIDEO_SECONDS} segundos, adjúntalo con el comando o envía un enlace directo compatible.\n\nEjemplo: ${usedPrefix + command} https://sitio.com/imagen.jpg`,
        m,
        global.rcanal
      )
    }

    if (media.mime.startsWith('video/') && media.seconds > MAX_VIDEO_SECONDS) {
      return m.reply(`El video no debe durar más de ${MAX_VIDEO_SECONDS} segundos.`)
    }

    const user = global.db?.data?.users?.[m.sender] || {}
    const defaults = resolveStickerMeta(m, conn)
    const packname = user.packname || defaults.packname
    const author = user.packname ? (user.author || defaults.author) : defaults.author

    const webp = await convertToSticker(media.buffer, media.mime)
    const finalSticker = await addExif(webp, packname, author)
    await conn.sendFile(m.chat, finalSticker, 'sticker.webp', '', m, null, global.rcanal)
    lastUsedAt.set(m.sender, now)
  } catch (error) {
    console.error('[prueba]', error)
    return conn.reply(m.chat, `No pude crear el sticker. ${error?.message || ''}`.trim(), m, global.rcanal)
  }
}

handler.help = ['prueba (imagen, video, GIF o enlace)', 's', 'sticker', 'stickers', 'stiker']
handler.tags = ['stickers']
handler.command = ['s', 'sticker', 'stickers', 'stiker']

export default handler