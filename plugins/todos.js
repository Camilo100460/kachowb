const handler = async (m, { isOwner, isAdmin, conn, text, participants, args }) => {
  if (!(isAdmin || isOwner)) {
    if (global.dfail) return global.dfail('admin', m, conn)
    return conn.sendMessage(m.chat, { text: '[❗] Este comando solo es para administradores.' }, { quoted: m })
  }

  const pesan = args.join(' ')
  const messageText = pesan ? pesan : 'Sin mensaje'
  const mentions = participants.map((a) => a.id)

  let teks = `📣 𝙏𝘼𝙂𝘼𝙇𝙇 / 𝙄𝙉𝙑𝙊𝘾𝘼𝙍\n\n`
  teks += `💌 *MENSAJE:* ${messageText}\n\n`
  teks += `🎋 *INTEGRANTES:*\n`

  for (const mem of participants) {
    teks += `┣⦁ @${mem.id.split('@')[0]}\n`
  }

  teks += `\n*┗⦁ May - Bot*`

  return await conn.sendMessage(m.chat, {
    text: teks,
    mentions: mentions
  }, { quoted: m })
}

handler.help = ['tagall <mensaje>', 'invocar <mensaje>']
handler.tags = ['group']
handler.command = ['tagall', 'invocar', 'invocacion', 'todos', 'invocación']
handler.admin = true
handler.group = true

export default handler