let handler = async (m, { conn, text, args }) => {
  const who = m.mentionedJid?.[0]
    ? m.mentionedJid[0]
    : args[0] 
      ? args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net' 
      : m.sender

  const user = global.db.data.users[who]
  if (!user) {
    return conn.reply(
      m.chat,
      '╭━〔 💰 _*ECONOMÍA*_ 〕━╮\n┃ Ese usuario aún no está registrado.\n╰━━━━━━━━━━━━╯',
      m,
      rcanal,
      { mentions: [who] }
    )
  }

  const coins = Number(user.coins) || 0
  const name = await conn.getName(who)
  const formattedCoins = new Intl.NumberFormat('es-ES').format(coins)

  return conn.sendMessage(m.chat, {
    text: `╭━━〔 💰 _*ECONOMÍA*_ 〕━━╮
┃
┃ 👤 *${name || 'Usuario'}*
┃ 🪙 *Saldo:* *${formattedCoins} coins*
╰━━━━━━━━━━━━━━╯`,
    contextInfo: {
      ...rcanal.contextInfo,
      mentionedJid: [who, m.sender]
    }
  }, { quoted: m })
}

handler.help = ['balance', 'bal', 'coins']
handler.tags = ['economía']
handler.command = ['balance', 'bal', 'coins']

export default handler