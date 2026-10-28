import { findGroupParticipant } from '../lib/group-participant.js'

const digits = v => String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '')

function getContext(m) {
  return m.msg?.contextInfo
    || m.message?.extendedTextMessage?.contextInfo
    || null
}

function getQuotedSender(m) {
  const ctx = getContext(m)
  return m.quoted?.sender || ctx?.participant || m.quoted?.participant || null
}

function participantIds(p) {
  return [p?.id, p?.lid, p?.jid, p?.phoneNumber, p?.pn].filter(Boolean)
}

function findTarget(participants, conn, m, candidates) {
  const cand = [...new Set(candidates.filter(Boolean).map(String))]
  const candDec = cand.map(c => conn.decodeJid(c))
  const candDigits = cand.map(digits).filter(d => d.length >= 6)

  let found = participants.find(p => {
    const ids = participantIds(p)
    if (ids.some(v => candDec.includes(conn.decodeJid(v)))) return true
    return ids.some(v => candDigits.includes(digits(v)))
  })
  if (found) return found

  for (const c of cand) {
    try {
      const fake = {
        isGroup: true,
        chat: m.chat,
        sender: c,
        participant: c,
        key: { participant: c, remoteJid: m.chat },
      }
      found = findGroupParticipant(participants, fake, conn)
      if (found) return found
    } catch {}
  }
  return null
}

let handler = async (m, { conn, args, participants, isAdmin, isBotAdmin, isOwner, isPrems, usedPrefix, command }) => {

  if (!m.isGroup) return conn.sendMessage(m.chat, {
    text: '[❗] Este comando solo puede ser usado en grupos.',
    contextInfo: { ...rcanal.contextInfo }
  }, { quoted: m })

  const adminCheckMetadata = ((conn.chats[m.chat] || {}).metadata || await conn.groupMetadata(m.chat).catch(_ => null)) || {}
  const groupParticipants = (participants && participants.length ? participants : adminCheckMetadata.participants) || []
  const user = findGroupParticipant(groupParticipants, m, conn) || {}
  const isRAdmin = user?.admin == 'superadmin' || false
  const isAdminManual = Boolean(isAdmin) || isRAdmin || user?.admin == 'admin' || false

  const isOwnerManual = global.owner.some(([number]) => number.replace(/[^0-9]/g, '') + '@s.whatsapp.net' === m.sender) ||
                  global.ownerLid?.some(([number]) => number.replace(/[^0-9]/g, '') + '@lid' === m.sender) ||
                  m.sender === conn.user.jid

  if (!isAdminManual && !isRAdmin && !isOwnerManual) {
    return conn.reply(m.chat, '[❗] Solo los administradores pueden usar este comando.', m)
  }

  if (!isBotAdmin) {
    return conn.sendMessage(m.chat, {
      text: '[❗] El bot debe ser administrador para poder dar admin.',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  const mentioned = m.mentionedJid?.[0]
  const quotedSender = getQuotedSender(m)
  const rawWho = mentioned || quotedSender

  if (!rawWho) {
    return conn.sendMessage(m.chat, {
      text: `[❗] Menciona a un usuario o responde a su mensaje para ponerlo de admin.\n\n> *Ejemplo:* ${usedPrefix + command} @usuario`,
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  const ctx = getContext(m)
  const candidates = mentioned
    ? [mentioned]
    : [
        quotedSender,
        ctx?.participant,
        ctx?.participantPn,
        m.quoted?.participant,
        m.quoted?.key?.participant,
        m.quoted?.senderPn,
      ]

  const targetUser = findTarget(groupParticipants, conn, m, candidates)

  if (!targetUser) {
    console.log('[promote] NO ENCONTRADO. candidatos:', candidates)
    return conn.sendMessage(m.chat, {
      text: '[❗] No encontré a ese usuario en el grupo (quizá ya salió).',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  // Usa el id tal como lo tiene el grupo (puede ser @lid o @s.whatsapp.net)
  const who = targetUser.id || rawWho

  const botIds = [conn.user.jid, conn.user.id, conn.user.lid].filter(Boolean).map(v => conn.decodeJid(v))
  if (botIds.includes(conn.decodeJid(who)) || botIds.includes(conn.decodeJid(rawWho))) {
    return conn.sendMessage(m.chat, {
      text: '[❗] No puedes promover al bot.',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  if (targetUser.admin === 'admin' || targetUser.admin === 'superadmin') {
    return conn.sendMessage(m.chat, {
      text: `[❗] @${who.split('@')[0]} ya es administrador del grupo.`,
      contextInfo: {
        ...rcanal.contextInfo,
        mentionedJid: [who]
      }
    }, { quoted: m })
  }

  try {
    const res = await conn.groupParticipantsUpdate(m.chat, [who], 'promote')
    console.log('[promote] respuesta:', JSON.stringify(res))

    const status = String(res?.[0]?.status || '200')
    if (status !== '200') {
      return conn.sendMessage(m.chat, {
        text: `[❌] WhatsApp rechazó la acción (código ${status}).`,
        contextInfo: { ...rcanal.contextInfo }
      }, { quoted: m })
    }

    const groupName = adminCheckMetadata.subject || (await conn.groupMetadata(m.chat).catch(() => null))?.subject || 'Grupo'

    return conn.sendMessage(m.chat, {
      text: `🌴 𝘼𝘿𝙈𝙄𝙉 𝘾𝙊𝙉𝙑𝙀𝙍𝙏𝙄𝘿𝙊 𝘾𝙊𝙍𝙍𝙀𝘾𝙏𝘼𝙈𝙀𝙉𝙏𝙀.\n\n> *Usuario:* @${who.split('@')[0]}\n> *Por:* @${m.sender.split('@')[0]}\n> *Grupo:* ${groupName}`,
      contextInfo: {
        ...rcanal.contextInfo,
        mentionedJid: [who, m.sender]
      }
    }, { quoted: m })

  } catch (e) {
    console.error('Error promoviendo usuario:', e)
    return conn.sendMessage(m.chat, {
      text: '[❌] No se pudo dar admin a la persona.',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }
}

handler.command = ['promote', 'promover', 'daradmin']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler