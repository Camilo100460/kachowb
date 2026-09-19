let handler = async (m, { conn }) => {
  if (!m.isGroup) {
    return m.reply('[❗] Este comando solo funciona en grupos.')
  }

  try {
    const inviteCode = await conn.groupInviteCode(m.chat)
    const inviteLink = `https://chat.whatsapp.com/${inviteCode}`
    return conn.sendMessage(m.chat, {
      text: `🔗 • 𝙇𝙞𝙣𝙠 𝙙𝙚𝙡 𝙂𝙧𝙪𝙥𝙤:\n${inviteLink}`
    }, { quoted: m })
  } catch (error) {
    console.error('Error obteniendo el enlace del grupo:', error)
    return m.reply('[❌] No se pudo obtener el enlace. Verifica que el bot tenga permisos de administrador.')
  }
}

handler.help = ['linkgroup']
handler.tags = ['grupo']
handler.command = ['linkgroup']
handler.group = true
handler.botAdmin = true

export default handler
