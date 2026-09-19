import { findGroupParticipant } from '../lib/group-participant.js'

let handler = async (m, { conn, args, participants, isAdmin, isBotAdmin, isOwner, isPrems, usedPrefix, command }) => {

  const adminCheckMetadata = (m.isGroup ? ((conn.chats[m.chat] || {}).metadata || await conn.groupMetadata(m.chat).catch(_ => null)) : {}) || {}  
  const groupParticipants = (m.isGroup ? adminCheckMetadata.participants : []) || []  
  const user = (m.isGroup ? findGroupParticipant(groupParticipants, m, conn) : null) || {}  
  const isRAdmin = user?.admin == 'superadmin' || false  
  const isAdminManual = Boolean(isAdmin) || isRAdmin || user?.admin == 'admin' || false  
  

  const isOwnerManual = global.owner.some(([number]) => number.replace(/[^0-9]/g, '') + '@s.whatsapp.net' === m.sender) || 
                  global.ownerLid?.some(([number]) => number.replace(/[^0-9]/g, '') + '@lid' === m.sender) ||
                  m.sender === conn.user.jid
  
  if (!isAdminManual && !isRAdmin && !isOwnerManual) {
    return conn.reply(m.chat, '[❗] Solo los administradores pueden usar este comando.', m)
  }

  if (!m.isGroup) return conn.sendMessage(m.chat, {
    text: '[❗] Este comando solo puede ser usado en grupos.',
    contextInfo: {
      ...rcanal.contextInfo
    }
  }, { quoted: m })
  
  
  const who = m.mentionedJid?.[0] || m.quoted?.sender
  if (!who) {
    return conn.sendMessage(m.chat, {
      text: `[❗] Debes mencionar al usuario o responder a su mensaje.\n\n> *Ejemplo:* ${usedPrefix + command} @usuario`,
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
  const targetUser = participants.find(u => conn.decodeJid(u.id) === conn.decodeJid(who))
  const isTargetAdmin = targetUser?.admin === 'admin' || targetUser?.admin === 'superadmin'
  
  if (isTargetAdmin) {
    return conn.sendMessage(m.chat, {
      text: '[❗] No puedes eliminar a un administrador del grupo.',
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
  
  const ownerNumbers = (global.owner || []).map(v => {
    const number = Array.isArray(v) ? v[0] : v
    return `${String(number).replace(/[^0-9]/g, '')}@s.whatsapp.net`
  })
  
  if (ownerNumbers.includes(conn.decodeJid(who))) {
    return conn.sendMessage(m.chat, {
      text: '[❗] No puedes eliminar a un propietario del bot.',
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
  
  if (conn.decodeJid(who) === conn.decodeJid(conn.user.jid)) return conn.sendMessage(m.chat, {
    text: '[❗] No se puede usar este comando para eliminar al bot.',
    contextInfo: {
      ...rcanal.contextInfo
    }
  }, { quoted: m })
  
  try {
    await conn.groupParticipantsUpdate(m.chat, [who], 'remove')
  } catch (error) {
    console.error('Error expulsando usuario:', error)
    return conn.sendMessage(m.chat, {
      text: '[❌] No se pudo sacar a la persona. Verifica que el bot sea administrador.',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  return
}

handler.command = ['ban', 'kick']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler