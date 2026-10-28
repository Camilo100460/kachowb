import { findBotParticipant, findGroupParticipant, senderJidCandidates } from './group-participant.js'

export const BLACKLIST_KEY = 'blacklist'
export const BOT_BANS_KEY = 'botBans'
export const BAN_MANAGERS_KEY = 'banManagers'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

function digitsOf(jid) {
  return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')
}

function decode(conn, jid) {
  try {
    return conn?.decodeJid?.(jid) || String(jid)
  } catch {
    return String(jid)
  }
}

function ensureStore(key) {
  if (!global.db.data[key]) global.db.data[key] = {}
  return global.db.data[key]
}

// Devuelve los números asociados (teléfono primero, LID después) de un participante o jid.
export function idsFromParticipant(participant, conn) {
  if (!participant) return []
  const raw = typeof participant === 'string'
    ? [participant]
    : [participant.phoneNumber, participant.jid, participant.id, participant.lid]
  const phones = []
  const lids = []

  for (const value of raw.filter(Boolean)) {
    const jid = decode(conn, value)
    const digits = digitsOf(jid)
    if (digits.length < 6) continue
    if (/@lid$/.test(jid)) lids.push(digits)
    else phones.push(digits)
  }

  return [...new Set([...phones, ...lids])]
}

export async function resolveTargetIds(m, conn, text, participants) {
  const ctx = m.msg?.contextInfo || m.message?.extendedTextMessage?.contextInfo || null
  const rawCandidates = [
    m.mentionedJid?.[0],
    ctx?.mentionedJid?.[0],
    ctx?.participant,
    ctx?.participantPn,
    m.quoted?.participant,
    m.quoted?.key?.participant,
    m.quoted?.sender
  ]

  const candidates = []
  for (const raw of rawCandidates) {
    let value = raw
    try {
      value = await raw
    } catch {
      continue
    }
    if (typeof value === 'string' && value.includes('@')) candidates.push(value)
  }

  const ids = new Set()
  for (const jid of [...new Set(candidates)]) {
    const participant = findGroupParticipant(participants, jid, conn)
    idsFromParticipant(participant, conn).forEach(id => ids.add(id))
    idsFromParticipant(jid, conn).forEach(id => ids.add(id))
    if (ids.size) break
  }
  if (ids.size) return [...ids]

  const digits = String(text || '').replace(/\D/g, '')
  return digits.length >= 8 && digits.length <= 15 ? [digits] : []
}

export function findEntryKey(storeKey, ids) {
  const store = global.db?.data?.[storeKey]
  if (!store || !ids.length) return null

  for (const [key, entry] of Object.entries(store)) {
    const known = entry?.ids || [key]
    if (ids.some(id => known.includes(id))) return key
  }
  return null
}

export function listEntries(storeKey) {
  return Object.entries(ensureStore(storeKey)).map(([key, entry]) => ({ key, ...entry }))
}

export async function addEntry(storeKey, ids, addedBy) {
  const store = ensureStore(storeKey)
  const existingKey = findEntryKey(storeKey, ids)

  if (existingKey) {
    store[existingKey].ids = [...new Set([...(store[existingKey].ids || [existingKey]), ...ids])]
    await global.db.write()
    return false
  }

  store[ids[0]] = { ids, addedBy, at: Date.now() }
  await global.db.write()
  return true
}

export async function removeEntry(storeKey, ids) {
  const store = ensureStore(storeKey)
  const existingKey = findEntryKey(storeKey, ids)
  if (!existingKey) return false

  delete store[existingKey]
  await global.db.write()
  return true
}

export function isProtectedId(ids, conn) {
  const protectedIds = new Set()
  for (const entry of [...(global.owner || []), ...(global.ownerLid || [])]) {
    const digits = digitsOf(Array.isArray(entry) ? entry[0] : entry)
    if (digits) protectedIds.add(digits)
  }
  for (const jid of [conn?.user?.jid, conn?.user?.id, conn?.user?.lid]) {
    const digits = digitsOf(jid)
    if (digits) protectedIds.add(digits)
  }
  return ids.some(id => protectedIds.has(id))
}

export function isSenderListed(storeKey, m, conn, participants) {
  const store = global.db?.data?.[storeKey]
  if (!store || !Object.keys(store).length) return false

  const ids = new Set(senderJidCandidates(m, conn).map(digitsOf).filter(d => d.length >= 6))
  const participant = findGroupParticipant(participants, m, conn)
  idsFromParticipant(participant, conn).forEach(id => ids.add(id))

  return findEntryKey(storeKey, [...ids]) !== null
}

// Expulsa al número de todos los grupos donde el bot sea admin.
export async function removeFromAllGroups(conn, ids) {
  const result = { found: 0, removed: 0, skipped: 0 }
  const groups = (await conn.groupFetchAllParticipating().catch(() => null)) || {}

  for (const group of Object.values(groups)) {
    const participants = group.participants || []
    const target = participants.find(p => ids.some(id => idsFromParticipant(p, conn).includes(id)))
    if (!target) continue

    result.found++
    const bot = findBotParticipant(participants, conn)
    if (!bot?.admin || target.admin === 'superadmin') {
      result.skipped++
      continue
    }

    try {
      await conn.groupParticipantsUpdate(group.id, [target.id], 'remove')
      result.removed++
    } catch (error) {
      console.error('[blacklist] no se pudo expulsar en', group.id, error?.message || error)
      result.skipped++
    }
    await delay(1000)
  }

  return result
}

// Expulsa automáticamente a quien esté en la lista negra cuando entra a un grupo.
export async function enforceBlacklistOnJoin(conn, { id, participants, action }) {
  if (action !== 'add' || !id?.endsWith?.('@g.us')) return
  if (!Object.keys(global.db?.data?.[BLACKLIST_KEY] || {}).length) return

  const metadata = await conn.groupMetadata(id).catch(() => null)
  if (!metadata) return

  const bot = findBotParticipant(metadata.participants, conn)
  if (!bot?.admin) return

  for (const joined of participants || []) {
    const jid = typeof joined === 'string' ? joined : joined?.id
    if (!jid) continue

    const full = findGroupParticipant(metadata.participants, jid, conn)
    const ids = [...new Set([...idsFromParticipant(full, conn), ...idsFromParticipant(joined, conn)])]
    if (!ids.length || isProtectedId(ids, conn) || findEntryKey(BLACKLIST_KEY, ids) === null) continue

    const targetId = full?.id || jid
    try {
      await conn.groupParticipantsUpdate(id, [targetId], 'remove')
      await conn.sendMessage(id, {
        text: `🚫 @${digitsOf(targetId)} está en la lista negra y fue eliminado del grupo.`,
        mentions: [targetId]
      })
    } catch (error) {
      console.error('[blacklist] no se pudo expulsar al entrar en', id, error?.message || error)
    }
  }
}
