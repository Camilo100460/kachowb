import fs from 'fs'

const DEFAULT_AVATAR = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
const GAY_AUDIO = './media/gay2.mp3'

let handler = async (m, { conn }) => {
  const who = m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender)
  const avatar = await conn.profilePictureUrl(who, 'image').catch(() => DEFAULT_AVATAR)
  const imageUrl = `https://some-random-api.com/canvas/gay?avatar=${encodeURIComponent(avatar)}`

  try {
    await conn.sendMessage(m.chat, {
      image: { url: imageUrl },
      caption: '🏳️‍🌈 Resultado gay'
    }, { quoted: m })

    if (fs.existsSync(GAY_AUDIO)) {
      await conn.sendMessage(m.chat, {
        audio: { url: GAY_AUDIO },
        fileName: 'gay.mp3',
        mimetype: 'audio/mpeg',
        ptt: true
      }, { quoted: m })
    }
  } catch (error) {
    console.error('Error en comando gay:', error)
    return m.reply('[❌] No se pudo generar la imagen.')
  }
}

handler.help = ['gay @usuario']
handler.tags = ['maker']
handler.command = ['gay']

export default handler
