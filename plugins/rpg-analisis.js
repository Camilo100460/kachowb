import fs from 'fs'
import { join } from 'path'

const ANSWER_TIME_MS = 30_000

let handler = async (m, { conn }) => {
  try {
    const ruta = join('./storage/databases/analisis.json')

    let analisis

    try {
      analisis = JSON.parse(fs.readFileSync(ruta, 'utf8'))
    } catch (error) {
      console.error('Error leyendo analisis.json:', error)

      return conn.sendMessage(m.chat, {
        text: '❌ *ERROR*\n\nNo se pudo cargar la base de datos de análisis.',
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }

    if (!Array.isArray(analisis) || analisis.length === 0) {
      return conn.sendMessage(m.chat, {
        text: '⚠️ No hay preguntas disponibles actualmente.',
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }

    // Elegir pregunta aleatoria
    const pregunta = analisis[
      Math.floor(Math.random() * analisis.length)
    ]

    // Crear sistema de análisis activos
    if (!global.db.data.analisisActivos) {
      global.db.data.analisisActivos = {}
    }

    // No reemplazar una pregunta que todavía se puede responder.
    const current = global.db.data.analisisActivos[m.chat]
    if (current?.activa && Date.now() < current.expiresAt) {
      return conn.sendMessage(m.chat, {
        text: 'Ya hay un análisis activo. Responde A, B, C o D antes de iniciar otro.'
      }, { quoted: m })
    }

    const round = {
      pregunta: pregunta.pregunta,
      opciones: pregunta.opciones,
      respuesta: pregunta.respuesta.toUpperCase(),
      explicacion: pregunta.explicacion,
      materia: pregunta.materia,
      tema: pregunta.tema,
      creador: m.sender,
      timestamp: Date.now(),
      expiresAt: Date.now() + ANSWER_TIME_MS,
      activa: true
    }
    global.db.data.analisisActivos[m.chat] = round

    const texto = `
╭━━━〔 📚 𝑨𝑵𝑨́𝑳𝑰𝑺𝑰𝑺 〕━━━╮

 📖 *Materia:* ${pregunta.materia}
 📝 *Tema:* ${pregunta.tema}

 ❓ *Pregunta:*
 ${pregunta.pregunta}

 🅰️ *A)* ${pregunta.opciones.A}

 🅱️ *B)* ${pregunta.opciones.B}

 🅲️ *C)* ${pregunta.opciones.C}

 🅳️ *D)* ${pregunta.opciones.D}

`

    const sent = await conn.sendMessage(m.chat, {
      text: texto,
      contextInfo: {
        ...rcanal.contextInfo,
        mentionedJid: [m.sender]
      }
    }, { quoted: m })
    round.messageId = sent?.key?.id || sent?.message?.key?.id || ''
    await global.db.write()

    const roundId = round.messageId || String(round.timestamp)
    const timer = setTimeout(async () => {
      const active = global.db?.data?.analisisActivos?.[m.chat]
      const activeId = active?.messageId || String(active?.timestamp || '')
      if (!active?.activa || activeId !== roundId) return

      active.activa = false
      try {
        await global.db.write()
      } catch (error) {
        console.error('Error guardando vencimiento del análisis:', error)
      }
      try {
        await conn.sendMessage(m.chat, {
          text: `⏱️ Se acabó el tiempo. La respuesta era *${active.respuesta}*.\n\n${active.explicacion}`
        })
      } catch (error) {
        console.error('Error notificando el vencimiento del análisis:', error)
      }
    }, ANSWER_TIME_MS)
    timer.unref?.()
    return sent

  } catch (error) {
    console.error('Error en comando analisis:', error)

    return conn.sendMessage(m.chat, {
      text: '❌ Ocurrió un error al iniciar el análisis.',
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
}

const handleAnalysisAnswer = async (m, { conn }) => {
  if (!m.chat || !m.sender) return
  const answer = String(
    m.text ||
    m.body ||
    m.msg?.text ||
    m.message?.extendedTextMessage?.text ||
    m.message?.conversation ||
    ''
  ).trim().toUpperCase()
  if (!/^[A-D]$/.test(answer)) return

  const round = global.db?.data?.analisisActivos?.[m.chat]
  if (!round?.activa) return

  m.commandExecuted = true
  if (Date.now() >= round.expiresAt) {
    round.activa = false
    try {
      await conn.sendMessage(m.chat, { react: { text: '⏰', key: m.key } })
    } catch (error) {
      console.error('Error reaccionando a una respuesta tardía del análisis:', error)
    }
    await global.db.write().catch(error => console.error('Error guardando vencimiento del análisis:', error))
    return
  }

  round.activa = false
  try {
    await conn.sendMessage(m.chat, {
      react: { text: answer === round.respuesta ? '✅' : '❌', key: m.key }
    })
  } catch (error) {
    console.error('Error reaccionando a la respuesta del análisis:', error)
  }
  const isCorrect = answer === round.respuesta
  const correctOption = round.opciones?.[round.respuesta]
  const resultMessage = isCorrect
    ? `✅ ¡Correcto!\n\n${round.explicacion}`
    : `❌ Incorrecto. La respuesta correcta era *${round.respuesta}${correctOption ? `) ${correctOption}` : ''}*.\n\n${round.explicacion}`
  try {
    await conn.sendMessage(m.chat, {
      text: resultMessage,
      contextInfo: { mentionedJid: [m.sender] }
    }, { quoted: m })
  } catch (error) {
    console.error('Error enviando el resultado y la explicación del análisis:', error)
  }
  await global.db.write().catch(error => console.error('Error guardando respuesta del análisis:', error))
}

handler.before = handleAnalysisAnswer
handler.all = handleAnalysisAnswer

handler.help = [
  'analisis',
  'ana'
]

handler.tags = [
  'educación'
]

handler.command = [
  'analisis',
  'tenso'
]

export default handler