let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isBotAdmin }) => {
  try {
    if (!m.isGroup) {
      return conn.sendMessage(m.chat, {
        text: '> _*[❗] Este comando solo funciona en grupos.*_',
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }
    
    
    const action = args[0]?.toLowerCase()
    
    if (!global.db.data.antiLink) global.db.data.antiLink = {}
    
    if (action === 'on') {
      global.db.data.antiLink[m.chat] = true
      
      let txt = `ִֶ> _*[🔒] Anti-links activado correctamente.*_\n> Por: @${m.sender.split('@')[0]}`
      
      return conn.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
          ...rcanal.contextInfo,
          mentionedJid: [m.sender]
        }
      }, { quoted: m })
      
    } else if (action === 'off') {
      global.db.data.antiLink[m.chat] = false
      
      let txt = `> _*[🔓] Anti-links desactivado correctamente.*_\n> Por: @${m.sender.split('@')[0]}`
      
      return conn.sendMessage(m.chat, {
        text: txt,
        contextInfo: {
          ...rcanal.contextInfo,
          mentionedJid: [m.sender]
        }
      }, { quoted: m })
      
    } else {
      return conn.sendMessage(m.chat, {
        text: `[❗] Debes poner una acción.\n\n> *Ejemplo:* ${usedPrefix}antilink on\n> *Ejemplo:* ${usedPrefix}antilink off`,
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }
    
  } catch (e) {
    console.error('Error en antilink:', e)
    return conn.sendMessage(m.chat, {
      text: '> _*[❌] Ocurrió un error al configurar el anti-link.*_',
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
}

handler.command = ['antilink']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler 