let handler = async (m, { conn, participants }) => {
  if (!m.isGroup) return

  try {
    // 1. Filtrar al bot de la lista de participantes
    const botJid = conn.user?.jid || conn.user?.id
    const members = (participants || []).filter(p => p.id !== botJid)

    if (members.length === 0) {
      return conn.sendMessage(m.chat, { 
        text: '⚠️ [❗] No hay suficientes usuarios en el grupo.' 
      }, { quoted: m })
    }

    // 2. Mezclar aleatoriamente y seleccionar máximo 10 participantes
    const shuffled = [...members].sort(() => 0.5 - Math.random())
    const selectedUsers = shuffled.slice(0, Math.min(10, shuffled.length))

    // 3. Texto con la fuente en formato Sans-Serif Bold Italic
    let txt = `🍄 𝙏𝙊𝙋 𝙊𝙏𝘼𝙆𝙐𝙎 𝘿𝙀𝙇 𝙂𝙍𝙐𝙋𝙊\n\n`

    selectedUsers.forEach((user, index) => {
      const position = index + 1
      const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '🧡'
      txt += `${emoji} *${position}.* @${user.id.split('@')[0]}\n`
    })

    const mentions = selectedUsers.map(u => u.id)

    // 4. Enviar garantizando la visualización del texto
    return await conn.sendMessage(m.chat, {
      text: txt,
      mentions: mentions
    }, { quoted: m })

  } catch (e) {
    console.error('Error en topotakus:', e)
    return conn.sendMessage(m.chat, { 
      text: '❌ [❗] Ocurrió un error al generar el top de otakus del grupo.' 
    }, { quoted: m })
  }
}

handler.help = ['topotakus']
handler.tags = ['fun', 'group']
handler.command = ['topotakus', 'topotaku', 'otakus', 'otakutop']
handler.group = true

export default handler