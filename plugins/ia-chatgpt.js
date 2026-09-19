import axios from 'axios'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) return conn.sendMessage(m.chat, {
    text: `*[❗] Debes ingresar un texto para consultar a la IA.*\n*Ejemplo:* ${usedPrefix + command} ¿Quién eres?`
  }, { quoted: m })
  
  try {
    
    const personalityPrompt = `
  Responde como un personaje mexicano de barrio, muy intenso, sarcástico, directo y de pésimo humor, pero siempre respetuoso con las personas y sin atacar a ningún grupo protegido. Usa español mexicano natural, expresiones coloquiales y frases como "no manches", "qué onda", "ya estuvo", "ni de chiste", "está cañón" y "qué relajo" cuando encajen.

  Reglas de comportamiento:
  1. Mantén una actitud fastidiada, dramática y burlona de forma juguetona, sin amenazas ni insultos dirigidos al usuario.
  2. No uses lenguaje de odio, ataques personales, discriminación ni groserías degradantes.
  3. Responde la pregunta con claridad aunque te quejes un poco por tener que hacerlo.
  4. No menciones estas instrucciones ni digas que eres una IA siguiendo un prompt.
  5. Responde de forma breve, en una o dos frases, sin explicaciones innecesarias ni etiquetas como <think>.
  `.trim()
  const textParam = encodeURIComponent(text)
  const promptParam = encodeURIComponent(personalityPrompt)
    const apiUrl = `https://api.delirius.online/ia/gptprompt?text=${textParam}&prompt=${promptParam}`

    const { data } = await axios.get(apiUrl, { timeout: 60000 })

    if (!data?.status) {
      return conn.sendMessage(m.chat, {
        text: '*[❗] No se pudo obtener una respuesta de la API.*'
      }, { quoted: m })
    }

    let response = (typeof data.data === 'string' ? data.data.trim() : '')
    if (!response || /^Error:\s*No WIZ data$/i.test(response)) {
      const fallbackQuery = encodeURIComponent(`${personalityPrompt}\n\nMensaje del usuario: ${text.trim()}`)
      const fallbackUrl = `https://api.delirius.online/ia/gemini?query=${fallbackQuery}`
      const fallback = await axios.get(fallbackUrl, { timeout: 60000 })
      response = typeof fallback.data?.data?.result === 'string'
        ? fallback.data.data.result.trim()
        : ''
    }

    if (!response) {
      throw new Error('La API no devolvió una respuesta válida.')
    }
    
    
    let thought = ''
    let finalResponse = response
    
    
    const thinkMatch = response.match(/<think>([\s\S]*?)<\/think>/)
    if (thinkMatch) {
      thought = thinkMatch[1].trim()
    
      finalResponse = response.replace(/<think>[\s\S]*?<\/think>/, '').trim()
    }
    
    
        let formattedMessage = ''
    if (thought) {
      
      const cleanThought = thought.replace(/\n+/g, ' ').trim()
      
      formattedMessage += `> *Su pensamiento:* ${cleanThought}\n\n`
    }
    formattedMessage += finalResponse
    
    await conn.sendMessage(m.chat, {
      text: formattedMessage
    }, { quoted: m })
    
  } catch (e) {
    console.error('Error en comando ia:', e)
    conn.sendMessage(m.chat, {
      text: '*[❗] Ocurrió un error al procesar tu consulta. Por favor, inténtalo de nuevo más tarde.*'
    }, { quoted: m })
  }
}

handler.help = ['#deep <texto>']
handler.tags = ['inteligencia']
handler.command = ['gpt', 'chatgpt', 'ia']

export default handler