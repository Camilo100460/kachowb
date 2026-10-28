import { findGroupParticipant } from '../lib/group-participant.js'

function digitsOf(jid = '') {
  return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')
}

function asJid(value, preferLid = false) {
  if (!value) return ''
  const s = String(value)
  if (s.includes('@')) return s
  const d = s.replace(/\D/g, '')
  if (!d) return ''
  return preferLid ? `${d}@lid` : `${d}@s.whatsapp.net`
}

function collectTargetIds(who, participants, conn) {
  const ids = new Set([String(who)].filter(Boolean))
  const p = findGroupParticipant(participants, who, conn)
  if (p) {
    for (const v of [p.id, p.jid]) if (v) ids.add(String(v))
    if (p.lid) ids.add(asJid(p.lid, true))
    if (p.phoneNumber) ids.add(asJid(p.phoneNumber, false))
  }
  return [...ids]
}

function idsOverlap(listA, listB) {
  const setB = new Set((listB || []).map(String))
  for (const a of listA || []) {
    if (setB.has(String(a))) return true
  }
  const digitsB = new Set((listB || []).map(digitsOf).filter(d => d.length >= 6))
  for (const a of listA || []) {
    const d = digitsOf(a)
    if (d.length >= 6 && digitsB.has(d)) return true
  }
  return false
}

function removeOverlapping(mutedList, targetIds) {
  return (mutedList || []).filter(j => !idsOverlap([j], targetIds))
}

let handler = async (m, { conn, args, usedPrefix, command, isAdmin, participants }) => {
  try {
    if (!m.isGroup) {
      return conn.sendMessage(m.chat, { text: '[❗] Este comando sólo funciona en grupos.', contextInfo: { ...rcanal.contextInfo } }, { quoted: m })
    }

    if (!isAdmin) {
      return conn.sendMessage(m.chat, { text: '[❗] Solo los administradores pueden usar este comando.', contextInfo: { ...rcanal.contextInfo } }, { quoted: m })
    }

    let who
    if (m.mentionedJid && m.mentionedJid.length) who = m.mentionedJid[0]
    else if (m.quoted && m.quoted.sender) who = m.quoted.sender
    else if (args && args[0]) {
      const id = args[0].replace(/[^0-9]/g, '')
      who = id + '@s.whatsapp.net'
    }

    if (!who) {
      return conn.sendMessage(m.chat, { text: `Uso: ${usedPrefix}mute @usuario  ó  ${usedPrefix}delmute @usuario`, contextInfo: { ...rcanal.contextInfo } }, { quoted: m })
    }

    if (!global.db.data.muted) global.db.data.muted = {}
    if (!global.db.data.muted[m.chat]) global.db.data.muted[m.chat] = []

    const targetIds = collectTargetIds(who, participants, conn)
    const mentionJid = targetIds[0] || who

    const targetParticipant = findGroupParticipant(participants, who, conn)
    const isTargetAdmin = targetParticipant?.admin === 'admin' || targetParticipant?.admin === 'superadmin'

    const ownerIds = [
      ...(global.owner || []).map(v => {
        const num = typeof v === 'string' ? v.replace(/[^0-9]/g, '') : String(v).replace(/[^0-9]/g, '')
        return num ? `${num}@s.whatsapp.net` : ''
      }),
      ...(global.ownerLid || []).map(v => {
        const raw = Array.isArray(v) ? v[0] : v
        const num = String(raw || '').replace(/[^0-9]/g, '')
        return num ? `${num}@lid` : ''
      })
    ].filter(Boolean)

    const botIds = collectTargetIds(conn.user?.jid || conn.user?.id, participants, conn)
    if (idsOverlap(targetIds, botIds)) {
      return conn.sendMessage(m.chat, { text: '> _*[❌] No puedes mutear al bot.*_', contextInfo: { ...rcanal.contextInfo } }, { quoted: m })
    }

    if (isTargetAdmin) {
      return conn.sendMessage(m.chat, { text: '> _*[❌] No puedes mutear a un administrador del grupo.*_', contextInfo: { ...rcanal.contextInfo } }, { quoted: m })
    }

    if (idsOverlap(targetIds, ownerIds)) {
      return conn.sendMessage(m.chat, { text: '> _*[❌] No puedes mutear al propietario del bot.*_', contextInfo: { ...rcanal.contextInfo } }, { quoted: m })
    }

    const muted = global.db.data.muted[m.chat]
    const alreadyMuted = idsOverlap(muted, targetIds)

    if (['mute', 'group-mute', 'mutechat', 'silenciar', 'silencio'].includes(command)) {
      if (alreadyMuted) {
        return conn.sendMessage(m.chat, { text: `> _*El usuario ya está muteado.*_`, contextInfo: { ...rcanal.contextInfo } }, { quoted: m })
      }
      for (const jid of targetIds) {
        if (!muted.includes(jid)) muted.push(jid)
      }
      return conn.sendMessage(m.chat, {
        text: `🔇 Usuario muteado correctamente\n> @${mentionJid.split('@')[0]}`,
        contextInfo: { ...rcanal.contextInfo, mentionedJid: [mentionJid, m.sender] }
      }, { quoted: m })
    }

    if (['delmute', 'unmute', 'group-unmute', 'desilenciar', 'quitar-silencio', 'quitarsilencio'].includes(command)) {
      if (!alreadyMuted) {
        return conn.sendMessage(m.chat, { text: `> _*El usuario no está muteado.*_`, contextInfo: { ...rcanal.contextInfo } }, { quoted: m })
      }
      global.db.data.muted[m.chat] = removeOverlapping(muted, targetIds)
      return conn.sendMessage(m.chat, {
        text: `🔊 Usuario desmuteado correctamente\n> @${mentionJid.split('@')[0]}`,
        contextInfo: { ...rcanal.contextInfo, mentionedJid: [mentionJid, m.sender] }
      }, { quoted: m })
    }

    return conn.sendMessage(m.chat, { text: `Comando no reconocido. Usa ${usedPrefix}silenciar @usuario o ${usedPrefix}desilenciar @usuario`, contextInfo: { ...rcanal.contextInfo } }, { quoted: m })
  } catch (e) {
    console.error(e)
    return conn.sendMessage(m.chat, { text: '> _*[❌] Error al procesar el comando.*_', contextInfo: { ...rcanal.contextInfo } }, { quoted: m })
  }
}

handler.help = [
  'silenciar @usuario',
  'desilenciar @usuario',
  'mute @usuario',
  'unmute @usuario'
]
handler.command = [
  'mute', 'delmute', 'unmute', 'group-mute', 'group-unmute', 'mutechat',
  'silenciar', 'silencio', 'desilenciar', 'quitar-silencio', 'quitarsilencio'
]
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
