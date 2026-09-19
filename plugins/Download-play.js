import fetch from "node-fetch"

const handler = async (m, { conn, text, usedPrefix }) => {
  try {
    if (!text?.trim())
      return conn.sendMessage(m.chat, {
        text: " ִֶָ☾. Ingresa el nombre o enlace de YouTube."
      }, { quoted: m })

    const isUrl = /youtu\.be|youtube\.com/.test(text)
    let videoUrl
    let title = "Desconocido"

    if (isUrl) {
      videoUrl = text.trim()
    } else {
      
      const searchUrl = `https://api.delirius.online/search/ytsearch?q=${encodeURIComponent(text)}`
      const sres = await fetch(searchUrl).then(r => r.json())
      if (!sres?.status || !Array.isArray(sres.data) || sres.data.length === 0)
        throw "[❗] No se encontraron resultados para la búsqueda."
      const first = sres.data[0]
      videoUrl = first.url || `https://youtu.be/${first.videoId}`
      title = first.title || title
    }

    
    const downloadApi = `https://api.delirius.online/download/ytmp3?url=${encodeURIComponent(videoUrl)}`
    const dres = await fetch(downloadApi).then(r => r.json())
    if (!dres?.status || !dres.data)
      throw "[❗] No se pudo obtener el audio desde la URL."

    const infoData = dres.data
    const audioUrl = typeof infoData.download === "string" ? infoData.download : infoData.download?.url
    title = infoData.title || title

    if (!audioUrl)
      throw "[❗] No se encontró la URL del audio."

    await conn.sendMessage(
      m.chat,
      { audio: { url: audioUrl }, fileName: `${title}.mp3`, mimetype: "audio/mpeg" },
      { quoted: m }
    )

  } catch (e) {
    return conn.sendMessage(m.chat, {
      text: typeof e === "string"
        ? e
        : `[❌] Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`
    }, { quoted: m })
  }
}

handler.command = ["play", "ytmp3", "playaudio"]
handler.tags = ["descargas"]
handler.group = true

export default handler

function formatViews(views) {
  if (views === undefined) return "No disponible"
  if (views >= 1_000_000_000) return `${(views / 1_000_000_000).toFixed(1)}B (${views.toLocaleString()})`
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1)}M (${views.toLocaleString()})`
  if (views >= 1_000) return `${(views / 1_000).toFixed(1)}k (${views.toLocaleString()})`
  return views.toString()
}
