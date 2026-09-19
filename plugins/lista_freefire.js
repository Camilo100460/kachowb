const handler = async (m, { conn, usedPrefix }) => {
  const menu = `
🔮 𝙈𝘼𝙔-𝘽𝙊𝙏 🔮

📌 *LISTAS DE GUERRA*

╭━━━━━━ ◜◌◝ ━━━━━━╮
│ _*< LISTAS />*_
│
├ • 🎯 _${usedPrefix}cuadrilatero_
├ • ⚔️ _${usedPrefix}12vs12_
├ • 🔥 _${usedPrefix}16vs16_
├ • 🦅 _${usedPrefix}clk_
├ • ⚡ _${usedPrefix}clk6vs6_
├ • ♾️ _${usedPrefix}infinito_
├ • ♾️ _${usedPrefix}infinito6vs6_
├ • 🌷 _${usedPrefix}scrim_
│
╰━━━━━━ ◟◌◞ ━━━━━━╯`

  await conn.sendMessage(m.chat, {
    image: { url: './nyan guerra.jpg' },
    caption: menu
  }, { quoted: m })
}

handler.command = ['freefire', 'listas', 'menulistas']
handler.tags = ['listas']
handler.help = ['freefire']

export default handler
