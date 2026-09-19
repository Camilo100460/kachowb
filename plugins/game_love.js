let handler = async (m, { conn, text, participants }) => {
  // 1. Determinar el usuario objetivo (mencionado, texto o aleatorio del grupo)
  let target
  if (m.mentionedJid && m.mentionedJid[0]) {
    target = m.mentionedJid[0]
  } else if (text?.trim()) {
    const number = text.trim().replace(/[^0-9]/g, '')
    if (number) target = `${number}@s.whatsapp.net`
  } else if (m.isGroup && participants) {
    const botJid = conn.user?.jid || conn.user?.id
    const members = participants.filter(p => p.id !== botJid && p.id !== m.sender && !p.admin)
    if (members.length > 0) {
      target = members[Math.floor(Math.random() * members.length)].id
    }
  }

  if (!target) {
    return conn.sendMessage(m.chat, { 
      text: '[❗] Etiqueta o menciona a alguien para calcular el amor.' 
    }, { quoted: m })
  }

  // 2. Calcular porcentaje y descripción
  const lovePercentage = Math.floor(Math.random() * 100) + 1
  let loveMessage = ''

  if (lovePercentage >= 80) {
    loveMessage = '¡El amor está en el aire! Son la pareja perfecta. 💖'
  } else if (lovePercentage >= 50) {
    loveMessage = 'Tienen un gran futuro juntos, hay bastante química. 💕'
  } else if (lovePercentage >= 20) {
    loveMessage = 'Hay una chispa, pero tendrán que esforzarse un poco. 👀'
  } else {
    loveMessage = 'Es mejor que se queden solo como amigos... 💔'
  }

  // 3. Estructura visual estandarizada
  const response = `
╭━━━━━━ ◜◌◝ ━━━━━━╮
│ 💘 *CALCULADORA DE AMOR*
│
├ • *Usuario 1:* @${m.sender.split('@')[0]}
├ • *Usuario 2:* @${target.split('@')[0]}
├ • *Porcentaje:* ${lovePercentage}%
├ • *Resultado:* ${loveMessage}
│
╰━━━━━━ ◟◌◞ ━━━━━━╯`

  // 4. Envío directo simple y estable
  await conn.sendMessage(m.chat, {
    text: response,
    mentions: [m.sender, target]
  }, { quoted: m })
}

handler.help = ['love']
handler.tags = ['fun']
handler.command = ['love', 'amor']

export default handler