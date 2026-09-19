const MIN_DELAY_MS = 0
const MAX_DELAY_MS = 60_000
const BROADCAST_MESSAGE = `🎀🩷  𝑳𝑳𝑬𝑵𝑬𝑵 𝑮𝑹𝑼𝑷𝑶𝑺 𝑺𝑰𝑵 𝑩𝑶𝑻𝑺  🩷🎀

https://chat.whatsapp.com/KsQCm4dDnkUCczAr6VZIUB`

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

let handler = async (m, { conn, command, isOwner }) => {
  if (!isOwner) {
    return m.reply('[❗] Solo el owner puede usar este comando.')
  }

  if (!BROADCAST_MESSAGE.trim()) {
    return m.reply('[❌] Configura el mensaje de difusión en el código.')
  }

  if (typeof conn.groupFetchAllParticipating !== 'function') {
    return m.reply('[❌] Esta conexión no permite obtener la lista de grupos.')
  }

  const groups = await conn.groupFetchAllParticipating().catch(error => {
    console.error('Error obteniendo grupos para difusión:', error)
    return null
  })

  const groupIds = Object.keys(groups || {}).filter(jid => jid.endsWith('@g.us'))
  if (!groupIds.length) {
    return m.reply('[❗] No se encontraron grupos para enviar el mensaje.')
  }

  await m.reply(`📢 Iniciando difusión a ${groupIds.length} grupos.\nRango aleatorio entre mensajes: 0 a 1 minuto.`)

  let sentCount = 0
  let failedCount = 0

  for (const groupId of groupIds) {
    try {
      await conn.sendMessage(groupId, { text: BROADCAST_MESSAGE })
      sentCount++
    } catch (error) {
      failedCount++
      console.error(`Error enviando difusión a ${groupId}:`, error?.message || error)
    }

    if (groupId !== groupIds[groupIds.length - 1]) {
      const delay = Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) + MIN_DELAY_MS
      await wait(delay)
    }
  }

  return m.reply(
    `✅ Difusión terminada.\n\n` +
    `> Enviados: ${sentCount}\n` +
    `> Fallidos: ${failedCount}\n` +
    `> Total: ${groupIds.length}`
  )
}

handler.help = ['bcgrupo']
handler.tags = ['owner']
handler.command = ['bcgrupo']
handler.owner = true

export default handler
