const UPDATE_MESSAGE = `╭━〔 ✦ 𝑨𝑪𝑻𝑼𝑨𝑳𝑰𝒁𝑨𝑪𝑰Ó𝑵 ✦ 〕━╮
│
│ ✨ 𝑵𝒖𝒆𝒗𝒐𝒔 𝒄𝒐𝒎𝒂𝒏𝒅𝒐𝒔 𝒅𝒊𝒔𝒑𝒐𝒏𝒊𝒃𝒍𝒆𝒔
│
│ 📖 • .menu
│ 🔥 • .freefire
│ 🔷 • .cuadrilatero
│ ⚔️ • .12vs12
│ ⚔️ • .16vs16
│ 🎯 • .clk
│ 🎯 • .clk6vs6
│ ♾️ • .infinito
│ ♾️ • .infinito6vs6
│ ⚡ • .vv2
│ ⚡ • .vv2-6
│ 🏆 • .scrim
│ 💬 • .discord
│ 📸 • .insta
│ 📜 • .reglas
│ 🎨 • .sticker
│ 🖼️ • .stickers
│ 🎭 • .stiker
│ ⚡ • .s
│ 💰 • .balance
│ 💵 • .bal
│ 🪙 • .coins
│ 🧩 • .adivinanza
│ 🧠 • .riddle
│ ⚽ • .futbol
│
│ 🛠️ • 𝑮𝑹𝑼𝑷𝑶 𝑫𝑬 𝑺𝑶𝑷𝑶𝑹𝑻𝑬
│ 🔗 • https://chat.whatsapp.com/BOHAe6LJpEH9sSzIo3jcMB
│
│ ✦ 𝑴𝒂́𝒔 𝒇𝒖𝒏𝒄𝒊𝒐𝒏𝒆𝒔 𝒑𝒓𝒐́𝒙𝒊𝒎𝒂𝒎𝒆𝒏𝒕𝒆...
│
╰━━━━━━━━━━━━━━━━╯`

const handler = async (m, { conn }) => {
  return conn.sendMessage(m.chat, { text: UPDATE_MESSAGE }, { quoted: m })
}

handler.help = ['actualizacion']
handler.tags = ['info']
handler.command = ['actualizacion']

export default handler
