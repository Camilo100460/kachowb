let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isBotAdmin }) => {
  try {
    if (!m.isGroup) {
      return conn.sendMessage(m.chat, {
        text: '[❗] Este comando solo funciona en grupos.',
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }
    
    
    const action = args[0]?.toLowerCase()
    
    if (!global.db.data.antiSpam) global.db.data.antiSpam = {}
    
    if (action === 'on') {
      global.db.data.antiSpam[m.chat] = true
      
      let txt = `ִֶָ*[🛡️]* 𝘼𝙣𝙩𝙞-𝙨𝙥𝙖𝙢 𝙖𝙘𝙩𝙞𝙫𝙖𝙙𝙤 𝙘𝙤𝙧𝙧𝙚𝙘𝙩𝙖𝙢𝙚𝙣𝙩𝙚\n> Por: @${m.sender.split('@')[0]}`
      
      return conn.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
          ...rcanal.contextInfo,
          mentionedJid: [m.sender]
        }
      }, { quoted: m })
      
    } else if (action === 'off') {
      global.db.data.antiSpam[m.chat] = false
      
      let txt = `*ִֶָ[🔓]* 𝘼𝙣𝙩𝙞-𝙨𝙥𝙖𝙢 𝙙𝙚𝙨𝙖𝙘𝙩𝙞𝙫𝙖𝙙𝙤 𝙘𝙤𝙧𝙧𝙚𝙘𝙩𝙖𝙢𝙚𝙣𝙩𝙚\n> Por: @${m.sender.split('@')[0]}`
      
      return conn.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
          ...rcanal.contextInfo,
          mentionedJid: [m.sender]
        }
      }, { quoted: m })
      
    } else {
      return conn.sendMessage(m.chat, {
        text: `*[❗] Debes poner una acción.*\n\n> *Ejemplo:* ${usedPrefix}antispam on\n> *Ejemplo:* ${usedPrefix}antispam off`,
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }
    
  } catch (e) {
    console.error('Error en antispam:', e)
    return conn.sendMessage(m.chat, {
      text: '[❌] Ocurrió un error al configurar el anti-spam.',
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
}

handler.command = ['antispam']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler 