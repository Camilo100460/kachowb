/*
import fs from 'fs'

const OWNER_IMAGES = ['./menumay1.jpg', './menumay2.jpg', './menumay3.jpg', './menumay4.jpg']
const REMOVED_OWNER_NUMBERS = new Set(['573009438795', '19047931753'])

function getConfiguredOwners() {
  const owners = new Map()

  for (const entry of global.owner || []) {
    const number = String(Array.isArray(entry) ? entry[0] : entry || '').replace(/\D/g, '')
    const name = Array.isArray(entry) ? String(entry[1] || 'Propietario') : 'Propietario'
    if (number && !REMOVED_OWNER_NUMBERS.has(number) && !/^(tunumero|acael|xxx+)$/i.test(number)) {
      owners.set(number, name)
    }
  }

  return [...owners].map(([number, name]) => ({
    number,
    name
  }))
}

let handler = async (m, { conn }) => {
  const owners = getConfiguredOwners()
  const ownerLines = owners.length
    ? owners.map(owner => `┃ 👑 *${owner.name}:* +${owner.number}`).join('\n')
    : '┃ 👑 Contacta al soporte de KACHOW BOT.'
  const supportGroup = String(global.supportGroup || '').trim()

  const text = `🤖 *KACHOW BOT*\n` +
    `╭━〔 👑 _*DUEÑO DEL BOT*_ 〕━╮\n` +
    `${ownerLines}\n` +
    `╰━━━━━━━━━━━━━━━╯\n\n` +
    `🛒 *¿QUIERES TU PROPIO BOT?*\n` +
    `Escribe al +573146680977 para consultar disponibilidad y detalles.` +
    (supportGroup ? `\n\n🆘 *GRUPO DE SOPORTE*\n🔗 ${supportGroup}` : '')

  const image = OWNER_IMAGES.filter(file => fs.existsSync(file))
  const imagePath = image.length ? image[Math.floor(Math.random() * image.length)] : null
  const contextInfo = {
    ...(global.rcanal?.contextInfo || {})
  }

  if (imagePath) {
    return conn.sendFile(m.chat, imagePath, 'owner.jpg', text, m, null, { contextInfo })
  }

  return conn.sendMessage(m.chat, { text, contextInfo }, { quoted: m })
}

handler.help = ['owner', 'dueño', 'dueña']
handler.tags = ['info']
handler.command = ['owner', 'creator', 'creador', 'dueño', 'dueña']

export default handler
*/

const handler = async () => {}
handler.command = []

export default handler