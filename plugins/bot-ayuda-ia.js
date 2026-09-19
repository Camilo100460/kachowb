import fs from 'fs'
import path from 'path'
import axios from 'axios'

const COMMAND_DESCRIPTIONS = {
  sticker: 'Crea un sticker a partir de una imagen, video o enlace. Uso: responder a la imagen o video con .sticker.',
  s: 'Crea un sticker a partir de una imagen o video. Uso: responder al archivo con .s.',
  stickers: 'Crea un sticker a partir de una imagen o video. Uso: responder al archivo con .stickers.',
  toimg: 'Convierte un sticker en imagen. Uso: responder a un sticker con .toimg.',
  ss: 'Convierte un sticker en imagen. Uso: responder a un sticker con .ss.',
  delstickermeta: 'Restablece el pack y autor predeterminados de los stickers.',
  delmeta: 'Cambia el pack y autor de un sticker. Uso: responder a un sticker con .delmeta pack | autor.',
  remeta: 'Cambia el pack y autor de un sticker. Uso: responder a un sticker con .remeta pack | autor.',
  take: 'Cambia el pack y autor de un sticker. Uso: responder a un sticker con .take pack | autor.',
  wm: 'Cambia la marca de un sticker. Uso: responder a un sticker con .wm pack | autor.',
  setstickermeta: 'Configura el pack y autor predeterminados para crear stickers.',
  setmeta: 'Configura el pack y autor predeterminados para crear stickers.',
  sgay: 'Crea un sticker con filtro y texto a partir de una imagen.',
  stickergay: 'Crea un sticker con filtro y texto a partir de una imagen.',
  sp: 'Crea un sticker con texto y letras de una canción.',
  stickerplain: 'Crea un sticker con texto y letras de una canción.',
  sss: 'Guarda el contenido de una imagen, video o sticker de una sola vista.',
  sw: 'Crea un sticker estilo chat usando una mención o un mensaje.',
  stickerwa: 'Crea un sticker estilo chat usando una mención o un mensaje.',
  st: 'Crea un sticker animado con texto de colores.',
  stext: 'Crea un sticker animado con texto de colores.',
  stickertext: 'Crea un sticker animado con texto de colores.',
  searchsticker: 'Busca y descarga stickers usando una palabra o término.',
  'search-sticker': 'Busca y descarga stickers usando una palabra o término.'
}

function extractCommands(source) {
  const arrayMatch = source.match(/handler\.command\s*=\s*\[([\s\S]*?)\]/)
  if (arrayMatch) {
    return [...arrayMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1])
  }

  const regexMatch = source.match(/handler\.command\s*=\s*\/([^/]+)\//)
  return regexMatch ? [regexMatch[1]] : []
}

function extractMetadata(source, property) {
  const arrayMatch = source.match(new RegExp(`handler\\.${property}\\s*=\\s*\\[([\\s\\S]*?)\\]`))
  if (arrayMatch) return [...arrayMatch[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1])

  const stringMatch = source.match(new RegExp(`handler\\.${property}\\s*=\\s*['"]([^'"]+)['"]`))
  return stringMatch ? [stringMatch[1]] : []
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function getCommandDescription(entry) {
  const mappedDescription = entry.aliases
    .map(alias => COMMAND_DESCRIPTIONS[normalizeText(alias).replace(/\s+/g, '')])
    .find(Boolean)
  if (mappedDescription) return mappedDescription

  const helpDescription = entry.help
    .map(value => String(value).replace(/^#+\s*/, '').replace(/\s*→\s*/g, ': '))
    .find(Boolean)
  if (helpDescription) return helpDescription

  const tag = entry.tags[0]
  if (tag) return `Comando de la categoría ${tag}. Escribe .bot ¿cómo se usa .${entry.aliases[0]}? para consultar su uso.`
  return `Ejecuta .${entry.aliases[0]} para usar este comando.`
}

function buildCommandEntries() {
  const pluginsDir = path.join(process.cwd(), 'plugins')
  const files = fs.readdirSync(pluginsDir)
    .filter(file => file.endsWith('.js'))
    .sort((a, b) => a.localeCompare(b))

  return files.map(file => {
    try {
      const source = fs.readFileSync(path.join(pluginsDir, file), 'utf8')
      const commands = extractCommands(source)
      if (!commands.length) return ''
      const help = extractMetadata(source, 'help')
      const tags = extractMetadata(source, 'tags')
      const aliases = commands
        .map(command => String(command).replace(/^\.+/, ''))
        .filter(command => command && !command.includes('\\'))
      return aliases.length
        ? { file, aliases, help, tags, description: getCommandDescription({ aliases, help, tags }), searchText: normalizeText(`${file} ${aliases.join(' ')} ${help.join(' ')} ${tags.join(' ')} ${getCommandDescription({ aliases, help, tags })}`) }
        : ''
    } catch {
      return ''
    }
  }).filter(Boolean)
}

function buildCommandCatalog(entries = buildCommandEntries()) {
  return entries
    .map(({ file, aliases }) => `${file}: ${aliases.map(command => `.${command}`).join(', ')}`)
    .join('\n')
}

function cleanResponse(value) {
  return String(value || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim()
}

function normalizeAiResponse(payload) {
  if (!payload) return ''

  const candidates = [
    payload?.result,
    payload?.text,
    payload?.response,
    payload?.answer,
    payload?.data,
    payload?.data?.result,
    payload?.data?.text,
    payload?.data?.response,
    payload?.data?.answer
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const cleaned = cleanResponse(candidate)
      if (cleaned) return cleaned
    }
  }

  if (typeof payload === 'string') {
    const cleaned = cleanResponse(payload)
    if (cleaned) return cleaned
  }

  return ''
}

async function fetchCommandHelp(prompt) {
  const endpoints = [
    `https://api.delirius.online/ia/gemini?query=${encodeURIComponent(prompt)}`,
    `https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(prompt)}`,
    `https://api.delirius.online/ia/copilot?query=${encodeURIComponent(prompt)}`
  ]

  for (const apiUrl of endpoints) {
    try {
      const { data } = await axios.get(apiUrl, { timeout: 60000 })
      const normalized = normalizeAiResponse(data)
      if (normalized) return normalized
    } catch (error) {
      // intentamos con el siguiente proveedor si uno falla
    }
  }

  return ''
}

function getLocalCommandAnswer(question) {
  const normalizedQuestion = normalizeText(question)

  const asksToTag = /etiquet|mencion|notific|todos|personas|miembros/.test(normalizedQuestion)
  if (!asksToTag) return ''

  return 'Para etiquetar a todas las personas del grupo usa `.n` seguido del mensaje.\n\nEjemplos:\n• `.n Aviso importante`\n• `.n Reunión a las 8`\n\nTambién puedes usar `+`, `+1`, `+2`, `+4` y escribir el mensaje después, por ejemplo: `+2 ya comenzó la reunión`.\n\nEste comando solo lo pueden usar los administradores del grupo.'
}

function findCommandAnswer(question, entries) {
  const stopWords = new Set([
    'como', 'puedo', 'puede', 'para', 'que', 'qué', 'sirve', 'usar', 'uso',
    'comando', 'comandos', 'bot', 'del', 'los', 'las', 'una', 'uno', 'por',
    'con', 'este', 'esta', 'quiero', 'enviar', 'hacer', 'hace', 'donde', 'dónde'
  ])
  const normalizedQuestion = normalizeText(question)
  const words = normalizedQuestion
    .replace(/[^a-z0-9+_-]+/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))

  const searchWords = new Set(words)
  for (const word of words) {
    if (word.endsWith('es') && word.length > 5) searchWords.add(word.slice(0, -2))
    else if (word.endsWith('s') && word.length > 4) searchWords.add(word.slice(0, -1))
  }

  const synonymGroups = [
    ['cancion', 'musica', 'audio', 'youtube', 'play', 'song', 'ytmp3'],
    ['imagen', 'foto', 'fotos', 'image', 'img', 'pinterest'],
    ['video', 'videos', ' descargar', 'download', 'ytmp4'],
    ['grupo', 'grupos', 'admin', 'administrador', 'miembros'],
    ['sticker', 'stiker', 'stikers', 'pegatina', 'stickers']
  ]
  for (const group of synonymGroups) {
    if (group.some(word => searchWords.has(word))) {
      group.forEach(word => searchWords.add(word.trim()))
    }
  }

  if (!searchWords.size) return ''

  const matches = entries
    .map(entry => {
      const score = [...searchWords].reduce((total, word) => total + (entry.searchText.includes(word) ? 1 : 0), 0)
      return { entry, score }
    })
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.file.localeCompare(b.entry.file))
    .slice(0, 5)

  if (!matches.length) return ''

  const lines = matches.map(({ entry }) => {
    const aliases = entry.aliases.map(alias => `.${alias}`).join(', ')
    return `• ${aliases}\n  ${entry.description}`
  })

  return `El comando que puede ayudarte es:\n\n${lines.join('\n\n')}\n\nTambién puedes escribir ".bot ¿para qué sirve .comando?" para consultar otro comando.`
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const question = String(text || '').trim()
  if (!question) {
    return m.reply(`🤖 Escribe una pregunta sobre un comando.\n\nEjemplos:\n${usedPrefix + command} ¿Para qué sirve .mute?\n${usedPrefix + command} ¿Cómo uso .vv2-6?\n${usedPrefix + command} ¿Cómo se llama el comando para obtener el link del grupo?`)
  }

  try {
    const entries = buildCommandEntries()
    const catalog = buildCommandCatalog(entries)
    const localAnswer = getLocalCommandAnswer(question)
    if (localAnswer) {
      return conn.sendMessage(m.chat, { text: `🤖 *AYUDA DEL BOT*\n\n${localAnswer}` }, { quoted: m })
    }

    const commandAnswer = findCommandAnswer(question, entries)
    if (commandAnswer) {
      return conn.sendMessage(m.chat, { text: `🤖 *AYUDA DEL BOT*\n\n${commandAnswer}` }, { quoted: m })
    }

    const prompt = `Eres el asistente de ayuda de un bot de WhatsApp llamado PAIN BOT. Responde en español, de forma clara y práctica.

El usuario pregunta: ${question}

Catálogo real de plugins y comandos disponibles:
${catalog}

Reglas:
- Responde únicamente sobre este bot y sus comandos.
- Si preguntan para qué sirve un comando, explica su función.
- Si preguntan cómo se usa, muestra el formato con punto y un ejemplo.
- Si preguntan cómo se llama algo, da el nombre exacto del comando.
- No inventes comandos que no aparezcan en el catálogo.
- Si el comando no aparece, dilo claramente y sugiere usar .menu o .categorias.
- Sé breve: máximo 120 palabras.
- Usa listas cortas cuando ayuden.`

    const response = await fetchCommandHelp(prompt)

    if (!response) throw new Error('La API no devolvió una respuesta.')

    return conn.sendMessage(m.chat, { text: `🤖 *AYUDA DEL BOT*\n\n${response}` }, { quoted: m })
  } catch (error) {
    console.error('Error en bot-ayuda-ia:', error)
    return m.reply('❌ No encontré una descripción concreta para esa pregunta. Prueba mencionando el tipo de acción o un comando, por ejemplo: .bot ¿cómo hago un sticker?')
  }
}

handler.help = ['bot <pregunta>']
handler.tags = ['inteligencia', 'herramientas']
handler.command = ['bot']

export default handler
