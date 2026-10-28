import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fetch from 'node-fetch'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dataPath = path.join(__dirname, '..', 'storage', 'databases', 'tetas.json')
const pruebaFotos = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
const MAX_IMAGE_BYTES = 12 * 1024 * 1024
const IMAGE_ATTEMPTS = 4
const IMAGE_TIMEOUT_MS = 4500
let lastSentImageUrl = null

const getImageUrls = () => {
  const urls = [...new Set(pruebaFotos
    .map(foto => typeof foto === 'string' ? foto : foto?.url)
    .filter(url => {
      if (typeof url !== 'string') return false
      try {
        return ['http:', 'https:'].includes(new URL(url).protocol)
      } catch {
        return false
      }
    }))]

  const nonRepeatingUrls = urls.length > 1 && lastSentImageUrl
    ? urls.filter(url => url !== lastSentImageUrl)
    : urls

  for (let index = nonRepeatingUrls.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[nonRepeatingUrls[index], nonRepeatingUrls[randomIndex]] =
      [nonRepeatingUrls[randomIndex], nonRepeatingUrls[index]]
  }

  return nonRepeatingUrls.slice(0, IMAGE_ATTEMPTS)
}

const handler = async (m, { conn }) => {
  const failures = []
  const imageUrls = getImageUrls()
  const controllers = []

  try {
    if (!imageUrls.length) throw new Error('no hay URLs de imagen válidas en tetas.json')

    const { imageUrl, image } = await Promise.any(imageUrls.map(async imageUrl => {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS)
      controllers.push(controller)

      try {
        const response = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'image/*' },
          signal: controller.signal
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const contentType = response.headers.get('content-type') || ''
        if (!contentType.toLowerCase().startsWith('image/')) {
          throw new Error(`respuesta no es imagen (${contentType || 'content-type ausente'})`)
        }

        const contentLength = Number(response.headers.get('content-length'))
        if (contentLength > MAX_IMAGE_BYTES) throw new Error('imagen supera el límite de 12 MB')

        const image = Buffer.from(await response.arrayBuffer())
        if (!image.length) throw new Error('imagen vacía')
        if (image.length > MAX_IMAGE_BYTES) throw new Error('imagen supera el límite de 12 MB')

        return { imageUrl, image }
      } catch (error) {
        failures.push(`${imageUrl}: ${error.message}`)
        throw error
      } finally {
        clearTimeout(timeout)
      }
    }))

    for (const controller of controllers) controller.abort()
    await conn.sendMessage(m.chat, { image }, { quoted: m })
    lastSentImageUrl = imageUrl
  } catch (error) {
    console.error('[tetas] No se pudo obtener o enviar una imagen:', failures.length ? failures : error)
    await m.reply('❌ No pude obtener una imagen ahora. Inténtalo de nuevo en un momento.')
  }
}

handler.help = ['tetas', 'teta', 'tetita', 'tetitas', 'tetona', 'tetonas']
handler.tags = ['fun']
handler.command = ['tetas', 'teta', 'tetita', 'tetitas', 'tetona', 'tetonas']

export default handler
