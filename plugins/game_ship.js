let handler = async (m, { conn, participants }) => {
  if (!m.isGroup) {
    return m.reply('Este comando solo funciona en grupos.')
  }

  try {
    const groupParticipants = participants?.length
      ? participants
      : (await conn.groupMetadata(m.chat)).participants || []
    const sender = conn.decodeJid?.(m.sender) || m.sender
    const bot = conn.decodeJid?.(conn.user?.jid || conn.user?.id) || conn.user?.jid || conn.user?.id
    const candidates = groupParticipants
      .map(participant => participant.id || participant.jid)
      .filter(Boolean)
      .filter(id => {
        const decodedId = conn.decodeJid?.(id) || id
        return decodedId !== sender && decodedId !== bot
      })

    if (!candidates.length) {
      return m.reply('No hay otra persona disponible para formar una pareja.')
    }

    const partner = candidates[Math.floor(Math.random() * candidates.length)]
    const partnerId = conn.decodeJid?.(partner) || partner
    const senderNumber = sender.split('@')[0]
    const partnerNumber = partnerId.split('@')[0]

    return conn.sendMessage(m.chat, {
      text: `💘 @${senderNumber} y @${partnerNumber} hacen una linda pareja 😍💕`,
      mentions: [sender, partnerId]
    }, { quoted: m })
  } catch (error) {
    console.error('Error al elegir pareja al azar:', error)
    return m.reply('No pude elegir una pareja en este momento.')
  }
}

handler.help = ['love', 'ship']
handler.tags = ['fun', 'group']
handler.command = ['love', 'ship']
handler.group = true

export default handler