import fetch from 'node-fetch'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const DOWNLOAD_TIMEOUT_MS = 20000
const CONVERSION_TIMEOUT_MS = 30000
const MAX_INPUT_BYTES = 64 * 1024 * 1024
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024

function validHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? value.trim() : null
  } catch {
    return null
  }
}

export async function convertUrlToMp3(url) {
  const mediaUrl = validHttpUrl(url)
  if (!mediaUrl) throw new Error('El proveedor devolvió una URL de audio no válida.')

  const response = await fetch(mediaUrl, {
    headers: { accept: 'audio/*, video/*;q=0.9, application/octet-stream;q=0.8' },
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
  })
  if (!response.ok) throw new Error(`El enlace multimedia respondió HTTP ${response.status}.`)

  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  if (contentType.includes('text/html') || contentType.includes('application/json')) {
    throw new Error(`El enlace devolvió ${contentType} en vez de un archivo multimedia.`)
  }

  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_INPUT_BYTES) {
    throw new Error('El archivo multimedia supera el límite de 64 MB.')
  }

  const input = Buffer.from(await response.arrayBuffer())
  if (!input.length) throw new Error('El enlace multimedia devolvió un archivo vacío.')
  if (input.length > MAX_INPUT_BYTES) throw new Error('El archivo multimedia supera el límite de 64 MB.')

  const directory = await fs.mkdtemp(join(tmpdir(), 'kachowbot-play-'))
  const outputPath = join(directory, 'audio.mp3')

  try {
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', 'pipe:0',
        '-map', '0:a:0',
        '-vn',
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        '-ar', '44100',
        '-ac', '2',
        '-write_xing', '1',
        '-id3v2_version', '3',
        '-f', 'mp3',
        outputPath
      ], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] })

      let errorOutput = ''
      let settled = false
      const timeout = setTimeout(() => {
        ffmpeg.kill()
        finish(new Error('La conversión a MP3 excedió el tiempo límite.'))
      }, CONVERSION_TIMEOUT_MS)

      function finish(error) {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        if (error) reject(error)
        else resolve()
      }

      ffmpeg.on('error', error => finish(new Error(`No se pudo iniciar FFmpeg: ${error.message}`)))
      ffmpeg.stderr.on('data', chunk => {
        if (errorOutput.length < 8192) errorOutput += chunk.toString()
      })
      ffmpeg.stdin.on('error', error => {
        if (error.code !== 'EPIPE') finish(new Error(`No se pudo procesar el archivo: ${error.message}`))
      })
      ffmpeg.on('close', code => {
        if (settled) return
        if (code !== 0) {
          finish(new Error(`FFmpeg no pudo extraer el audio${errorOutput.trim() ? `: ${errorOutput.trim()}` : '.'}`))
          return
        }
        finish()
      })

      ffmpeg.stdin.end(input)
    })

    const stat = await fs.stat(outputPath)
    if (!stat.size) throw new Error('FFmpeg no generó el MP3.')
    if (stat.size > MAX_OUTPUT_BYTES) throw new Error('El MP3 convertido supera el límite de 32 MB.')
    return await fs.readFile(outputPath)
  } finally {
    await fs.rm(directory, { recursive: true, force: true })
  }
}
