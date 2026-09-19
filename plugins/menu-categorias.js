const EXTRA_BLOCKS = [
  ['🏷️ 𝙎𝙏𝙄𝘾𝙆𝙀𝙍𝙎', [
    '◦ 🏷️ .sticker', '◦ 🏷️ .stickers', '◦ ✏️ .remeta', '◦ 🏷️ .take',
    '◦ ⚙️ .setmeta', '◦ 🖼️ .sticker-toimg'
  ]],
  ['📥 𝘿𝙀𝙎𝘾𝘼𝙍𝙂𝘼𝙎', [
    '◦ 📱 .apps', '◦ 🎬 .fb', '◦ 📸 .ig', '◦ 🎵 .ytmp3',
    '◦ 🎬 .ytmp4', '◦ 🎵 .soundcloud', '◦ 🎵 .scdl', '◦ 🖼️ .image', '◦ 🖼️ .img'
  ]],
  ['👥 𝙂𝙍𝙐𝙋𝙊𝙎', [
    '◦ 🚫 .kick', '◦ 🚫 .expulsartodos', '◦ 🔇 .silenciar', '◦ 🔊 .desilenciar',
    '◦ 🔗 .link', '◦ 📝 .vernotas', '◦ ⚠️ .delwarn', '◦ 👥 .invocar', '◦ 📣 .notify', '◦ 📣 .tag'
  ]],
  ['❤️ 𝙍𝙀𝘼𝘾𝘾𝙄𝙊𝙉𝙀𝙎', [
    '◦ 💋 .beso', '◦ 🤗 .abrazo', '◦ 👋 .slap', '◦ 😄 .happy', '◦ 😢 .sad', '◦ 😂 .risa'
  ]],
  ['🔎 𝘽𝙐𝙎𝙌𝙐𝙀𝘿𝘼', [
    '◦ 🔎 .image', '◦ 🆔 .getid', '◦ 📝 .translate', '◦ ⏱️ .timer', '◦ 🌐 .infoip', '◦ 📷 .qr'
  ]],
  ['👑 𝘼𝘿𝙈𝙄𝙉', [
    '◦ 👑 .creator', '◦ 🔄 .reconnect', '◦ 🔄 .reboot', '◦ 📁 .viewplugin', '◦ 🔧 .fixed', '◦ 🤖 .botinfo'
  ]],
  ['🎮 𝙅𝙐𝙀𝙂𝙊𝙎', [
    '◦ 🕵️ .doxeo', '◦ 🧠 .iqtest', '◦ 💖 .love'
  ]]
]

const renderMenuBlock = (title, commands) => {
  const footer = '╰ ' + '◦'.repeat(34)
  return `▸▸ ${title} ◂◂\n${commands.map(command => `║╎ ${command}`).join('\n')}\n${footer}`
}

let handler = async (m, { conn }) => {
  const blocks = EXTRA_BLOCKS
    .map(([title, commands]) => renderMenuBlock(title, commands))
    .join('\n\n')

  const menu = `📂 *𝘼𝘿𝙄𝘾𝙄𝙊𝙉𝘼𝙇𝙀𝙎*\n\n📌 *Hola,* @${m.sender.split('@')[0]}\n\n${blocks}`

  const sentMessage = await conn.sendMessage(m.chat, {
    image: { url: './nyan.gif' },
    caption: menu,
    mentions: [m.sender]
  }, { quoted: m })
}

handler.help = ['categorias']
handler.tags = ['menu']
handler.command = ['categorias']

export default handler
