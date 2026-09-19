import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text?.trim()) {
    return conn.sendMessage(m.chat, {
      text: `*[❗] Debes ingresar un texto para consultar a Copilot.*\n*Ejemplo:* ${usedPrefix + command} Hola, quien eres tu?`,
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  try {
    const query = encodeURIComponent(`Responde de forma breve y clara a este mensaje: ${text.trim()}`)
    const apiUrl = `https://api.delirius.online/ia/gemini?query=${query}`
    const { data } = await axios.get(apiUrl, { timeout: 60000 })

    const response = typeof data?.data?.result === 'string' ? data.data.result.trim() : ''

    if (!response) {
      return conn.sendMessage(m.chat, {
        text: '*[❗] No se pudo obtener una respuesta de Copilot.*',
        contextInfo: { ...rcanal.contextInfo }
      }, { quoted: m })
    }

    await conn.sendMessage(m.chat, {
      text: response,
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  } catch (e) {
    console.error('Error en ia-copilot:', e)
    return conn.sendMessage(m.chat, {
      text: '*[❌] Error al consultar a Copilot. Inténtalo de nuevo más tarde.*',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }
}

handler.help = ['#copilot <texto> → Chat con Copilot IA']
handler.tags = ['inteligencia']
handler.command = ['copilot', 'copi', 'msft', 'bing']

export default handler
