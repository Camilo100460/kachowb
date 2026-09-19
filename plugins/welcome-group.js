const DEFAULT_WELCOME = `╭─❖ 𝑩𝑰𝑬𝑵𝑽𝑬𝑵𝑰𝑫𝑶/𝑨 ❖─╮
│ 𖤐 \${participant}
│ 𝑺𝒆𝒂𝒔 𝒎𝒖𝒚 𝒃𝒊𝒆𝒏𝒗𝒆𝒏𝒊𝒅𝒐/𝒂 𝒂𝒍 𝒈𝒓𝒖𝒑𝒐. ✦
│ 𝑬𝒔𝒑𝒆𝒓𝒂𝒎𝒐𝒔 𝒒𝒖𝒆 𝒅𝒊𝒔𝒇𝒓𝒖𝒕𝒆𝒔 𝒕𝒖 𝒆𝒔𝒕𝒂𝒅í𝒂. ♡
╰───────────────╯`

const DEFAULT_GOODBYE = `╭─❖ 𝑨𝑫𝑰Ó𝑺 ❖─╮
│ 𖤐 \${participant}
│ 𝑯𝒂𝒔𝒕𝒂 𝒑𝒓𝒐𝒏𝒕𝒐, 𝒕𝒆 𝒅𝒆𝒔𝒆𝒂𝒎𝒐𝒔 𝒍𝒐 𝒎𝒆𝒋𝒐𝒓. ✦
│ 𝑮𝒓𝒂𝒄𝒊𝒂𝒔 𝒑𝒐𝒓 𝒉𝒂𝒃𝒆𝒓 𝒇𝒐𝒓𝒎𝒂𝒅𝒐 𝒑𝒂𝒓𝒕𝒆 𝒅𝒆𝒍 𝒈𝒓𝒖𝒑𝒐. ♡
╰───────────────╯`

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

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!m.isGroup) return m.reply('《✧》Este comando solo funciona en grupos.')

  const config = getConfig(m.chat)
  const isWelcome = command === 'bienvenida'
  const type = isWelcome ? 'welcome' : 'goodbye'
  const label = isWelcome ? 'BIENVENIDA' : 'DESPEDIDA'
  const action = String(args[0] || 'on').toLowerCase()

  if (action === 'on' || action === 'activar') {
    config[`${type}Enabled`] = true
    config.enabled = config.welcomeEnabled || config.goodbyeEnabled
    await global.db.write()
    return m.reply(`✅ *${label} ACTIVADA*\n\nSe usará la foto de perfil de cada usuario.`)
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
  return m.reply(
    `╭─❖ *${label}* ❖─╮\n` +
    `│ Estado: ${enabled ? 'Activada' : 'Desactivada'}\n` +
    `│\n${replacePreview(savedMessage, m)}\n` +
    `╰───────────────╯\n\n` +
    `Usa:\n${usedPrefix}${command} on\n${usedPrefix}${command} off\n${usedPrefix}${command} msg <mensaje>`
  )
}

handler.help = ['bienvenida on/off/msg', 'despedida on/off/msg']
handler.tags = ['grupo']
handler.command = ['bienvenida', 'despedida']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
