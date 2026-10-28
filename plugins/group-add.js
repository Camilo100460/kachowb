import { BLACKLIST_KEY, findEntryKey } from '../lib/blacklist.js'

let handler = async (m, { conn, args, participants, isAdmin, isBotAdmin, isOwner, isPrems, usedPrefix, command }) => {
  if (!m.isGroup) return conn.sendMessage(m.chat, {
    text: '[❗] Este comando solo puede ser usado en grupos.',
    contextInfo: {
      ...rcanal.contextInfo
    }
  }, { quoted: m })
  
  
  if (!args[0]) {
    return conn.sendMessage(m.chat, {
      text: `[❗] Debes poner un número de teléfono.\n\n> Ejemplo: ${usedPrefix + command} 51999999999`,
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
  
  
  let number = args.join(' ')
  
  
  number = number.replace(/[\s\-\(\)\.]/g, '')
  
  
  if (number.startsWith('+')) {
    number = number.substring(1)
  }
  
  
  if (number.includes('@s.whatsapp.net')) {
    number = number.replace('@s.whatsapp.net', '')
  }
  
  
  if (!/^\d+$/.test(number)) {
    return conn.sendMessage(m.chat, {
      text: '[❗] El número de teléfono contiene caracteres inválidos. Solo se permiten números.',
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
  
  
  if (number.length < 10 || number.length > 15) {
    return conn.sendMessage(m.chat, {
      text: '[❗] Número de teléfono inválido. Debe tener entre 10 y 15 dígitos.',
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
  
  
  if (!number.startsWith('1') && !number.startsWith('2') && !number.startsWith('3') && !number.startsWith('4') && !number.startsWith('5') && !number.startsWith('6') && !number.startsWith('7') && !number.startsWith('8') && !number.startsWith('9')) {
    number = '1' + number 
  }
  
  
  if (number.startsWith('52') && number.length >= 12) {
    
    if (number.charAt(2) !== '1') {
      number = '52' + '1' + number.substring(2)
    }
  }
  
  
  const jid = number + '@s.whatsapp.net'
  
  
  const groupMetadata = await conn.groupMetadata(m.chat)
  const isUserInGroup = groupMetadata.participants.find(p => p.id === jid)
  
  if (isUserInGroup) {
    return conn.sendMessage(m.chat, {
      text: `[❗] El usuario ${number} ya está en este grupo.`,
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
  
  
  if (jid === conn.user.jid) {
    return conn.sendMessage(m.chat, {
      text: '[❗] No puedes agregar al bot al grupo.',
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
  
  try {
    
    if (findEntryKey(BLACKLIST_KEY, [number]) !== null) {
      return conn.sendMessage(m.chat, {
        text: `[❗] El número ${number} está en la lista negra y no puede ser invitado.`,
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }

    const [registered] = await conn.onWhatsApp(jid)
    if (!registered?.exists) {
      return conn.sendMessage(m.chat, {
        text: `[❗] No se pudo invitar al usuario ${number}.\n\n> El número no existe en whatsapp.`,
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }

    const inviteCode = await conn.groupInviteCode(m.chat)
    await conn.sendMessage(registered.jid || jid, {
      text: `👋 Hola, @${m.sender.split('@')[0]} te invita al grupo *${groupMetadata.subject}*.\n\n🔗 Únete con este enlace:\nhttps://chat.whatsapp.com/${inviteCode}`,
      mentions: [m.sender]
    })
    
    const groupName = groupMetadata.subject
    
    return conn.sendMessage(m.chat, {
      text: `🌴 𝗘𝗻𝗹𝗮𝗰𝗲 𝗲𝗻𝘃𝗶𝗮𝗱𝗼 𝗮𝗹 𝗽𝗿𝗶𝘃𝗮𝗱𝗼.\n\n> 🜸 Número: ${number}\n> ✰ Admin: @${m.sender.split('@')[0]}\n> ❂ Grupo: ${groupName}`,
      contextInfo: {
        ...rcanal.contextInfo,
        mentionedJid: [m.sender]
      }
    }, { quoted: m })
    
  } catch (error) {
    console.error('Error agregando usuario:', error)
    
    
    if (error.message && error.message.includes('not-authorized')) {
      return conn.sendMessage(m.chat, {
        text: `[❗] No se pudo agregar al usuario ${number}.\n\n> ❌ *Razón:* El usuario tiene deshabilitada la opción de "Agregar a grupos" en su configuración de privacidad.`,
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }
    
    if (error.message && error.message.includes('forbidden')) {
      return conn.sendMessage(m.chat, {
        text: `[❗] No se pudo agregar al usuario ${number}.\n\n> ❌ *Razón:* El bot no tiene permisos suficientes o el grupo está restringido.`,
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }
    
    if (error.message && error.message.includes('not-found')) {
      return conn.sendMessage(m.chat, {
        text: `[❗] No se pudo agregar al usuario ${number}.\n\n> El número no existe en whatsapp.`,
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }
    
    if (error.message && error.message.includes('bad-request')) {
      return conn.sendMessage(m.chat, {
        text: `[❗] No se pudo agregar al usuario ${number}.\n\n> Numero incorrecto.`,
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }
    
   
    return conn.sendMessage(m.chat, {
      text: `[❌] Ocurrió un error al intentar agregar al usuario ${number}.\n\n> *Error:* ${error.message || 'Error desconocido'}`,
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
}

handler.command = ['adg', 'addgroup', 'addgp']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler 