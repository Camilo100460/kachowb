const SIGNS = [
  ['Capricornio', 1, 1, 1, 19],
  ['Acuario', 1, 20, 2, 18],
  ['Piscis', 2, 19, 3, 20],
  ['Aries', 3, 21, 4, 19],
  ['Tauro', 4, 20, 5, 20],
  ['Geminis', 5, 21, 6, 20],
  ['Cancer', 6, 21, 7, 22],
  ['Leo', 7, 23, 8, 22],
  ['Virgo', 8, 23, 9, 22],
  ['Libra', 9, 23, 10, 22],
  ['Escorpio', 10, 23, 11, 21],
  ['Sagitario', 11, 22, 12, 21],
  ['Capricornio', 12, 22, 12, 31]
]

const SIGN_TRAITS = {
  Capricornio: 'tu paciencia de estratega',
  Acuario: 'tu creatividad impredecible',
  Piscis: 'tu imaginación sin freno',
  Aries: 'tu energía de protagonista',
  Tauro: 'tu terquedad con buenos argumentos',
  Geminis: 'tu curiosidad multitarea',
  Cancer: 'tu radar emocional',
  Leo: 'tu talento para entrar con estilo',
  Virgo: 'tu precisión casi detectivesca',
  Libra: 'tu diplomacia en modo experto',
  Escorpio: 'tu intensidad de novela',
  Sagitario: 'tus ganas de aventura'
}

const DAILY_THEMES = [
  'ordenar ese pendiente que llevas esquivando con una creatividad admirable',
  'elegir una prioridad y no abrir siete misiones secundarias al mismo tiempo',
  'hacer una pausa antes de responder ese mensaje escrito con demasiada pasión',
  'confiar en tu plan, pero revisar dónde dejaste las llaves antes de salir'
]

const RELATIONSHIP_NOTES = [
  'En tus relaciones, habla claro y evita convertir un visto en una investigación policial.',
  'En el amor y la amistad, un poco de honestidad te ahorrará tres temporadas de drama.',
  'Alguien del pasado podría reaparecer con un mensaje; considéralo una posibilidad, no una señal del cosmos.'
]

const ADVICE = [
  'Tu consejo astral, completamente ficticio: toma agua y no discutas con el hambre.',
  'La recomendación de las estrellas (sin garantía cósmica): respira antes de comprar algo por impulso.',
  'Pronóstico no científico: un descanso a tiempo puede evitar que tu paciencia presente la renuncia.'
]

function getSign(month, day) {
  return SIGNS.find(([, startMonth, startDay, endMonth, endDay]) => {
    const current = month * 100 + day
    return current >= startMonth * 100 + startDay && current <= endMonth * 100 + endDay
  })?.[0] || 'Capricornio'
}

function parseBirthDate(text = '') {
  const values = text.match(/\d+/g)?.map(Number) || []
  if (values.length < 3) return null

  let year, month, day
  if (values[0] >= 1900) {
    [year, month, day] = values
  } else if (values[2] >= 1900) {
    [day, month, year] = values
  } else {
    return null
  }

  const date = new Date(year, month - 1, day)
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  if (!valid || year < 1900 || year > new Date().getFullYear()) return null

  const today = new Date()
  let age = today.getFullYear() - year
  const birthdayPassed = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day)
  if (!birthdayPassed) age--

  return { year, month, day, sign: getSign(month, day) }
}

function pickForDay(items, person) {
  const dayKey = `${person.year}-${person.month}-${person.day}-${person.sign}`
  const index = [...dayKey].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  return items[index % items.length]
}

function buildHoroscope(person) {
  const trait = SIGN_TRAITS[person.sign] || 'tu estilo inconfundible'
  const theme = pickForDay(DAILY_THEMES, person)
  const relationship = pickForDay(RELATIONSHIP_NOTES, person)
  const advice = pickForDay(ADVICE, { ...person, sign: `${person.sign}-advice` })

  return `Con ${trait}, hoy tienes potencial para ${theme}. En tus metas, avanza paso a paso: intentar resolverlo todo antes del almuerzo suena ambicioso hasta para ti. ${relationship} ${advice} Este horóscopo es ficción para entretener; el universo no acepta reclamos ni cambios.`
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const person = parseBirthDate(text)
  if (!person) {
    return conn.sendMessage(m.chat, {
      text: `🔮 Escribe tu fecha de nacimiento.\n\nFormatos aceptados: AAAA-MM-DD o DD/MM/AAAA\nEjemplos:\n${usedPrefix + command} 2003-02-25\n${usedPrefix + command} 25/02/2003`
    }, { quoted: m })
  }

  const dateText = `${String(person.day).padStart(2, '0')}/${String(person.month).padStart(2, '0')}/${person.year}`

  try {
    return conn.sendMessage(m.chat, {
      text: `✨ *HORÓSCOPO DEL DÍA*\n\n👤 Fecha: ${dateText}\n🔮 Signo: ${person.sign}\n\n${buildHoroscope(person)}`
    }, { quoted: m })
  } catch (error) {
    console.error('Error en horoscopo IA:', error)
    return m.reply('❌ No se pudo generar el horóscopo en este momento. Inténtalo de nuevo más tarde.')
  }
}

handler.help = ['horoscopo <AAAA-MM-DD | DD/MM/AAAA>']
handler.tags = ['fun', 'ia']
handler.command = ['horoscopo', 'horóscopo']

export default handler
