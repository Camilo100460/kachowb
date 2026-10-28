import { findGroupParticipant } from '../lib/group-participant.js'

const digits = v => String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '')

function getContext(m) {
  return m.msg?.contextInfo
    || m.message?.extendedTextMessage?.contextInfo
    || null
}

function getQuotedInfo(m) {
  const ctx = getContext(m)
  const sender = m.quoted?.sender || ctx?.participant || m.quoted?.participant || null
  const id = ctx?.stanzaId || m.quoted?.id || null
  if (!sender && !id) return null
  return { sender, id, ctx }
}

function participantIds(p) {
  return [p?.id, p?.lid, p?.jid, p?.phoneNumber, p?.pn].filter(Boolean)
}

function findTarget(participants, conn, m, candidates) {
  const cand = [...new Set(candidates.filter(Boolean).map(String))]
  const candDec = cand.map(c => conn.decodeJid(c))
  const candDigits = cand.map(digits).filter(d => d.length >= 6)

  // 1) Comparación directa por cualquier id del participante
  let found = participants.find(p => {
    const ids = participantIds(p)
    if (ids.some(v => candDec.includes(conn.decodeJid(v)))) return true
    return ids.some(v => candDigits.includes(digits(v)))
  })
  if (found) return found

  // 2) Usa el buscador del propio bot con un objeto tipo mensaje
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
    text: '> _*[❗] Este comando solo puede ser usado en grupos.*_',
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
    return conn.reply(m.chat, '> _*[❗] Solo los administradores pueden usar este comando.*_', m)
  }

  if (!isBotAdmin) {
    return conn.sendMessage(m.chat, {
      text: '> _*[❗] El bot debe ser administrador para poder expulsar.*_',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  const quoted = getQuotedInfo(m)
  const mentioned = m.mentionedJid?.[0]
  const rawWho = mentioned || quoted?.sender

  if (!rawWho) {
    return conn.sendMessage(m.chat, {
      text: `> _*[❗] Debes mencionar al usuario o responder a su mensaje.*_\n\n> *Ejemplo:* ${usedPrefix + command} @usuario`,
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  const candidates = mentioned
    ? [mentioned]
    : [
        quoted?.sender,
        quoted?.ctx?.participant,
        quoted?.ctx?.participantPn,
        m.quoted?.participant,
        m.quoted?.key?.participant,
        m.quoted?.senderPn,
        m.quoted?.sender,
      ]

  const targetUser = findTarget(groupParticipants, conn, m, candidates)

  if (!targetUser) {
    console.log('[kick] NO ENCONTRADO. candidatos:', candidates)
    console.log('[kick] ejemplo de participantes:', JSON.stringify(groupParticipants.slice(0, 3), null, 2))
    return conn.sendMessage(m.chat, {
      text: '[❗] No encontré a ese usuario en el grupo (quizá ya salió).',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  // Usa el id tal como lo tiene el grupo (puede ser @lid o @s.whatsapp.net)
  const who = targetUser.id || rawWho

  const isTargetAdmin = targetUser.admin === 'admin' || targetUser.admin === 'superadmin'
  if (isTargetAdmin) {
    return conn.sendMessage(m.chat, {
      text: '_*[❗] No puedes eliminar a un administrador del grupo.*_',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  const ownerNumbers = [...(global.owner || []), ...(global.ownerLid || [])].map(v => {
    const number = Array.isArray(v) ? v[0] : v
    return String(number).replace(/[^0-9]/g, '')
  })
  const targetNumbers = [...participantIds(targetUser), rawWho].map(digits)

  if (targetNumbers.some(n => ownerNumbers.includes(n))) {
    return conn.sendMessage(m.chat, {
      text: '> _*[❗] No puedes eliminar a un propietario del bot.*_',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  const botIds = [conn.user.jid, conn.user.id, conn.user.lid].filter(Boolean).map(v => conn.decodeJid(v))
  if (botIds.includes(conn.decodeJid(who)) || botIds.includes(conn.decodeJid(rawWho))) {
    return conn.sendMessage(m.chat, {
      text: '_*[❗] No se puede usar este comando para eliminar al bot.*_',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  try {
    // Si respondió a un mensaje (y no mencionó a nadie), lo borra antes de expulsar
    if (!mentioned && quoted?.id) {
      await conn.sendMessage(m.chat, {
        delete: {
          remoteJid: m.chat,
          fromMe: false,
          id: quoted.id,
          participant: quoted.ctx?.participant || quoted.sender || who,
        }
      }).catch(e => console.error('[kick] no se pudo borrar el mensaje:', e))
    }

    const res = await conn.groupParticipantsUpdate(m.chat, [who], 'remove')
    console.log('[kick] respuesta:', JSON.stringify(res))

    const status = String(res?.[0]?.status || '200')
    if (status !== '200') {
      return conn.sendMessage(m.chat, {
        text: `[❌] WhatsApp rechazó la expulsión (código ${status}). Verifica que el bot sea administrador.`,
        contextInfo: { ...rcanal.contextInfo }
      }, { quoted: m })
    }
  } catch (error) {
    console.error('Error expulsando usuario:', error)
    return conn.sendMessage(m.chat, {
      text: '> _*[❌] No se pudo sacar a la persona. Verifica que el bot sea administrador.*_',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  return
}

handler.command = ['kick', 'banear', 'patear', 'fuera', 'kickear', 'bye', 'chao', 'adios']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler