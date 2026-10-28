import fetch from 'node-fetch'
import yts from 'yt-search'
import { downloadVideoWithAhm7 } from '../lib/ahm7-download.js'

const YT_URL_RE = /youtu\.be|youtube\.com/i
const RESULTS_LIMIT = 5

function trimText(text = '', max = 100) {
  const value = String(text).replace(/\s+/g, ' ').trim()
  if (!value || value === '-') return ''
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function normalizeFormat(raw = '360') {
  const value = String(raw).trim().toLowerCase().replace(/p$/, '')
  if (!/^\d{3,4}$/.test(value)) return '360p'
  return `${value}p`
}

function formatViews(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`
  return String(v || '—')
}

function cleanFileName(title = 'video') {
  return String(title)
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80) || 'video'
}

async function searchFirst(query) {
  try {
    const result = await yts.search({ query, hl: 'es', gl: 'ES' })
    const video = result?.videos?.[0]
    if (video?.url) {
      return {
        title: video.title,
        url: video.url,
        videoId: video.videoId,
        duration: video.timestamp,
        views: video.views,
        image: video.thumbnail,
        author: { name: video.author?.name || video.author || 'Desconocido' }
      }
    }
  } catch (error) {
    console.warn('[video] yt-search falló; se probará Delirius:', error?.message || error)
  }

  const searchUrl = `https://api.delirius.online/search/ytsearch?q=${encodeURIComponent(query)}`
  const response = await fetch(searchUrl, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  })
  const body = await response.text()
  let data
  try {
    data = JSON.parse(body.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error(`La búsqueda de respaldo devolvió HTML o JSON inválido (HTTP ${response.status}).`)
  }
  if (!response.ok || !data?.status || !Array.isArray(data.data) || !data.data.length) {
    throw new Error(data?.msg || `No se encontraron resultados (HTTP ${response.status}).`)
  }
  return data.data[0]
}

async function downloadVideo(videoUrl, format) {
  const result = await downloadVideoWithAhm7(videoUrl)
  if (!result.success) throw new Error(result.error || 'AHM7 no pudo obtener el video.')

  const chosenQuality = result.qualities.find(item => item.url === result.video)?.quality
    || result.qualities[0]?.quality
    || format
  return {
    ...result,
    download: result.video,
    author: result.platform || 'Desconocido',
    format: chosenQuality
  }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    if (!text?.trim()) {
      return conn.sendMessage(m.chat, {
        text: `ִֶָ☾. Ingresa búsqueda, enlace o número.\n\n> ${usedPrefix + command} <búsqueda>\n> ${usedPrefix + command} <enlace>\n> ${usedPrefix + command} <número>\n\n> *Ejemplo:*\n${usedPrefix + command} its you`,
        contextInfo: { ...rcanal?.contextInfo }
      }, { quoted: m })
    }

    let input = text.trim()
    let format = '360p'

    const fm = input.match(/^(.+?)\s*(?:\||\s)\s*(\d{3,4})p?$/i)
    if (fm) {
      input = fm[1].trim()
      format = normalizeFormat(fm[2])
    }

    let videoUrl = null
    let preview = null

    if (YT_URL_RE.test(input)) {
      videoUrl = input
    } else if (/^\d+$/.test(input)) {
      const idx = parseInt(input, 10) - 1
      const cache = global.lastYtSearch?.[m.sender]
      if (!cache?.results?.length || Date.now() - cache.at > 10 * 60 * 1000) {
        throw `[❗] No hay búsqueda reciente. Usa primero *${usedPrefix}yt <texto>*`
      }
      if (idx < 0 || idx >= cache.results.length) {
        throw `[❗] Elige un número del 1 al ${cache.results.length}.`
      }
      videoUrl = cache.results[idx].url
      preview = cache.results[idx]
    } else {
      const first = await searchFirst(input)
      videoUrl = first.url || `https://youtu.be/${first.videoId}`
      preview = first
    }

    await conn.sendPresenceUpdate('composing', m.chat).catch(() => {})

    const data = await downloadVideo(videoUrl, format)
    const videoDownload = typeof data.download === 'string' ? data.download : data.download?.url
    if (!videoDownload) throw '[❗] No se encontró la URL del video.'

    const title = data.title || preview?.title || 'Video'
    const channel = data.author || data.channel || preview?.author?.name || 'Desconocido'
    const duration = preview?.duration || data.duration || '—'
    const cover = data.image || preview?.image || preview?.thumbnail

    const info = `ִֶָ☾. 𝗩𝗶𝗱𝗲𝗼 ִֶָ☾.
 𓍯  *Título:* ${trimText(title, 90)}
 𓍯  *Canal:* ${trimText(channel, 50)}
 𓍯  *Duración:* ${duration}
 𓍯  *Vistas:* ${formatViews(data.views || preview?.views)}
 𓍯  *Formato:* ${data.format || format}
 𓍯  *Enlace:* ${videoUrl}`

    if (cover) {
      try {
        const thumb = (await conn.getFile(cover)).data
        await conn.sendMessage(m.chat, {
          image: thumb,
          caption: info,
          contextInfo: { ...rcanal?.contextInfo }
        }, { quoted: m })
      } catch {
        await conn.sendMessage(m.chat, {
          text: info,
          contextInfo: { ...rcanal?.contextInfo }
        }, { quoted: m })
      }
    } else {
      await conn.sendMessage(m.chat, {
        text: info,
        contextInfo: { ...rcanal?.contextInfo }
      }, { quoted: m })
    }

    try {
      await conn.sendMessage(m.chat, {
        video: { url: videoDownload },
        caption: info,
        fileName: `${cleanFileName(title)}.mp4`,
        mimetype: 'video/mp4'
      }, { quoted: m })
    } catch {
      const res = await fetch(videoDownload)
      if (!res.ok) throw new Error('No se pudo descargar el archivo MP4.')
      const buffer = Buffer.from(await res.arrayBuffer())
      await conn.sendMessage(m.chat, {
        video: buffer,
        caption: info,
        fileName: `${cleanFileName(title)}.mp4`,
        mimetype: 'video/mp4'
      }, { quoted: m })
    }

    await conn.sendPresenceUpdate('paused', m.chat).catch(() => {})
  } catch (e) {
    console.error('Error en download-video:', e)
    return conn.sendMessage(m.chat, {
      text: typeof e === 'string'
        ? e
        : `[❌] Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`,
      contextInfo: { ...rcanal?.contextInfo }
    }, { quoted: m })
  }
}

handler.help = ['video <búsqueda/url/número>', 'ytmp4 <enlace>']
handler.command = ['download', 'downloadvideo', 'ytmp4', 'video', 'ytvideo']
handler.tags = ['descargas']
handler.group = true

export default handler
