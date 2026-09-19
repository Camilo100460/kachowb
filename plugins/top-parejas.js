let handler = async (m, { conn, participants }) => {
  if (!m.isGroup) return

  try {
    // 1. Filtrar al bot de la lista de participantes
    const botJid = conn.user?.jid || conn.user?.id
    const members = (participants || []).filter(p => p.id !== botJid)

    if (members.length < 2) {
      return conn.sendMessage(m.chat, { 
        text: '⚠️ [❗] Se necesitan al menos 2 usuarios para crear parejas.' 
      }, { quoted: m })
    }

    // 2. Mezclar aleatoriamente y formar hasta 10 parejas
    const shuffled = [...members].sort(() => 0.5 - Math.random())
    const maxPairs = Math.min(10, Math.floor(shuffled.length / 2))
    const pairs = []

    for (let i = 0; i < maxPairs; i++) {
      pairs.push({
        user1: shuffled[i * 2],
        user2: shuffled[i * 2 + 1]
      })
    }

    // 3. Texto con la fuente en formato Sans-Serif Bold Italic
    let txt = `💕 𝙏𝙊𝙋 𝙋𝘼𝙍𝙀𝙅𝘼𝙎 𝘿𝙀𝙇 𝙂𝙍𝙐𝙋𝙊\n\n`

    pairs.forEach((pair, index) => {
      const position = index + 1
      const emoji = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '💕'
      txt += `${emoji} *${position}.* @${pair.user1.id.split('@')[0]} 💕 @${pair.user2.id.split('@')[0]}\n`
    })

    const mentions = pairs.flatMap(p => [p.user1.id, p.user2.id])

    // 4. Enviar garantizando la visualización del texto
    return await conn.sendMessage(m.chat, {
      text: txt,
      mentions: mentions
    }, { quoted: m })

  } catch (e) {
    console.error('Error en topparejas:', e)
    return conn.sendMessage(m.chat, { 
      text: '❌ [❗] Ocurrió un error al generar el top de parejas del grupo.' 
    }, { quoted: m })
  }
}

handler.help = ['topparejas']
handler.tags = ['fun', 'group']
handler.command = ['topparejas', 'toppareja', 'parejas', 'parejatop']
handler.group = true

export default handler