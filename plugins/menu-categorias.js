import { readFileSync } from 'node:fs'

const EXTRA_BLOCKS = [
  ['🎨 𝙎𝙏𝙄𝘾𝙆𝙀𝙍𝙎', [
    '◦ 🏷️ .prueba / .s / .sticker / .stickers', '◦ ✏️ .remeta', '◦ 🏷️ .take',
    '◦ ⚙️ .setmeta', '◦ 🖼️ .sticker-toimg'
  ]],
  ['⛽ 𝘿𝙀𝙎𝘾𝘼𝙍𝙂𝘼𝙎', [
    '◦ 📱 .apps', '◦ 🎬 .fb', '◦ 📸 .ig', '◦ 🎵 .ytmp3',
    '◦ 🎬 .ytmp4', '◦ 🎵 .soundcloud', '◦ 🎵 .scdl', '◦ 🖼️ .imagee', '◦ 🖼️ .img'
  ]],
  ['🛠️ 𝙂𝙍𝙐𝙋𝙊𝙎', [
    '◦ 🚫 .kick', '◦ 🚫 .expulsartodos', '◦ 🔇 .silenciar', '◦ 🔊 .desilenciar',
    '◦ 🔗 .link', '◦ 📝 .vernotas', '◦ ⚠️ .delwarn', '◦ 👥 .invocar', '◦ 📣 .notify', '◦ 📣 .tag'
  ]],
  ['🏆 𝙍𝙀𝘼𝘾𝘾𝙄𝙊𝙉𝙀𝙎', [
    '◦ 💋 .beso', '◦ 🤗 .abrazo', '◦ 👋 .slap', '◦ 😄 .happy', '◦ 😢 .sad', '◦ 😂 .risa'
  ]],
  ['📡 𝘽𝙐𝙎𝙌𝙐𝙀𝘿𝘼', [
    '◦ 🔎 .image', '◦ 🆔 .getid', '◦ 📝 .translate', '◦ ⏱️ .timer', '◦ 🌐 .infoip', '◦ 📷 .qr'
  ]],
  ['🚦 𝘼𝘿𝙈𝙄𝙉', [
    '◦ 👑 .creator', '◦ 🔄 .reconnect', '◦ 🔄 .reboot', '◦ 📁 .viewplugin', '◦ 🔧 .fixed', '◦ 🤖 .botinfo'
  ]],
  ['🏎️ 𝙅𝙐𝙀𝙂𝙊𝙎', [
    '◦ 🕵️ .doxeo', '◦ 🧠 .iqtest', '◦ 💖 .love'
  ]]
]

const menuImages = ['./menu1.jpg', './menu2.jpg', './menu3.jpg']

const renderMenuBlock = (title, commands) => {
  const footer = '╰ ' + '◦'.repeat(34)
  return `▸▸ ${title} ◂◂\n${commands.map(command => `║╎ ${command}`).join('\n')}\n${footer}`
}

let handler = async (m, { conn }) => {
  const blocks = EXTRA_BLOCKS
    .map(([title, commands]) => renderMenuBlock(title, commands))
    .join('\n\n')

  const menu = `📂 *𝘼𝘿𝙄𝘾𝙄𝙊𝙉𝘼𝙇𝙀𝙎*\n\n📌 *Hola,* @${m.sender.split('@')[0]}\n\n${blocks}`
  const imagePath = menuImages[Math.floor(Math.random() * menuImages.length)]
  const image = readFileSync(new URL(`../${imagePath}`, import.meta.url))

  await conn.sendMessage(m.chat, {
    image,
    caption: menu,
    mentions: [m.sender]
  }, { quoted: m })
}

handler.help = ['categorias']
handler.tags = ['menu']
handler.command = ['categorias']

export default handler
