import { spawn } from 'child_process'
import { mkdir, readdir, rm, stat, utimes } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'
import yts from 'yt-search'

const MAX_DURATION_SECONDS = 10 * 60
const MAX_AUDIO_BYTES = 50 * 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 180_000
const MAX_CONCURRENT_DOWNLOADS = 2
const MAX_CACHE_BYTES = 500 * 1024 * 1024
const MAX_CACHE_FILES = 100
const SEARCH_CACHE_TTL_MS = 30 * 60 * 1000
const MAX_SEARCH_CACHE_ENTRIES = 200
const CACHE_DIRECTORY = path.join(tmpdir(), 'painbot-audio-cache')

const searchCache = new Map()
const titleCache = new Map()
const inFlight = new Map()
const waitingDownloads = []
let activeDownloads = 0

function safeTitle(value) {
  return String(value || 'audio')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'audio'
}

function youtubeUrl(value) {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) {
      return null
    }
    return url.href
  } catch {
    return null
  }
}

function getVideoId(url) {
  try {
    const parsed = new URL(url)
    const id = parsed.hostname.toLowerCase() === 'youtu.be'
      ? parsed.pathname.slice(1).split('/')[0]
      : parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1]
    return /^[\w-]{11}$/.test(id || '') ? id : null
  } catch {
    return null
  }
}

// Límite de descargas simultáneas: las demás esperan su turno
const acquireSlot = () => new Promise(resolve => {
  if (activeDownloads < MAX_CONCURRENT_DOWNLOADS) {
    activeDownloads++
    resolve()
  } else {
    waitingDownloads.push(resolve)
  }
})

const releaseSlot = () => {
  const next = waitingDownloads.shift()
  if (next) next()
  else activeDownloads--
}

// Busca un audio ya descargado en la caché
async function findCachedFile(videoId) {
  try {
    const files = await readdir(CACHE_DIRECTORY)
    const file = files.find(name => name.startsWith(`${videoId}.`) && !/\.(part|ytdl|temp)$/.test(name))
    if (!file) return null
    const filePath = path.join(CACHE_DIRECTORY, file)
    const { size } = await stat(filePath)
    if (!size) return null
    const now = new Date()
    utimes(filePath, now, now).catch(() => {})
    return { filePath, file, size }
  } catch {
    return null
  }
}

async function removeVideoFiles(videoId) {
  try {
    const files = await readdir(CACHE_DIRECTORY)
    await Promise.all(files
      .filter(name => name.startsWith(`${videoId}.`))
      .map(name => rm(path.join(CACHE_DIRECTORY, name), { force: true })))
  } catch {}
}

// Borra los audios menos usados si la caché supera sus límites
async function pruneCache() {
  try {
    const names = await readdir(CACHE_DIRECTORY)
    const files = []
    for (const name of names) {
      const filePath = path.join(CACHE_DIRECTORY, name)
      const info = await stat(filePath).catch(() => null)
      if (info?.isFile()) files.push({ filePath, size: info.size, mtime: info.mtimeMs })
    }
    files.sort((a, b) => a.mtime - b.mtime)
    let total = files.reduce((sum, file) => sum + file.size, 0)
    let count = files.length
    for (const file of files) {
      if (total <= MAX_CACHE_BYTES && count <= MAX_CACHE_FILES) break
      await rm(file.filePath, { force: true })
      total -= file.size
      count--
    }
  } catch {}
}

function runYtDlp(url, outputTemplate) {
  const configuredPath = process.env.YTDLP_PATH?.trim()
  const candidates = configuredPath
    ? [{ command: configuredPath, prefixArgs: [] }]
    : process.platform === 'win32'
      ? [
          { command: 'yt-dlp.exe', prefixArgs: [] },
          { command: 'py', prefixArgs: ['-3', '-m', 'yt_dlp'] },
          { command: 'python', prefixArgs: ['-m', 'yt_dlp'] }
        ]
      : [
          { command: 'yt-dlp', prefixArgs: [] },
          { command: 'python3', prefixArgs: ['-m', 'yt_dlp'] },
          { command: 'python', prefixArgs: ['-m', 'yt_dlp'] }
        ]

  const args = [
    '--no-playlist',
    '--no-progress',
    '--no-warnings',
    '--no-mtime',
    '--retries', '2',
    '--socket-timeout', '15',
    '--js-runtimes', 'node',
    '--remote-components', 'ejs:github',
    '--format', '140/bestaudio[ext=m4a]/bestaudio',
    '--max-filesize', '50M',
    '--match-filter', `duration <= ${MAX_DURATION_SECONDS}`,
    '--output', outputTemplate,
    url
  ]
  const runCandidate = candidate => new Promise((resolve, reject) => {
    const child = spawn(candidate.command, [...candidate.prefixArgs, ...args], {
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe']
    })
    let stderr = ''
    let spawnError = null
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill()
    }, DOWNLOAD_TIMEOUT_MS)

    child.stderr.on('data', chunk => {
      if (stderr.length < 12000) stderr += chunk.toString()
    })
    child.once('error', error => {
      spawnError = error
    })
    child.once('close', code => {
      clearTimeout(timeout)
      if (spawnError) {
        reject(spawnError)
      } else if (timedOut) {
        reject(new Error('yt-dlp excedió el tiempo límite de descarga.'))
      } else if (code === 0) {
        resolve()
      } else {
        reject(new Error(stderr.trim() || `yt-dlp terminó con código ${code}.`))
      }
    })
  })

  return (async () => {
    let lastMissingCommand
    for (const candidate of candidates) {
      try {
        await runCandidate(candidate)
        return
      } catch (error) {
        if (error.code === 'ENOENT' && !configuredPath) {
          lastMissingCommand = error
          continue
        }
        if (error.code === 'ENOENT') {
          throw new Error(`No se encontró yt-dlp en YTDLP_PATH (${configuredPath}).`)
        }
        throw new Error(`yt-dlp no pudo descargar el audio: ${error.message}`)
      }
    }
    throw new Error(
      `No se encontró yt-dlp ni el módulo Python yt_dlp. Instálalo con ` +
      `“python -m pip install -U yt-dlp”. ${lastMissingCommand?.message || ''}`.trim()
    )
  })()
}

// Descarga una canción a la caché; si ya hay una descarga en curso de la misma, la reutiliza
function downloadAudio(videoId, url) {
  if (inFlight.has(videoId)) return inFlight.get(videoId)

  const task = (async () => {
    await mkdir(CACHE_DIRECTORY, { recursive: true })
    await acquireSlot()
    try {
      await runYtDlp(url, path.join(CACHE_DIRECTORY, `${videoId}.%(ext)s`))
      const audio = await findCachedFile(videoId)
      if (!audio) {
        throw new Error('yt-dlp no generó un archivo de audio (el video puede superar los 10 minutos o los 50 MB).')
      }
      if (audio.size > MAX_AUDIO_BYTES) throw new Error('El audio supera el límite de 50 MB.')
      pruneCache()
      return audio
    } catch (error) {
      await removeVideoFiles(videoId)
      throw error
    } finally {
      releaseSlot()
    }
  })().finally(() => inFlight.delete(videoId))

  inFlight.set(videoId, task)
  return task
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const query = text?.trim()
  if (!query) {
    return conn.sendMessage(m.chat, {
      text: `Uso: ${usedPrefix + command} <canción o enlace de YouTube>\nEjemplo: ${usedPrefix + command} luna`,
      contextInfo: { ...rcanal?.contextInfo }
    }, { quoted: m })
  }

  try {
    conn.sendMessage(m.chat, {
      react: { text: '⏳', key: m.key }
    }).catch(() => {})

    const startedAt = performance.now()
    let url = youtubeUrl(query)
    let videoId = url ? getVideoId(url) : null
    let title = (videoId && titleCache.get(videoId)) || 'audio'

    if (!url) {
      const searchKey = query.toLowerCase()
      let found = searchCache.get(searchKey)
      if (!found || Date.now() - found.at > SEARCH_CACHE_TTL_MS) {
        const result = await yts.search({ query, hl: 'es', gl: 'ES' })
        const video = result?.videos?.[0]
        if (!video?.url) throw new Error('No se encontraron resultados para esa búsqueda.')
        found = {
          at: Date.now(),
          url: youtubeUrl(video.url),
          videoId: video.videoId,
          title: safeTitle(video.title),
          seconds: Number(video.seconds)
        }
        if (searchCache.size >= MAX_SEARCH_CACHE_ENTRIES) {
          searchCache.delete(searchCache.keys().next().value)
        }
        searchCache.set(searchKey, found)
      }
      if (found.seconds > MAX_DURATION_SECONDS) {
        throw new Error('El video supera el límite de 10 minutos.')
      }
      url = found.url
      videoId = found.videoId
      title = found.title
    }
    if (!url || !videoId) throw new Error('El enlace debe ser un video válido de YouTube.')
    if (title !== 'audio') titleCache.set(videoId, title)
    const searchedAt = performance.now()

    let audio = await findCachedFile(videoId)
    const fromCache = Boolean(audio)
    if (!audio) audio = await downloadAudio(videoId, url)
    const downloadedAt = performance.now()

    const extension = path.extname(audio.file).toLowerCase()
    const mimetype = extension === '.m4a'
      ? 'audio/mp4'
      : extension === '.opus' || extension === '.ogg'
        ? 'audio/ogg; codecs=opus'
        : 'audio/webm'

    await conn.sendMessage(m.chat, {
      audio: { url: audio.filePath },
      fileName: `${title}${extension}`,
      mimetype,
      ptt: false
    }, { quoted: m })
    const sentAt = performance.now()

    const seconds = (from, to) => ((to - from) / 1000).toFixed(1)
    console.log(
      `[play] búsqueda ${seconds(startedAt, searchedAt)}s | descarga ${seconds(searchedAt, downloadedAt)}s` +
      `${fromCache ? ' (caché)' : ''} | envío ${seconds(downloadedAt, sentAt)}s | ${(audio.size / 1024 / 1024).toFixed(1)} MB`
    )

    conn.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    }).catch(() => {})
  } catch (error) {
    const message = error?.message || 'Error desconocido.'
    console.error(`[play] No se pudo completar la descarga: ${message}`)
    await conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    }).catch(() => {})
  }
}

handler.help = [
  'play, spotify o music <búsqueda o enlace de YouTube> - Envía directamente el audio local con yt-dlp',
  'Requisitos: yt-dlp y Node.js instalados en el servidor del bot'
]
handler.command = ['play', 'spotify', 'music']
handler.tags = ['descargas']
handler.group = true

export default handler
