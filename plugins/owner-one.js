import {
  parseRentalTime,
  saveRental,
  savePermanentRental,
  removeRental,
  buildRentalStatusText,
  formatDuration,
  formatRemainingDetailed,
  resolvePermanentRentalType
} from '../lib/alquiler.js'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const MARAVILLA_AUDIO = join(process.cwd(), 'maravilla.mp3')

async function sendMaravillaAudio(conn, chatId, quoted) {
  if (!existsSync(MARAVILLA_AUDIO)) return

  await conn.sendMessage(chatId, {
    audio: readFileSync(MARAVILLA_AUDIO),
    mimetype: 'audio/mpeg',
    fileName: 'maravilla.mp3',
    ptt: false
  }, { quoted }).catch(error => {
    console.error('No se pudo enviar el audio de maravilla:', error)
  })
}

let handler = async (m, { conn, args, usedPrefix, command, isOwner }) => {
  if (!isOwner) {
    return conn.sendMessage(m.chat, {
      text: '╭━━〔 🔐 ACCESO RESTRINGIDO 〕━━╮\n┃ ❌ Este comando solo puede\n┃ ser usado por el owner del bot.\n╰━━━━━━━━━━━━━━━━━━━━╯',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  if (!m.isGroup) {
    return conn.sendMessage(m.chat, {
      text: '╭━━〔 ⚠️ COMANDO NO DISPONIBLE 〕━━╮\n┃ Este comando solo funciona\n┃ dentro de un grupo.\n╰━━━━━━━━━━━━━━━━━━━━╯',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  const action = (args[0] || '').toLowerCase().trim()
  const groupName = (await conn.groupMetadata(m.chat).catch(() => null))?.subject || await conn.getName(m.chat).catch(() => 'Grupo')

  if (!action) {
    return conn.sendMessage(m.chat, {
      text: buildRentalStatusText(m.chat, groupName),
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  if (['del', 'delete', 'remove', 'quitar', 'off'].includes(action)) {
    await removeRental(m.chat)
    return conn.sendMessage(m.chat, {
      text: `╭━━〔 🗑️ ALQUILER ELIMINADO 〕━━╮\n┃ 👥 *Grupo:* ${groupName}\n┃ 🔕 El bot quedó sin plan activo.\n╰━━━━━━━━━━━━━━━━━━━━╯`,
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  const permanentType = resolvePermanentRentalType(action)
  if (permanentType) {
    await savePermanentRental(m.chat, permanentType, m.sender)

    const label = permanentType === 'official' ? 'Grupo Oficial ♾️' : 'Infinito ♾️'

    await sendMaravillaAudio(conn, m.chat, m)
    return
  }

  const durationMs = parseRentalTime(args.join(' ').trim() || action)
  if (!durationMs) {
    return conn.sendMessage(m.chat, {
      text: `╭━━〔 ⚙️ CONFIGURAR ALQUILER 〕━━╮\n┃ ❌ Tiempo no válido.\n╰━━━━━━━━━━━━━━━━━━━━╯\n\n📌 *Ejemplos:*\n▫️ ${usedPrefix + command} 30m\n▫️ ${usedPrefix + command} 1h\n▫️ ${usedPrefix + command} 1d\n▫️ ${usedPrefix + command} infinito\n▫️ ${usedPrefix + command} oficial\n\n📋 Sin tiempo: consultar estado\n🗑️ ${usedPrefix + command} del: quitar el plan`,
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }

  try {
    const rental = await saveRental(m.chat, durationMs, m.sender)

    await sendMaravillaAudio(conn, m.chat, m)
    return
  } catch (e) {
    console.error('Error en comando one:', e)
    return conn.sendMessage(m.chat, {
      text: '╭━━〔 ❌ ERROR DE ACTIVACIÓN 〕━━╮\n┃ No se pudo guardar el alquiler\n┃ en la base de datos.\n╰━━━━━━━━━━━━━━━━━━━━╯',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }
}

handler.help = ['.activar 1h → activa el alquiler del bot en el grupo (solo owner)']
handler.tags = ['owner']
handler.command = ['one', 'alquiler', 'rent', 'activar']
handler.owner = true

export default handler
