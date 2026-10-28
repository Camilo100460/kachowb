import fs from 'fs'
import { join } from 'path'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const rcanal = global.rcanal || { contextInfo: {} }

  try {
    const usuario = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
    const monedas = usuario.coins || 0

    const cooldown = 3 * 60 * 1000
    const lastAdivinanza = usuario.lastAdivinanza || 0
    const tiempoRestante = cooldown - (Date.now() - lastAdivinanza)

    if (tiempoRestante > 0) {
      const minutos = Math.floor(tiempoRestante / 60000)
      const segundos = Math.floor((tiempoRestante % 60000) / 1000)
      return conn.sendMessage(m.chat, {
        text: `[❗] Debes esperar\n> *${minutos} minuto${minutos !== 1 ? 's' : ''} y ${segundos} segundo${segundos !== 1 ? 's' : ''}* para volver a jugar a las adivinanzas.`,
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }

    const adivinanzasPath = join('./storage/databases/adivinanzas.json')
    let adivinanzas = []

    try {
      const adivinanzasData = fs.readFileSync(adivinanzasPath, 'utf8')
      adivinanzas = JSON.parse(adivinanzasData)
    } catch (error) {
      console.error('Error cargando adivinanzas:', error)
      return conn.sendMessage(m.chat, {
        text: '[❌] Error al cargar las adivinanzas. Contacta al administrador.',
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }

    if (!Array.isArray(adivinanzas) || !adivinanzas.length) {
      return conn.sendMessage(m.chat, {
        text: '[❌] No hay adivinanzas disponibles en este momento.',
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }

    const adivinanza = adivinanzas[Math.floor(Math.random() * adivinanzas.length)]
    if (!adivinanza || !adivinanza.pregunta || !adivinanza.respuesta) {
      return conn.sendMessage(m.chat, {
        text: '[❌] La adivinanza actual está incompleta o dañada.',
        contextInfo: {
          ...rcanal.contextInfo
        }
      }, { quoted: m })
    }

    if (!global.db.data.adivinanzasActivas) global.db.data.adivinanzasActivas = {}
    global.db.data.adivinanzasActivas[m.chat] = {
      pregunta: adivinanza.pregunta,
      respuesta: String(adivinanza.respuesta).toLowerCase(),
      activa: true,
      creadaPor: m.sender,
      timestamp: Date.now(),
      respondida: false
    }

    usuario.lastAdivinanza = Date.now()

    const texto = `🧩 𝗔𝗗𝗜𝗩𝗜𝗡𝗔𝗡𝗭𝗔𝗦\n> *Pregunta:* ${adivinanza.pregunta}\n> *Premio:* 250-500 ${global.moneda}\n> *Tiempo:* 60s\n> *Categoria:* ${adivinanza.categoria || 'General'}`

    return conn.sendMessage(m.chat, {
      text: texto,
      contextInfo: {
        ...rcanal.contextInfo,
        mentionedJid: [m.sender]
      }
    }, { quoted: m })

  } catch (error) {
    console.error('Error en juego de adivinanzas:', error)
    return conn.sendMessage(m.chat, {
      text: '[❌] Ocurrió un error al ejecutar el juego de adivinanzas.',
      contextInfo: {
        ...rcanal.contextInfo
      }
    }, { quoted: m })
  }
}

handler.help = ['#adivinanza\n→ Juega a las adivinanzas cada 3 minutos y gana 250-500 USD si aciertas']
handler.tags = ['juegos', 'economía']
handler.command = ['adivinanza', 'adivinanzas', 'riddle']

export default handler