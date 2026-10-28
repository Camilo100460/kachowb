/**
 * Sistema Anti-Llamadas para grupos (llamadas y videollamadas)
 *
 * USAR: handleAntiCall(calls, conn, rcanal) con el evento conn.ev.on('call').
 *   Es la única vía que informa QUIÉN llama (call.from).
 *   handleAntiCallMessage queda solo por compatibilidad: ya no hace falta llamarla.
 */

const DEBUG = true            // pon false cuando ya funcione
const MAX_WARNS = 1           // 1 = eliminar a la primera llamada | 2 = 1 aviso y a la 2ª se elimina
const EXEMPT_OWNERS = true    // true = los owners del bot pueden llamar | false = también se les sanciona (útil para PROBAR con tu número)
const processed = new Map()   // anti-duplicados: clave -> timestamp

const log = (...a) => DEBUG && console.log('[anticall]', ...a)

// "573001234567:12@s.whatsapp.net" -> "573001234567"
const num = (jid = '') => String(jid).split('@')[0].split(':')[0]

function seenRecently(key, ms = 20_000) {
  const now = Date.now()
  for (const [k, t] of processed) if (now - t > ms) processed.delete(k)
  if (processed.has(key)) return true
  processed.set(key, now)
  return false
}

// ───────────────────────── Lógica común ─────────────────────────
async function processCall({ conn, groupJid, caller, isVideo, callId, rcanal }) {
  log('procesando -> grupo:', groupJid, '| quien llama:', caller, '| antiCall activo:', !!global.db?.data?.antiCall?.[groupJid])
  if (!groupJid || !String(groupJid).endsWith('@g.us')) return log('ignorado: no es grupo', groupJid)
  if (!caller) return log('ignorado: sin caller')
  // Si "quien llama" es el propio grupo, es el aviso genérico de Baileys, que no dice quién llamó
  if (String(caller).endsWith('@g.us') || num(caller) === num(groupJid)) {
    return log('ignorado: este aviso no trae quién llama (solo el evento call lo informa)')
  }

  if (!global.db?.data?.antiCall?.[groupJid]) return log('ignorado: anticall apagado en', groupJid)

  // Evita actuar dos veces sobre la misma llamada (evento + mensaje, o reenvíos)
  // Con id de llamada se deduplica por llamada (cada llamada nueva se procesa siempre)
  const dedupeKey = callId ? `call:${callId}` : `${groupJid}:${num(caller)}`
  if (seenRecently(dedupeKey)) return log('ignorado: duplicado', dedupeKey)

  // No tocar al propio bot
  const botIds = [conn.user?.id, conn.user?.lid, conn.user?.jid].filter(Boolean).map(num)
  if (botIds.includes(num(caller))) return log('ignorado: soy yo')

  // No tocar al/los owner(s) del bot
  const owners = [...(global.owner || []), ...(global.ownerLid || [])]
    .map(o => num(Array.isArray(o) ? o[0] : o))
  if (EXEMPT_OWNERS && owners.includes(num(caller))) return log('ignorado: quien llama es owner (cambia EXEMPT_OWNERS a false para probar con tu número)', num(caller))

  const metadata = await conn.groupMetadata(groupJid)
  const participants = metadata.participants || []

  const findP = (jid) => participants.find(p =>
    [p.id, p.jid, p.lid, p.phoneNumber].filter(Boolean).map(num).includes(num(jid))
  )

  // Los admins NO están exentos
  const callerP = findP(caller)
  const callerIsAdmin = callerP?.admin === 'admin' || callerP?.admin === 'superadmin'
  // Para eliminar usamos el id con el formato que usa el grupo (jid normal o LID)
  const targetJid = callerP?.id || caller

  const tipo = isVideo === true ? 'videollamadas' : isVideo === false ? 'llamadas' : 'llamadas o videollamadas'

  // Rechazar la llamada si tenemos su id (no es crítico si falla)
  if (callId) {
    try { await conn.rejectCall(callId, caller) } catch (e) { log('rejectCall falló:', e?.message) }
  }

  // Contador de advertencias por grupo y usuario
  if (!global.db.data.callWarns) global.db.data.callWarns = {}
  if (!global.db.data.callWarns[groupJid]) global.db.data.callWarns[groupJid] = {}
  const warns = global.db.data.callWarns[groupJid]
  const key = num(caller)
  warns[key] = (warns[key] || 0) + 1
  log(`advertencia ${warns[key]}/${MAX_WARNS} para ${key} (admin: ${callerIsAdmin})`)

  const ctx = { ...(rcanal?.contextInfo || {}), mentionedJid: [caller] }

  if (warns[key] < MAX_WARNS) {
    return conn.sendMessage(groupJid, {
      text: `⚠️ @${key} no están permitidas las ${tipo} en este grupo.\n> Advertencia ${warns[key]}/${MAX_WARNS}. Si vuelves a llamar serás eliminado.`,
      contextInfo: ctx
    })
  }

  await conn.sendMessage(groupJid, {
    text: `🚫 @${key} no están permitidas las ${tipo} en este grupo, por eso serás eliminado.`,
    contextInfo: ctx
  })

  // Si es admin, primero se le quita el admin (si falla, se intenta eliminar igual)
  if (callerIsAdmin) {
    try { await conn.groupParticipantsUpdate(groupJid, [targetJid], 'demote') }
    catch (e) { log('no se pudo quitar admin:', e?.message) }
  }

  // Baileys NO lanza error si falla: devuelve [{ status: '200' | código de error, jid }]
  // Se prueba con el id del grupo y, si falla, con el jid original de quien llamó.
  const candidatos = [...new Set([targetJid, caller])]
  let eliminado = false
  for (const jid of candidatos) {
    try {
      const res = await conn.groupParticipantsUpdate(groupJid, [jid], 'remove')
      const status = res?.[0]?.status
      log('resultado de eliminar', jid, '->', JSON.stringify(res?.map(r => ({ status: r.status, jid: r.jid }))))
      if (!status || String(status) === '200') { eliminado = true; break }
    } catch (e) {
      console.warn('[anticall] Error al eliminar', jid, e?.message)
    }
  }

  if (eliminado) {
    delete warns[key]
  } else {
    // No se borra el contador: la próxima llamada vuelve a intentarlo
    await conn.sendMessage(groupJid, {
      text: `@${key} no se pudo eliminar. Verifica que la bot sea admin (o que no sea el creador del grupo).`,
      contextInfo: ctx
    })
  }
}

// ─────────── Entrada 1: mensaje de tipo 'call' (handler.js) ───────────
export async function handleAntiCallMessage(m, conn, rcanal) {
  try {
    const msg = m.message || {}
    const inner = msg.ephemeralMessage?.message || msg
    // OJO: no usar `'call' in inner`: los mensajes de Baileys traen TODOS los campos
    // (vacíos, en null), así que "in" daba verdadero para cualquier mensaje.
    const isCallMsg = !!(inner.call || inner.callLogMesssage) ||
      m.mtype === 'call' || m.mtype === 'callLogMesssage'
    if (!isCallMsg) return false

    log('mensaje call recibido:', JSON.stringify({
      remoteJid: m.key?.remoteJid, participant: m.key?.participant,
      sender: m.sender, chat: m.chat, isGroup: m.isGroup, claves: Object.keys(inner)
    }))

    const groupJid = m.key?.remoteJid || m.chat
    if (!String(groupJid).endsWith('@g.us')) {
      log('ignorado: la llamada no llegó con id de grupo', groupJid)
      return false
    }

    const caller = m.key?.participant || m.participant || m.sender
    await processCall({ conn, groupJid, caller, isVideo: undefined, callId: null, rcanal })
    return true
  } catch (error) {
    console.error('Error en anti-llamadas (mensaje):', error)
    return false
  }
}

// ─────────── Entrada 2: evento 'call' de Baileys (opcional) ───────────
export async function handleAntiCall(calls, conn, rcanal) {
  for (const call of calls) {
    try {
      log('evento call:', JSON.stringify(call))
      if (call.status !== 'offer') continue
      const groupJid = call.groupJid || (String(call.chatId).endsWith('@g.us') ? call.chatId : null)
      if (!groupJid) continue
      await processCall({
        conn, groupJid, caller: call.from, isVideo: !!call.isVideo, callId: call.id, rcanal
      })
    } catch (error) {
      console.error('Error en anti-llamadas (evento):', error)
    }
  }
}