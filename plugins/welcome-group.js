import crypto from 'node:crypto'
import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileTypeFromBuffer } from 'file-type'
import uploadFile from '../lib/uploadFile.js'

const WELCOME_IMAGE_DIR = path.join(process.cwd(), 'storage', 'welcome-images')
const MAX_IMAGE_BYTES = 8 * 1024 * 1024

function getImageTarget(m) {
  for (const target of [m, m.quoted].filter(Boolean)) {
    const message = target.msg || target
    const mime = String(message.mimetype || target.mediaType || '').toLowerCase()
    if (mime.startsWith('image/') && typeof target.download === 'function') return target
  }
  return null
}

function getStoredImagePath(chatId, type, extension) {
  const key = crypto.createHash('sha256').update(`${chatId}:${type}`).digest('hex')
  return path.join(WELCOME_IMAGE_DIR, `${key}.${extension}`)
}

const DEFAULT_WELCOME = `> 🐬 ¡Welcome to \${group}! 🐬
◦ Usuario: \${participant} 🎀
◦ Date: \${date}

> 🌟 ¡Qué emoción! \${participant} 🫶 se ha sumado a nuestro grupo. ¡Bienvenida!`

const DEFAULT_GOODBYE = `> 🐬 ¡Hasta pronto, \${group}! 🐬
◦ Usuario: \${participant} 🎀
◦ Date: \${date}

> 💫 \${participant} ha salido de nuestro grupo. ¡Gracias por compartir este tiempo con nosotros!`

function getConfig(chatId) {
  global.db.data.bienvenidas ||= {}
  const current = global.db.data.bienvenidas[chatId]

  if (current === true) {
    global.db.data.bienvenidas[chatId] = { formatVersion: 2, enabled: true, welcomeEnabled: true, goodbyeEnabled: true, welcomeMsg: '', goodbyeMsg: '' }
  } else if (current === false || !current || typeof current !== 'object') {
    global.db.data.bienvenidas[chatId] = { formatVersion: 2, enabled: false, welcomeEnabled: false, goodbyeEnabled: false, welcomeMsg: '', goodbyeMsg: '' }
  }

  const config = global.db.data.bienvenidas[chatId]
  if (config.formatVersion !== 2) {
    config.formatVersion = 2
    config.welcomeMsg = ''
    config.goodbyeMsg = ''
  }
  if (typeof config.welcomeEnabled !== 'boolean') config.welcomeEnabled = config.enabled === true
  if (typeof config.goodbyeEnabled !== 'boolean') config.goodbyeEnabled = config.enabled === true
  if (typeof config.welcomeMsg !== 'string') config.welcomeMsg = ''
  if (typeof config.goodbyeMsg !== 'string') config.goodbyeMsg = ''
  if (typeof config.welcomeImg !== 'string') config.welcomeImg = ''
  if (typeof config.goodbyeImg !== 'string') config.goodbyeImg = ''
  if (typeof config.welcomeImgUrl !== 'string') config.welcomeImgUrl = ''
  if (typeof config.goodbyeImgUrl !== 'string') config.goodbyeImgUrl = ''
  return config
}

function replacePreview(message, m, groupMetadata) {
  return message
    .replace(/\${user}/g, 'Usuario')
    .replace(/\${participant}/g, `@${m.sender.split('@')[0]}`)
    .replace(/\${group}/g, groupMetadata?.subject || 'Grupo')
    .replace(/\${description}/g, groupMetadata?.desc || 'Sin descripción')
    .replace(/\${memberCount}/g, String(groupMetadata?.participants?.length || 0))
    .replace(/\${date}/g, 'fecha actual')
    .replace(/\${time}/g, 'hora actual')
}

let handler = async (m, { conn, args, isAdmin, isOwner, usedPrefix, command }) => {
  if (!m.isGroup) return m.reply('《✧》Este comando solo funciona en grupos.')

  const config = getConfig(m.chat)
  const isWelcome = command === 'bienvenida' || command === 'bienvenidaimg' || command === 'imagenbienvenida'
  const imageCommand = ['bienvenidaimg', 'despedidaimg', 'imagenbienvenida', 'imagendespedida'].includes(command)
  const type = isWelcome ? 'welcome' : 'goodbye'
  const label = isWelcome ? 'BIENVENIDA' : 'DESPEDIDA'
  const rawText = String(m.text || '').trim().toLowerCase()
  const bareCommand = rawText === `${usedPrefix}${command}`.toLowerCase() || rawText === String(command).toLowerCase()
  const action = imageCommand ? 'imagen' : bareCommand ? 'menu' : String(args[0] || 'menu').toLowerCase()

  if (['imagen', 'img', 'foto'].includes(action)) {
    if (!isAdmin && !isOwner) return m.reply('Solo un administrador puede cambiar la imagen de bienvenida o despedida.')

    const imageKey = `${type}Img`
    const imageUrlKey = `${imageKey}Url`
    const previousImage = config[imageKey]
    const subAction = String(imageCommand ? args[0] : args[1] || '').toLowerCase()

    if (['borrar', 'eliminar', 'reset'].includes(subAction)) {
      if (!previousImage && !config[imageUrlKey]) return m.reply(`Este grupo no tiene una imagen personalizada de ${label.toLowerCase()}.`)
      config[imageKey] = ''
      config[imageUrlKey] = ''
      await global.db.write()
      await fs.unlink(previousImage).catch(() => {})
      return m.reply(`✅ Imagen personalizada de ${label.toLowerCase()} eliminada. Se usará la foto de perfil y luego la imagen de respaldo.`)
    }

    const target = getImageTarget(m)
    if (!target) {
      const imageCommandName = imageCommand
        ? (isWelcome ? 'imagenbienvenida' : 'imagendespedida')
        : `${command} imagen`
      return m.reply(`Responde a una imagen con ${usedPrefix}${imageCommandName} para usarla solo en este grupo. Para quitarla: ${usedPrefix}${imageCommandName} borrar.`)
    }

    try {
      const image = await target.download()
      if (!image?.length || image.length > MAX_IMAGE_BYTES) return m.reply('La imagen debe pesar menos de 8 MB.')

      const detected = await fileTypeFromBuffer(image)
      if (!detected?.mime?.startsWith('image/')) return m.reply('El archivo citado no es una imagen válida.')

      await fs.mkdir(WELCOME_IMAGE_DIR, { recursive: true })
      const imagePath = getStoredImagePath(m.chat, type, detected.ext)
      await fs.writeFile(imagePath, image)
      config[imageKey] = imagePath
      config[imageUrlKey] = ''
      await global.db.write()
      if (previousImage && previousImage !== imagePath) await fs.unlink(previousImage).catch(() => {})

      const imageMessageKey = target.key || m.key
      await conn.sendMessage(m.chat, { react: { text: '✅', key: imageMessageKey } }).catch(() => {})

      let imageUrl = ''
      try {
        const uploadedUrl = await uploadFile(image)
        const parsedUrl = new URL(uploadedUrl)
        if (['http:', 'https:'].includes(parsedUrl.protocol)) imageUrl = parsedUrl.href
      } catch (error) {
        console.error(`[${command}] Imagen guardada localmente; no se pudo crear URL:`, error)
      }

      if (imageUrl) {
        config[imageUrlKey] = imageUrl
        try {
          await global.db.write()
        } catch (error) {
          config[imageUrlKey] = ''
          console.error(`[${command}] No se pudo guardar la URL; se conserva la copia local:`, error)
        }
      }

      return m.reply(`Imagen de ${label.toLowerCase()} guardada para este grupo${imageUrl ? ' y subida a URL' : ' en el almacenamiento local'}.`)
    } catch (error) {
      console.error(`[${command}] Error guardando imagen:`, error)
      return m.reply('No pude guardar esa imagen. Inténtalo de nuevo respondiendo a una foto.')
    }
  }

  if (action === 'on' || action === 'activar') {
    config[`${type}Enabled`] = true
    config.enabled = config.welcomeEnabled || config.goodbyeEnabled
    await global.db.write()
    return m.reply(`✅ *${label} ACTIVADA*\n\nSe usará la imagen personalizada de este grupo; si no hay una, la foto de perfil y luego la imagen de respaldo.`)
  }

  if (action === 'off' || action === 'desactivar') {
    config[`${type}Enabled`] = false
    config.enabled = config.welcomeEnabled || config.goodbyeEnabled
    await global.db.write()
    return m.reply(`✅ *${label} DESACTIVADA*`)
  }

  if (action === 'msg' || action === 'mensaje') {
    const message = m.text.replace(new RegExp(`^${usedPrefix}${command}\\s+(?:msg|mensaje)\\s+`, 'i'), '').trim()
    if (!message) return m.reply(`Uso: ${usedPrefix}${command} msg <mensaje>\n\nVariables: \${participant}, \${user}, \${group}, \${description}`)

    config[`${type}Msg`] = message
    config[`${type}Enabled`] = true
    config.enabled = config.welcomeEnabled || config.goodbyeEnabled
    await global.db.write()
    const metadata = await conn.groupMetadata(m.chat).catch(() => null)
    return m.reply(`✅ *MENSAJE DE ${label} GUARDADO*\n\n${replacePreview(message, m, metadata)}`)
  }

  if (action === 'reset' || action === 'restablecer') {
    config[`${type}Msg`] = ''
    await global.db.write()
    return m.reply(`✅ Mensaje de ${label.toLowerCase()} restablecido al mensaje predeterminado.`)
  }

  const enabled = config[`${type}Enabled`]
  const savedMessage = config[`${type}Msg`] || (isWelcome ? DEFAULT_WELCOME : DEFAULT_GOODBYE)
  const metadata = await conn.groupMetadata(m.chat).catch(() => null)
  return m.reply(
    `╭─❖ *${label}* ❖─╮\n` +
    `│ Estado: ${enabled ? 'Activada' : 'Desactivada'}\n` +
    `│\n${replacePreview(savedMessage, m, metadata)}\n` +
    `╰───────────────╯\n\n` +
    `Para configurar las bienvenidas y despedidas, escribe ${usedPrefix}menubienvenida.\n\n` +
    `Usa:\n${usedPrefix}${command} on\n${usedPrefix}${command} off\n${usedPrefix}${command} msg <mensaje>`
  )
}

handler.help = ['bienvenida on/off/msg/imagen', 'despedida on/off/msg/imagen', 'imagenbienvenida', 'imagendespedida']
handler.tags = ['grupo']
handler.command = ['bienvenida', 'despedida', 'bienvenidaimg', 'despedidaimg', 'imagenbienvenida', 'imagendespedida']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
