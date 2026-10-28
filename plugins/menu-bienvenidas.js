const getEnabled = (config, key) => {
  if (typeof config?.[key] === 'boolean') return config[key]
  return config === true || config?.enabled === true
}

const getMessageType = value => typeof value === 'string' && value.trim()
  ? 'Personalizado'
  : 'Predeterminado'

let handler = async (m, { conn, usedPrefix }) => {
  if (!m.isGroup) return m.reply('Este menú solo funciona dentro de un grupo.')

  const config = global.db?.data?.bienvenidas?.[m.chat]
  const welcomeEnabled = getEnabled(config, 'welcomeEnabled')
  const goodbyeEnabled = getEnabled(config, 'goodbyeEnabled')
  const welcomeMessageType = getMessageType(config?.welcomeMsg)
  const goodbyeMessageType = getMessageType(config?.goodbyeMsg)
  const welcomeImageType = config?.welcomeImgUrl || config?.welcomeImg ? 'Del grupo' : 'Perfil/respaldo'
  const goodbyeImageType = config?.goodbyeImgUrl || config?.goodbyeImg ? 'Del grupo' : 'Perfil/respaldo'

  const text = [
    '╭━━〔 ✨ *MENÚ DEL GRUPO* 〕━━╮',
    '┃ *Bienvenidas y despedidas*',
    '┣━━━━━━━━━━',
    '┃',
    '┃ 📊 *ESTADO*',
    `┃ 👋 Bienvenida: ${welcomeEnabled ? 'Activa ✅' : 'Inactiva ❌'}`,
    `┃ 📝 Mensaje: ${welcomeMessageType}`,
    `┃ 🖼️ Imagen: ${welcomeImageType}`,
    `┃ 🚪 Despedida: ${goodbyeEnabled ? 'Activa ✅' : 'Inactiva ❌'}`,
    `┃ 📝 Mensaje: ${goodbyeMessageType}`,
    `┃ 🖼️ Imagen: ${goodbyeImageType}`,
    '┣━━━━━━━━━━',
    '┃',
    '┃ 🎉 *BIENVENIDA*',
    `┃ ✅ ${usedPrefix}bienvenida on`,
    '┃    Activar',
    `┃ ⛔ ${usedPrefix}bienvenida off`,
    '┃    Desactivar',
    `┃ ✍️ ${usedPrefix}bienvenida msg`,
    '┃    <texto>: guardar y activar',
    `┃ ♻️ ${usedPrefix}bienvenida reset`,
    '┃    Restaurar mensaje inicial',
    `┃ 📸 ${usedPrefix}imagenbienvenida`,
    '┃    Responde a una foto',
    `┃ 🗑️ ${usedPrefix}imagenbienvenida borrar`,
    '┣━━━━━━━━━━',
    '┃',
    '┃ 👋 *DESPEDIDA*',
    `┃ ✅ ${usedPrefix}despedida on`,
    '┃    Activar',
    `┃ ⛔ ${usedPrefix}despedida off`,
    '┃    Desactivar',
    `┃ ✍️ ${usedPrefix}despedida msg`,
    '┃    <texto>: guardar y activar',
    `┃ ♻️ ${usedPrefix}despedida reset`,
    '┃    Restaurar mensaje inicial',
    `┃ 📸 ${usedPrefix}imagendespedida`,
    '┃    Responde a una foto',
    `┃ 🗑️ ${usedPrefix}imagendespedida borrar`,
    '┣━━━━━━━━━━',
    '┃',
    '┃ 🧩 *VARIABLES*',
    '┃ 🙋 ${participant}: mención',
    '┃ 👤 ${user}: nombre',
    '┃ 👥 ${group}: grupo',
    '┃ 📄 ${description}: descripción',
    '┃ 🔢 ${memberCount}: miembros',
    '┃ 📅 ${date}: fecha',
    '┃ 🕒 ${time}: hora',
    '┣━━━━━━━━━━',
    '┃',
    '┃ 🖼️ Grupo → perfil → respaldo',
    '╰━━━━━━━━━━'
  ].join('\n')

  return conn.sendMessage(m.chat, { text }, { quoted: m })
}

handler.help = ['menubienvenida', 'menubienvenidas']
handler.tags = ['grupo']
handler.command = ['menubienvenida', 'menubienvenidas']
handler.group = true
handler.admin = true

export default handler