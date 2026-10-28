import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROUND_DURATION_MS = 30_000
const MIN_REWARD = 250
const MAX_REWARD = 500

function normalizeAnswer(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getMessageText(m) {
  return m.text || m.body || m.msg?.text ||
    m.message?.extendedTextMessage?.text || m.message?.conversation || ''
}

export function createRiddleHandler({
  dataset,
  activeKey,
  commandName,
  title,
  categoryLabel,
  categories,
  defaultCategory,
  commands = [commandName],
  helpText
}) {
  const datasetPath = fileURLToPath(new URL(`../storage/databases/${dataset}`, import.meta.url))

  const handler = async (m, { conn, args = [], usedPrefix = '.', command = commandName }) => {
    try {
      global.db.data.users ||= {}
      global.db.data.users[m.sender] ||= { coins: 0 }

      const datasetContent = JSON.parse(fs.readFileSync(datasetPath, 'utf8'))
      let questions = datasetContent
      let selectedCategory
      if (categories) {
        const argumentList = Array.isArray(args) ? args : String(args || '').trim().split(/\s+/)
        const textCategory = String(m.text || '')
          .trim()
          .replace(new RegExp(`^\\S*${command}\\b`, 'i'), '')
          .trim()
          .split(/\s+/)[0]
        selectedCategory = String(argumentList[0] || textCategory || defaultCategory || '').toLowerCase()
        if (!categories.includes(selectedCategory)) {
          return conn.sendMessage(m.chat, {
            text: `Dificultad no válida. Usa: ${commands.map(name => `${usedPrefix}${name}`).join(', ')} ${categories.join(' | ')}`
          }, { quoted: m })
        }
        const matchingKey = Object.keys(datasetContent || {}).find(key => key.toLowerCase() === selectedCategory)
        questions = Array.isArray(datasetContent)
          ? datasetContent.filter(question => String(question?.categoria || '').toLowerCase() === selectedCategory)
          : datasetContent?.[matchingKey]
      }
      if (!Array.isArray(questions) || questions.length === 0) {
        console.error(`[${commandName}] No hay preguntas para categoría "${selectedCategory || 'todas'}" en ${datasetPath}`)
        return conn.sendMessage(m.chat, {
          text: categories
            ? `No hay preguntas disponibles para la dificultad *${selectedCategory}*. Comprueba la sección "${selectedCategory}" de ${dataset}.`
            : `No hay preguntas disponibles para ${title.toLowerCase()} ahora.`
        }, { quoted: m })
      }

      const question = questions[Math.floor(Math.random() * questions.length)]
      global.db.data[activeKey] ||= {}
      const round = {
        pregunta: question.pregunta,
        respuesta: question.respuesta,
        activa: true,
        creadaPor: m.sender,
        timestamp: Date.now(),
        expiresAt: Date.now() + ROUND_DURATION_MS,
        respondida: false,
        messageId: ''
      }
      global.db.data[activeKey][m.chat] = round

      const sent = await conn.sendMessage(m.chat, {
        text: `${title}\n> *Pregunta:* ${question.pregunta}\n> *Premio:* 250-500 ${global.moneda}\n> *Tiempo:* 30 segundos${categoryLabel ? `\n> *${categoryLabel}:* ${question.categoria || selectedCategory || 'General'}` : ''}`,
        contextInfo: { mentionedJid: [m.sender] }
      }, { quoted: m })

      round.messageId = sent?.key?.id || sent?.message?.key?.id || ''
      await global.db.write()

      const roundId = round.messageId || String(round.timestamp)
      const expiryTimer = setTimeout(async () => {
        const current = global.db?.data?.[activeKey]?.[m.chat]
        const currentId = current?.messageId || String(current?.timestamp || '')
        if (!current?.activa || currentId !== roundId) return

        current.activa = false
        current.respondida = true
        await global.db.write().catch(error => console.error(`Error guardando expiración de ${commandName}:`, error))
        await conn.sendMessage(m.chat, {
          text: `⏱️ Se acabó el tiempo. La respuesta era *${current.respuesta}*.`
        }).catch(() => {})
      }, ROUND_DURATION_MS)
      expiryTimer.unref?.()
      return sent
    } catch (error) {
      console.error(`Error iniciando ${commandName}:`, error)
      return conn.sendMessage(m.chat, {
        text: `[❌] No pude iniciar ${commandName}: ${error?.message || 'error desconocido'}`
      }, { quoted: m })
    }
  }

  handler.all = async (m, { conn }) => {
    const quotedId = m.quoted?.id || m.msg?.contextInfo?.stanzaId || ''
    const hasQuotedMessage = Boolean(m.quoted || m.msg?.contextInfo?.quotedMessage)
    if (!m.chat || (!quotedId && !hasQuotedMessage) || !m.sender) return

    const round = global.db?.data?.[activeKey]?.[m.chat]
    if (!round?.activa || (round.messageId && quotedId && round.messageId !== quotedId)) return

    if (Date.now() >= round.expiresAt) {
      round.activa = false
      round.respondida = true
      await global.db.write()
      return conn.sendMessage(m.chat, {
        text: `⏱️ Se acabó el tiempo. La respuesta era *${round.respuesta}*.`
      }).catch(() => {})
    }

    const answer = normalizeAnswer(getMessageText(m))
    if (!answer) return

    if (answer !== normalizeAnswer(round.respuesta)) {
      return conn.sendMessage(m.chat, {
        react: { text: '❌', key: m.key }
      }).catch(() => {})
    }

    global.db.data.users ||= {}
    const user = global.db.data.users[m.sender] ||= { coins: 0 }
    const reward = Math.floor(Math.random() * (MAX_REWARD - MIN_REWARD + 1)) + MIN_REWARD
    user.coins = (Number(user.coins) || 0) + reward
    round.activa = false
    round.respondida = true
    round.ganador = m.sender
    round.premio = reward
    await global.db.write()

    return conn.sendMessage(m.chat, {
      text: `🎉 ¡Correcto, @${m.sender.split('@')[0]}! Ganaste *${reward} ${global.moneda}*.`,
      contextInfo: { mentionedJid: [m.sender] }
    }, { quoted: m })
  }

  handler.tags = ['juegos', 'economía']
  handler.command = commands
  handler.help = [helpText || `.${commandName} (responde citando la pregunta; premio de 250-500 monedas)`]
  return handler
}
