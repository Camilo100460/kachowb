import axios from 'axios'

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

function getSign(month, day) {
  return SIGNS.find(([, startMonth, startDay, endMonth, endDay]) => {
    const current = month * 100 + day
    return current >= startMonth * 100 + startDay && current <= endMonth * 100 + endDay
  })?.[0] || 'Capricornio'
}

function parseBirthDate(text = '') {
  const values = text.match(/\d+/g)?.map(Number) || []
  if (values.length < 3) return null

  const [year, month, day] = values
  const date = new Date(year, month - 1, day)
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  if (!valid || year < 1900 || year > new Date().getFullYear()) return null

  const today = new Date()
  let age = today.getFullYear() - year
  const birthdayPassed = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day)
  if (!birthdayPassed) age--

  return { year, month, day, age, sign: getSign(month, day) }
}

function buildPrompt(person, dateText) {
  return `Escribe en español un horóscopo sarcástico y entretenido de aproximadamente 45 a 70 palabras para una persona de signo ${person.sign}, nacida el ${dateText} y con ${person.age} años. Usa un solo párrafo, con humor mordaz pero juguetón: comenta su energía, metas, relaciones y equilibrio personal como si el universo estuviera juzgando sus decisiones. Incluye como posibilidad que su ex podría buscarle, volver un amor del pasado o aparecer una reconciliación. No insultes ni presentes nada como certeza. Sin títulos, listas ni mencionar que eres una IA.`
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const person = parseBirthDate(text)
  if (!person) {
    return conn.sendMessage(m.chat, {
      text: `🔮 Escribe tu fecha de nacimiento para generar el horóscopo con IA.\n\nEjemplo:\n${usedPrefix + command} 2003 02 25`
    }, { quoted: m })
  }

  const dateText = `${String(person.day).padStart(2, '0')}/${String(person.month).padStart(2, '0')}/${person.year}`
  const prompt = buildPrompt(person, dateText)

  try {
    const apiUrl = `https://api.delirius.online/ia/gemini?query=${encodeURIComponent(prompt)}`
    const { data } = await axios.get(apiUrl, { timeout: 60000 })
    const response = typeof data?.data?.result === 'string' ? data.data.result.trim() : ''

    if (!response) throw new Error('La API no devolvió un horóscopo.')

    return conn.sendMessage(m.chat, {
      text: `✨ *HORÓSCOPO DEL DIA*\n\n👤 Fecha: ${dateText}\n🔮 Signo: ${person.sign}\n\n${response}`
    }, { quoted: m })
  } catch (error) {
    console.error('Error en horoscopo IA:', error)
    return m.reply('❌ No se pudo generar el horóscopo en este momento. Inténtalo de nuevo más tarde.')
  }
}

handler.help = ['horoscopo <AAAA MM DD>']
handler.tags = ['fun', 'ia']
handler.command = ['horoscopo', 'horóscopo']

export default handler
