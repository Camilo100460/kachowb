import { resolvePhoneNumber } from './resolve-phone.js'

export async function getListParticipant(m, conn) {
  const id = m.sender
  const participants = conn.chats?.[m.chat]?.metadata?.participants || []
  const phone = await resolvePhoneNumber(id, conn, null, m, {
    groupId: m.chat,
    participants
  })
  const existingPhoneJid = String(id).endsWith('@s.whatsapp.net') ? id : null
  const phoneJid = phone ? `${phone}@s.whatsapp.net` : existingPhoneJid
  const number = phone || existingPhoneJid?.split('@')[0] || null
  const fallbackName = m.pushName?.trim() || await conn.getName?.(id).catch?.(() => '') || 'Usuario'

  return {
    id,
    number,
    mentionJid: phoneJid,
    label: number ? `@${number}` : fallbackName
  }
}

export function getListMentionJids(value) {
  const mentions = new Set()
  const visit = item => {
    if (!item) return
    if (Array.isArray(item)) {
      for (const child of item) visit(child)
      return
    }
    if (typeof item !== 'object') return
    if (item.mentionJid) mentions.add(item.mentionJid)
    for (const [key, child] of Object.entries(item)) {
      if (key !== 'messageKey') visit(child)
    }
  }

  visit(value)
  return [...mentions]
}