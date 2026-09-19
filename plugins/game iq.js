const lastUsed = new Map()

const results = [
  [1, 'Hoy no fue tu mejor día, pero puedes seguir intentándolo.'],
  [14, 'La práctica hace al maestro.'],
  [23, 'Cada día es una oportunidad para aprender algo nuevo.'],
  [35, 'Los errores también forman parte del aprendizaje.'],
  [41, 'El tamaño del cerebro no determina la inteligencia.'],
  [50, 'Cada pequeño paso cuenta.'],
  [67, 'Buen trabajo, sigue así.'],
  [72, 'Vas progresando.'],
  [86, 'Estás haciendo un gran trabajo.'],
  [99, 'Impresionante, estás cerca de la perfección.'],
  [100, 'Inteligencia extraordinaria.']
]

let handler = async (m, { text, usedPrefix, command }) => {
    const name = String(text || '').trim()
    if (!name) {
      return m.reply(`🧠 Escribe un nombre.\n\nEjemplo: ${usedPrefix + command} Camilo`)
    }

    const currentTime = Date.now()
    const sender = String(m.sender || m.chat)
    const previousUse = lastUsed.get(sender) || 0

    if (currentTime - previousUse < 30000) {
        const remaining = Math.ceil((30000 - (currentTime - previousUse)) / 1000)
        return m.reply(`⌛ Espera ${remaining} segundos antes de volver a usar este comando.`)
    }

    lastUsed.set(sender, currentTime)

    const [iq, comment] = results[Math.floor(Math.random() * results.length)]
    const message = `🧠 *${name}*, tu coeficiente intelectual es de *${iq}*.\n${comment} 👩🏻‍🎓`

    return m.reply(message)
}

handler.help = ['iqtest <nombre>']
handler.tags = ['fun']
handler.command = ['iqtest', 'iq']

export default handler