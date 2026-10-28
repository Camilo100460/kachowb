import fetch from 'node-fetch'

const API_URL = 'https://ahm7xmakki.com/api/alldl'
const DEFAULT_TIMEOUT_MS = 12000

function httpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function failure(error) {
  return {
    success: false,
    title: null,
    platform: null,
    video: null,
    audio: null,
    thumbnail: null,
    qualities: [],
    error
  }
}

export async function downloadVideoWithAhm7(videoUrl, options = {}) {
  const inputUrl = httpUrl(videoUrl)
  if (!inputUrl) return failure('La URL del video no es válida.')

  const requestedTimeout = Number(options.timeoutMs)
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.min(Math.max(requestedTimeout, 1000), 15000)
    : DEFAULT_TIMEOUT_MS
  const fetchImpl = options.fetchImpl || fetch
  const endpoint = new URL(API_URL)
  endpoint.searchParams.set('url', inputUrl)

  let response
  let payload
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetchImpl(endpoint, {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      })
      const body = await response.text()
      try {
        payload = JSON.parse(body.replace(/^\uFEFF/, ''))
      } catch {
        if (response.status >= 500 && attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 400))
          continue
        }
        const kind = /^\s*</.test(body) ? 'HTML en vez de JSON' : 'JSON no válido'
        return failure(`La API AHM7 respondió con ${kind} (HTTP ${response.status}).`)
      }

      if (!response.ok && response.status >= 500 && attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 400))
        continue
      }
      if (!response.ok) {
        const detail = payload?.error || payload?.message || payload?.msg
        return failure(`La API AHM7 respondió HTTP ${response.status}${detail ? `: ${detail}` : '.'}`)
      }
      if (payload?.success !== true) {
        return failure(String(payload?.error || payload?.message || payload?.msg || 'AHM7 no pudo procesar este video.'))
      }
      break
    } catch (error) {
      if (attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 400))
        continue
      }
      const timedOut = error?.name === 'AbortError' || error?.name === 'TimeoutError'
      return failure(timedOut
        ? `La API AHM7 agotó el tiempo de espera (${timeoutMs} ms).`
        : `No se pudo conectar con la API AHM7: ${error?.message || 'error de red'}`)
    }
  }

  const media = payload.mediaInfo && typeof payload.mediaInfo === 'object'
    ? payload.mediaInfo
    : {}
  const qualities = Array.isArray(media.qualities)
    ? media.qualities
        .filter(item => item && typeof item === 'object')
        .map(item => ({ quality: String(item.quality || ''), url: httpUrl(item.url) }))
        .filter(item => item.url)
    : []
  const video = httpUrl(media.videoUrl) || qualities[0]?.url || null

  const audio = httpUrl(media.audioUrl)
  if (!audio && !video) {
    return failure('AHM7 indicó éxito, pero no devolvió audioUrl, videoUrl ni calidades descargables.')
  }

  return {
    success: true,
    title: typeof media.title === 'string' && media.title.trim() ? media.title.trim() : null,
    platform: typeof media.platform === 'string' && media.platform.trim() ? media.platform.trim() : null,
    video,
    audio,
    thumbnail: httpUrl(media.thumbnail),
    qualities,
    error: null
  }
}