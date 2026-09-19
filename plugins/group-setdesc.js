let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isBotAdmin }) => {
  if (!m.isGroup) return conn.sendMessage(m.chat, {
    text: '[❗] Este comando solo puede ser usado en grupos.',
    contextInfo: { ...rcanal.contextInfo }
  }, { quoted: m })


  const newDesc = args.join(' ').trim()

  if (!newDesc) {
    return conn.sendMessage(m.chat, {
      text: `[❗] Debes indicar la nueva descripción del grupo.\n\n> *Ejemplo:*\n- ${usedPrefix + command} Bienvenidos al grupo de MAY-BOT, esta prohibido los links.`,
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  try {
    const metadata = await conn.groupMetadata(m.chat)
    const oldDesc = (metadata && metadata.desc) ? metadata.desc : 'Sin descripción'

    await conn.groupUpdateDescription(m.chat, newDesc)

    return conn.sendMessage(m.chat, {
      text: `🌴 𝗗𝗲𝘀𝗰𝗿𝗶𝗽𝗰𝗶𝗼́𝗻 𝗮𝗰𝘁𝘂𝗮𝗹𝗶𝘇𝗮𝗱𝗮\n> *Antes:* ${oldDesc.substring(0, 300)}${oldDesc.length > 300 ? '…' : ''}\n> *Ahora:* ${newDesc}\n> *Por:* @${m.sender.split('@')[0]}`,
      contextInfo: { ...rcanal.contextInfo, mentionedJid: [m.sender] }
    }, { quoted: m })
  } catch (e) {
    console.error('Error cambiando descripción del grupo:', e)
    return conn.sendMessage(m.chat, {
      text: '[❗] No se pudo cambiar la descripción del grupo. Asegúrate de que el bot sea administrador.',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }
}

handler.command = ['desgp']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
