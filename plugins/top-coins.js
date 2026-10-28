let handler = async (m, { conn, args, usedPrefix, command }) => {
  try {
       
     const allUsers = Object.entries(global.db.data.users)
       .filter(([jid, user]) => user && typeof user.coins === 'number')
       .map(([jid, user]) => ({
         jid: jid,
         coins: (user.coins || 0) + (user.bancoDinero || 0), 
         name: user.name || 'Usuario'
       }))
      .filter(user => user.coins > 0) 
      .sort((a, b) => b.coins - a.coins) 
      .slice(0, 10) 

    if (allUsers.length === 0) {
      return conn.sendMessage(m.chat, {
        text: `[❗] No hay usuarios con ${global.moneda} registrados.`,
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }

    
    let txt = `╭━━〔 🪙 𝙏𝙊𝙋 𝙂𝙇𝙊𝘽𝘼𝙇 〕━━╮\n`
    txt += `┃ 𝙈𝘼𝙔𝙊𝙍 𝘾𝘼𝙉𝙏𝙄𝘿𝘼𝘿 𝘿𝙀 ${String(global.moneda).toLocaleUpperCase()}\n`
    txt += `┣━━━━━━━━━━━━━━━━\n`

    allUsers.forEach((user, index) => {
      const position = index + 1
      let emoji = ''

      switch (position) {
        case 1: emoji = '🥇'; break
        case 2: emoji = '🥈'; break
        case 3: emoji = '🥉'; break
        default: emoji = '💰'; break
      }

      txt += `┃ ${emoji} *${position}.* ${user.name}\n`
      txt += `┃    𓍯 *${user.coins.toLocaleString('es-CO')} ${global.moneda}*\n`
      if (index < allUsers.length - 1) txt += `┃ · · · · · · · · · · · · ·\n`
    })

    txt += `╰━━━━━━━━━━━━━━━━╯\n`
    txt += `𓂃 ࣪ ִֶָ☾. *𝙈𝙄𝙉𝙄 𝘽𝙊𝙏 · 𝙀𝘾𝙊𝙉𝙊𝙈𝙄𝘼*`

    return conn.sendMessage(m.chat, {
      text: txt,
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })

  } catch (e) {
    console.error('Error en top coins:', e)
    return conn.sendMessage(m.chat, {
      text: `[❌] Ocurrió un error al generar el top de ${global.moneda}.`,
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
}

handler.help = [`#topcoins\n→ Muestra el top 10 global de usuarios con más ${global.moneda}`]
handler.tags = ['juegos', 'economía']
handler.command = ['topcoins', 'topcoin', 'top-coins', 'richest', 'ricos']

export default handler 