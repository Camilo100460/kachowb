const MAX_SAVED_MESSAGES = 50
const MAX_DISPLAYED_MESSAGES = 50
const MAX_MESSAGE_LENGTH = 1000

function getMessageText(message) {
  const content = message?.message || {}
  const text = content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    content.documentWithCaptionMessage?.message?.documentMessage?.caption

  if (text) return String(text).slice(0, MAX_MESSAGE_LENGTH)

  const type = Object.keys(content).find(key => key !== 'messageContextInfo')
  const labels = {
    imageMessage: 'Imagen',
    videoMessage: 'Video',
    audioMessage: 'Audio',
    documentMessage: 'Documento',
    stickerMessage: 'Sticker',
    contactMessage: 'Contacto',
    locationMessage: 'Ubicación'
  }

  return labels[type] || 'Mensaje adjunto'
}

async function saveDeletedMessage(m, conn) {
  if (!m.isGroup || m.mtype !== 'protocolMessage') return

  const deletedKey = m.msg?.key
  const chatId = deletedKey?.remoteJid || m.chat
  const messageId = deletedKey?.id
  if (!chatId || !messageId) return

  const chat = conn.chats?.[chatId] ||
    conn.chats?.[conn.decodeJid?.(chatId) || chatId]
  const original = chat?.messages?.[messageId] || conn.loadMessage?.(messageId)
  if (!original?.message) return

  if (!global.db.data.deletedMessages) global.db.data.deletedMessages = {}
  if (!global.db.data.deletedMessages[chatId]) global.db.data.deletedMessages[chatId] = []
  const history = global.db.data.deletedMessages[chatId]

  if (history.some(entry => entry.id === messageId)) return

  const sender = original.key?.participant || original.participant || deletedKey.participant || ''
  history.push({
    id: messageId,
    sender: conn.decodeJid?.(sender) || sender,
    text: getMessageText(original),
    deletedAt: Date.now()
  })

  if (history.length > MAX_SAVED_MESSAGES) {
    history.splice(0, history.length - MAX_SAVED_MESSAGES)
  }

  await global.db.write()
}

let handler = async (m, { conn, args }) => {
  if (!m.isGroup) return m.reply('Este comando solo funciona en grupos.')

  const requestedCount = args[0] === undefined ? 5 : Number(args[0])
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > MAX_DISPLAYED_MESSAGES) {
    return m.reply(`Indica una cantidad del 1 al ${MAX_DISPLAYED_MESSAGES}. Ejemplo: .borrados 10`)
  }

  const history = global.db.data.deletedMessages?.[m.chat] || []
  if (!history.length) return m.reply('No hay mensajes eliminados guardados recientemente.')

  const messages = history.slice(-requestedCount).reverse()
  const text = messages.map((entry, index) => {
    const senderNumber = entry.sender ? entry.sender.split('@')[0] : 'Desconocido'
    return `🗑️ *Mensaje eliminado ${index + 1}*\n👤 @${senderNumber}\n💬 ${entry.text}`
  }).join('\n\n')
  const mentions = [...new Set(messages.map(entry => entry.sender).filter(Boolean))]

  return conn.sendMessage(m.chat, { text, mentions }, { quoted: m })
}

handler.all = async function (m, { conn }) {
  await saveDeletedMessage(m, conn)
}

handler.help = ['borrados [cantidad]']
handler.tags = ['group']
handler.command = ['borrados', 'barrados']
handler.group = true

export default handler
