// Comando: activa/desactiva el anti-llamadas en un grupo
let handler = async (m, { conn, args, usedPrefix, isAdmin, isOwner, isROwner }) => {
  try {
    if (!m.isGroup) {
      return conn.sendMessage(m.chat, {
        text: '[❗] Este comando solo funciona en grupos.',
        contextInfo: { ...rcanal.contextInfo }
      }, { quoted: m })
    }

    // Tu handler.js no valida handler.admin, así que se comprueba aquí
    if (!isAdmin && !isOwner && !isROwner) {
      return conn.sendMessage(m.chat, {
        text: '[❗] Solo los administradores pueden usar este comando.',
        contextInfo: { ...rcanal.contextInfo }
      }, { quoted: m })
    }

    const action = args[0]?.toLowerCase()

    if (!global.db.data.antiCall) global.db.data.antiCall = {}

    if (action === 'on') {
      global.db.data.antiCall[m.chat] = true

      return conn.sendMessage(m.chat, {
        text: `*[📵]* Anti-llamadas activado correctamente\n> Quien haga llamadas o videollamadas en este grupo recibirá una advertencia y luego será eliminado.\n> Por: @${m.sender.split('@')[0]}`,
        contextInfo: { ...rcanal.contextInfo, mentionedJid: [m.sender] }
      }, { quoted: m })

    } else if (action === 'off') {
      global.db.data.antiCall[m.chat] = false

      return conn.sendMessage(m.chat, {
        text: `*[🔓]* Anti-llamadas desactivado correctamente\n> Por: @${m.sender.split('@')[0]}`,
        contextInfo: { ...rcanal.contextInfo, mentionedJid: [m.sender] }
      }, { quoted: m })

    } else {
      return conn.sendMessage(m.chat, {
        text: `*[❗] Debes poner una acción.*\n\n> *Ejemplo:* ${usedPrefix}anticall on\n> *Ejemplo:* ${usedPrefix}anticall off`,
        contextInfo: { ...rcanal.contextInfo }
      }, { quoted: m })
    }

  } catch (e) {
    console.error('Error en anticall:', e)
    return conn.sendMessage(m.chat, {
      text: '[❌] Ocurrió un error al configurar el anti-llamadas.',
      contextInfo: { ...rcanal.contextInfo }
    }, { quoted: m })
  }
}

handler.command = ['anticall', 'antillamadas']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler