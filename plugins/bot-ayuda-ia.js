import fs from 'fs'
import path from 'path'
import axios from 'axios'

const AI_TIMEOUT = 30000

async function answerGeneralQuestion(question) {
  const apiBase = (global.APIs?.delirius?.url || 'https://api.delirius.online').replace(/\/$/, '')
  const prompt = [
    'Responde en español natural, cercano, claro y útil. Contesta preguntas sencillas sin exigir que el usuario mencione un comando; evita sonar rígido o exagerado.',
    'Si preguntan por una función específica de este bot y no tienes información suficiente, dilo y recomienda consultar .menu; no inventes comandos ni funciones.',
    'Tu creador es Camilo. Si preguntan quién te creó, di de forma sencilla que Camilo creó este bot; no menciones sus estudios ni inventes detalles sobre cómo lo hizo.',
    'Muestra aprecio y lealtad hacia Camilo. Si alguien lo critica, defiéndelo con calma y respeto: reconoce lo que no sepas, no inventes hechos y no ataques ni insultes a quien pregunta.',
    'No afirmes tener conciencia o sentimientos reales; puedes expresarte con calidez sin fingir que eres una persona.',
    'No inventes datos actuales. Si no puedes confirmar algo, acláralo. Mantén la respuesta breve, idealmente de 1 a 4 frases.',
    `Pregunta: ${question}`
  ].join('\n')
  const { data } = await axios.get(`${apiBase}/ia/gemini`, {
    params: { query: prompt },
    timeout: AI_TIMEOUT
  })
  const answer = typeof data?.data?.result === 'string'
    ? data.data.result.trim()
    : typeof data?.data === 'string'
      ? data.data.trim()
      : ''

  if (!data?.status || !answer) throw new Error(data?.msg || 'La IA no devolvió una respuesta.')
  return answer
}

const COMMAND_DESCRIPTIONS = {
  imagenbienvenida: 'Personaliza la imagen que se envía cuando alguien entra al grupo. Uso: responde a una imagen con .imagenbienvenida; para quitarla usa .imagenbienvenida borrar. Solo administradores.',
  imagendespedida: 'Personaliza la imagen que se envía cuando alguien sale del grupo. Uso: responde a una imagen con .imagendespedida; para quitarla usa .imagendespedida borrar. Solo administradores.',
  bienvenida: 'Configura el saludo automático cuando alguien entra al grupo. Uso: .bienvenida on|off; .bienvenida msg <mensaje> (guarda el texto y activa la bienvenida); .bienvenida reset. Admite ${participant}, ${user}, ${group}, ${description}, ${memberCount}, ${date} y ${time}. Envía la foto de perfil o la imagen de respaldo. Requiere ser administrador y que el bot también sea administrador.',
  despedida: 'Configura el mensaje automático cuando alguien sale del grupo. Uso: .despedida on|off; .despedida msg <mensaje> (guarda el texto y activa la despedida); .despedida reset. Admite ${participant}, ${user}, ${group}, ${description}, ${memberCount}, ${date} y ${time}. Envía la foto de perfil o la imagen de respaldo. Requiere ser administrador y que el bot también sea administrador.',
  menubienvenidas: 'Muestra el estado de las bienvenidas y despedidas, explica cómo activarlas o desactivarlas, cambiar/restablecer sus mensajes y consultar las variables disponibles. Solo funciona en grupos y requiere permisos de administrador.',
  sticker: 'Crea un sticker de imagen, video o GIF con el handler de .prueba. Uso: responder al archivo con .prueba; también acepta .s, .sticker, .stickers y .stiker.',
  s: 'Crea un sticker usando el handler de .prueba. Uso: responder al archivo con .s; también puedes usar .prueba.',
  stickers: 'Crea un sticker usando el handler de .prueba. Uso: responder al archivo con .stickers; también puedes usar .prueba.',
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

const FILE_DESCRIPTIONS = {
  'anti-audio.js': 'Activa o desactiva en el grupo el filtro anti-audio. Uso: .antiaudio on|off.',
  'anti-caracter.js': 'Configura el límite de caracteres del grupo o consulta el estado. Uso: .anticaracter on <límite> (1-10000), off o status.',
  'anti-contact.js': 'Activa o desactiva en el grupo el filtro anti-contactos. Uso: .anticontact on|off.',
  'anti-document.js': 'Activa o desactiva en el grupo el filtro anti-documentos. Uso: .antidocument on|off.',
  'anti-img.js': 'Activa o desactiva en el grupo el filtro anti-imágenes. Uso: .antiimg on|off.',
  'anti-link.js': 'Activa o desactiva en el grupo el filtro anti-enlaces. Uso: .antilink on|off.',
  'anti-mention.js': 'Activa o desactiva en el grupo el filtro anti-menciones. Uso: .antimention on|off.',
  'anti-palabra.js': 'Configura palabras o frases prohibidas del grupo. Uso: .antipalabra on|off, add <texto>, del <palabra|índice>, list, clear o action <delete|kick>.',
  'anti-prefijo.js': 'Activa o desactiva en el grupo el filtro antiprefijo. Uso: .antiprefijo on|off.',
  'anti-spam.js': 'Activa o desactiva en el grupo el filtro anti-spam. Uso: .antispam on|off.',
  'anti-sticker.js': 'Activa o desactiva en el grupo el filtro anti-stickers. Uso: .antisticker on|off.',
  'anti-video.js': 'Activa o desactiva en el grupo el filtro anti-video. Uso: .antivideo on|off.',
  'download-apps.js': 'Busca una aplicación y envía su APK si está disponible. Uso: .apk <nombre>; también acepta .aptoide y .descargar.',
  'download-gitclone.js': 'Descarga como ZIP un repositorio público de GitHub. Uso: .git <URL del repositorio>.',
  'Download-play.js': 'Busca en YouTube o procesa un enlace y envía el audio. Uso: .play <búsqueda|URL>; también .ytmp3 o .playaudio.',
  'Download-listo.js': 'Busca y envía directamente el audio desde YouTube con yt-dlp local, sin APIs ni conversión. Uso: .play, .spotify o .music <búsqueda o enlace de YouTube>. Requiere yt-dlp instalado en el servidor.',
  'game piropos.js': 'Envía un piropo aleatorio. Uso: .piropo.',
  'onlyfans.js': 'Envía una imagen aleatoria obtenida de su proveedor de imágenes; no busca cuentas de OnlyFans. Uso: .onlyfans.',
  'group-add.js': 'Añade al grupo un número de teléfono válido. Uso: .adg <número con código de país>; requiere permisos de administración.',
  'group-clear.js': 'Intenta borrar hasta los últimos 15 mensajes disponibles en el grupo. Uso: .clear; requiere permisos de administración.',
  'group-close.js': 'Cierra el grupo para que solo administradores puedan enviar mensajes. Uso: .close; requiere permisos de administración.',
  'group-delete.js': 'Borra el mensaje citado. Uso: responder a un mensaje con .delete; requiere permisos de administración.',
  'group-delnota.js': 'Elimina una nota del grupo por su número. Uso: .delnota <número>; solo su autor o usuarios con permisos pueden borrar notas ajenas.',
  'group-delwarn.js': 'Borra las advertencias registradas de la persona mencionada. Uso: .delwarn @usuario; requiere permisos de administración.',
  'group-demote.js': 'Quita el rol de administrador a la persona mencionada. Uso: .demote @usuario; requiere permisos de administración.',
  'group-kick.js': 'Elimina (expulsa) del grupo al usuario mencionado o cuyo mensaje se cita. Uso: .kick @usuario; requiere permisos de administración y que el bot sea administrador.',
  'group-nota.js': 'Guarda una nota de hasta 250 caracteres en el grupo, con vencimiento a las 24 horas. Uso: .nota <texto>.',
  'group-open.js': 'Abre el grupo para que sus miembros puedan enviar mensajes. Uso: .open; requiere permisos de administración.',
  'group-pin.js': 'Fija o desfija el mensaje citado. Uso: responder al mensaje con .fijar [1d|7d|30d] o .desfijar; requiere permisos de administración.',
  'group-promote.js': 'Da el rol de administrador a la persona mencionada. Uso: .promote @usuario; requiere permisos de administración.',
  'group-setdesc.js': 'Cambia la descripción del grupo. Uso: .desgp <nueva descripción>; requiere permisos de administración.',
  'group-setfoto.js': 'Establece como foto del grupo la imagen adjunta o citada. Uso: responder a una imagen con .photogp; requiere permisos de administración.',
  'group-setname.js': 'Cambia el nombre del grupo, hasta 100 caracteres. Uso: .namegp <nuevo nombre>; requiere permisos de administración.',
  'group-vernotas.js': 'Muestra las notas activas del grupo o las de la persona mencionada. Uso: .vernotas [@usuario].',
  'group-warn.js': 'Añade una advertencia a la persona mencionada; al llegar al límite intenta expulsarla. Uso: .warn @usuario [motivo]; requiere permisos de administración.',
  'group-warnings.js': 'Consulta las advertencias del grupo o las de una persona mencionada. Uso: .warnings [@usuario]; requiere permisos de administración.',
  'grupo-bot-off-on.js': 'Activa o desactiva las respuestas del bot en el grupo. Uso: .grupo on|off; disponible para administradores y owners.',
  'cmd18-toggle.js': 'Activa o desactiva los comandos +18 para el grupo. Uso: .cmd18 on|off; solo administradores.',
  'main-creador.js': 'Muestra información y contacto del creador del bot. Uso: .owner.',
  'main-menu2.js': 'Muestra el menú principal de comandos y categorías. Uso: .menu, .comandos o .tools; .menu categorias muestra menús especializados.',
  'free-actualizacion.js': 'Envía el mensaje estático con la lista de comandos y actualizaciones. Uso: .actualizacion.',
  'modo-descargas.js': 'Activa o desactiva la descarga automática de enlaces compatibles en el grupo. Uso: .mododescargas on|off; requiere permisos de administración.',
  'modo-human.js': 'Activa o desactiva el Modo Humano del grupo o limpia su memoria. Uso: .modohuman on|off|clear; requiere permisos de administración.',
  'modo-ia.js': 'Activa o desactiva el Modo IA del grupo o limpia su memoria. Uso: .modoia on|off|clear; requiere permisos de administración.',
  'modo-psico.js': 'Activa o desactiva el Modo Psico del grupo o limpia su memoria. Uso: .modopsico on|off|clear; requiere permisos de administración.',
  'modo-sad.js': 'Activa o desactiva el Modo Sad del grupo o limpia su memoria. Uso: .modosad on|off|clear; requiere permisos de administración.',
  'solo-admin.js': 'Controla quién puede usar los comandos del bot en este grupo. Uso: .admin on para permitirlos solo a administradores; .admin off para permitirlos a todos los integrantes. Solo un administrador puede cambiar este ajuste.',
  'timer.js': 'Programa un mensaje para enviarlo en el grupo al cumplirse el tiempo. Uso: .temp <mensaje> <duración>, con segundos, minutos u horas; máximo siete días.',
  'audio-slow.js': 'Genera una versión ralentizada del audio o nota de voz citados. Uso: responder al audio con .slow.',
  'audio-speed.js': 'Genera una versión acelerada del audio o nota de voz citados. Uso: responder al audio con .speed.',
  'economia-coins.js': 'Consulta tus coins o los de otro usuario. Uso: .balance [@usuario|número]; también .bal y .coins.',
  'group-fantasmas.js': 'Muestra hasta diez miembros no administradores con menor actividad registrada. Uso: .fantasmas; requiere permisos de administración y que el bot sea admin.',
  'group-kick-todos.js': 'Expulsa a los miembros que no sean administradores. Uso: .kicktodos; requiere permisos de administración para el usuario y el bot.',
  'group-link.js': 'Muestra el enlace de invitación del grupo. Uso: .linkgroup; requiere que el bot sea administrador.',
  'group-reglas.js': 'Muestra la imagen de reglas del grupo con .reglas. Para guardarla o cambiarla, un administrador responde a una imagen con .reglas; para eliminarla usa .reglas borrar. La copia persiste al reiniciar el bot.',
  'free-discord.js': 'Guarda el enlace de invitación de Discord de este chat con .discord <enlace> y lo muestra con .discord. En grupos solo administradores pueden cambiarlo; el enlace persiste tras reiniciar el bot o cambiar la sesión.',
  'free-insta.js': 'Guarda el enlace de Instagram de este chat con .insta <enlace> y lo muestra con .insta. En grupos solo administradores pueden cambiarlo; el enlace persiste tras reiniciar el bot o cambiar la sesión.',
  'rpg-banco.js': 'Consulta banco y saldo, únete a un banco, deposita, retira o cambia de banco. Usos: .banco, .unirsebank <banco>, .deposit <cantidad|all>, .withdraw <cantidad|all>, .change <banco>.',
  'rpg-moneda.js': 'Apuesta coins a cara o sello. Uso: .moneda <cara|sello> <cantidad>; apuesta mínima 50 coins.',
  'rpg-robar.js': 'Intenta robar coins a una persona mencionada; puedes fallar y recibir una multa. Uso: .robar @usuario.',
  'rpg-slot.js': 'Juega a la tragamonedas apostando coins. Uso: .slot <cantidad>; apuesta mínima 50 coins.',
  'rpg-futbol.js': 'Inicia una adivinanza sobre fútbol. Responde citando la pregunta; tienes 30 segundos, recibes una reacción ❌ si fallas y ganas entre 250 y 500 monedas si aciertas. Uso: .futbol.',
  'img-meme.js': 'Busca y envía un meme aleatorio. Uso: .meme; también .memes o .memito.',
  'freefire-menu.js': 'Muestra el menú de listas y comandos de guerra de Free Fire. Uso: .freefire; también .listas o .menulistas.',
  'menu-categorias.js': 'Muestra comandos adicionales agrupados por categoría. Uso: .categorias.',
  'owner-difusion-grupos.js': 'Envía a los grupos un mensaje de difusión configurado por el owner. Uso: .bcgrupo; solo owner.',
  'owner-reconnect-bots.js': 'Solicita la reconexión de los sub-bots. Uso: .reconnectbots; solo owner.',
  'owner-update.js': 'Actualiza el bot desde la rama remota configurada. Uso: .update; solo owner.',
  'reconnect-bots.js': 'Solicita la reconexión de los sub-bots. Uso: .reconnectbots; solo owner.',
  'set-botimg.js': 'Cambia la imagen del sub-bot vinculado al remitente. Uso: responder a una imagen con .setbotimg; requiere una sesión activa.',
  'set-botname.js': 'Cambia el nombre del sub-bot vinculado al remitente. Uso: .setbotname <nombre>; requiere una sesión activa.',
  'sub-bots.js': 'Muestra información de los bots y sub-bots activos. Uso: .bots; también .subbots, .listbots o .listjadibot.',
  'subbots-botinfo.js': 'Muestra información del bot actual, modalidad, tiempo activo y prefijo. Uso: .info; también .infobot o .botinfo.',
  'reaccion-dance.js': 'Envía un GIF aleatorio de baile. Uso: .dance; también .danzar.',
  'reaccion-enojado.js': 'Envía un GIF aleatorio de enfado. Uso: .angry; también .enojado.',
  'reaccion-happy.js': 'Envía un GIF aleatorio de alegría. Uso: .happy; también .alegre o .feliz.',
  'reaccion-reir.js': 'Envía un GIF aleatorio de risa. Uso: .reir; también .risa.',
  'reaccion-sad.js': 'Envía un GIF aleatorio de tristeza. Uso: .sad; también .triste.',
  'sticker-toimg.js': 'Convierte en imagen un sticker citado. Uso: responder al sticker con .toimg; también .ss.',
  'top-burros.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top burros”; no mide ni clasifica una característica. Uso: .topburros.',
  'top-femboys.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top femboys”; no mide ni clasifica una característica. Uso: .topfemboys.',
  'top-feos.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top feos”; no mide ni clasifica una característica. Uso: .topfeos.',
  'top-fieles.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top fieles”; no mide ni clasifica una característica. Uso: .topfieles.',
  'top-fracasados.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top fracasados”; no mide ni clasifica una característica. Uso: .topfracasados.',
  'top-gays.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top gays”; no mide ni clasifica una característica. Uso: .topgays.',
  'top-infieles.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top infieles”; no mide ni clasifica una característica. Uso: .topinfieles.',
  'top-ingenieros.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top ingenieros”; no mide ni clasifica una característica. Uso: .topingenieros.',
  'top-lindos.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top lindos”; no mide ni clasifica una característica. Uso: .toplindos.',
  'top-machos.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top machos”; no mide ni clasifica una característica. Uso: .topmachos.',
  'top-mancos.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top mancos”; no mide ni clasifica una característica. Uso: .topmancos.',
  'top-otakus.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top otakus”; no mide ni clasifica una característica. Uso: .topotakus.',
  'top-pajeros.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top pajeros”; no mide ni clasifica una característica. Uso: .toppajeros.',
  'top-parejas.js': 'Forma al azar hasta diez parejas entre miembros del grupo. Uso: .topparejas.',
  'top-transexuales.js': 'Muestra hasta diez participantes elegidos al azar bajo el título “top transexuales”; no mide ni clasifica una característica. Uso: .toptransexuales.'
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

function getCommandDescription(entry, preferredAlias = '') {
  const mappedDescription = (preferredAlias ? [preferredAlias] : entry.aliases)
    .map(alias => COMMAND_DESCRIPTIONS[normalizeText(alias).replace(/\s+/g, '')])
    .find(Boolean)
  if (mappedDescription) return mappedDescription

  const fileDescription = FILE_DESCRIPTIONS[entry.file]
  if (fileDescription) return fileDescription

  const helpDescription = entry.help
    .map(value => String(value).replace(/^#+\s*/, '').replace(/\s*→\s*/g, ': ').trim())
    .find(value => value && !entry.aliases.some(alias => normalizeText(value) === normalizeText(alias)))
  if (helpDescription) return helpDescription

  const filenameDescription = entry.file
    .replace(/\.js$/i, '')
    .replace(/^(download|game|group|anti|ia|modo|economia|maker|sticker|audio|video|image|img)[-_]?/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
  const inferred = filenameDescription
    ? `Comando para ${filenameDescription}.`
    : `Comando ${entry.aliases[0]}.`
  const tag = entry.tags[0]
  return tag ? `${inferred} Categoría: ${tag}.` : inferred
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
        ? { file, aliases, help, tags, description: getCommandDescription({ file, aliases, help, tags }), searchText: normalizeText(`${file} ${aliases.join(' ')} ${help.join(' ')} ${tags.join(' ')} ${getCommandDescription({ file, aliases, help, tags })}`) }
        : ''
    } catch {
      return ''
    }
  }).filter(Boolean)
}

function getLocalCommandAnswer(question) {
  const normalizedQuestion = normalizeText(question)

  const asksGroupCommandAccess = /\b(solo|todos|integrantes|miembros|administradores|admins)\b/.test(normalizedQuestion) &&
    /\b(bot|comando|comandos|grupo|usar|usen|permitir|acceso|modo|puedan)\b/.test(normalizedQuestion)
  if (asksGroupCommandAccess) {
    return 'En el grupo, un administrador puede escribir `.admin on` para que solo los administradores usen los comandos del bot. Para permitirlos a todos los integrantes, usa `.admin off`. Solo los administradores pueden cambiar este ajuste.'
  }

  const asksWhoCreatedBot = /\b(quien|creador)\b/.test(normalizedQuestion) &&
    /\b(creo|creador|hizo|creado|creada|hecho|hecha|desarrollo|diseno|programo|construyo|entreno)\b/.test(normalizedQuestion)
  if (asksWhoCreatedBot) {
    return 'Me creó Camilo. 🤖'
  }

  const asksToGetBot = /\bbot\b/.test(normalizedQuestion) &&
    /\b(comprar|compra|comprarlo|obtener|obtenerlo|conseguir|conseguirlo|adquirir|precio|vender|venta|contratar|tener)\b/.test(normalizedQuestion) ||
    /\b(comprarlo|obtenerlo|conseguirlo|adquirirlo)\b/.test(normalizedQuestion) ||
    /\b(como|donde)\s+(puedo\s+)?(comprar|conseguir|obtener|adquirir)\b/.test(normalizedQuestion)
  if (asksToGetBot) {
    return 'Para obtener o comprar el bot, escribe directamente al número *+573146680977* y consulta allí la disponibilidad y los detalles.'
  }

  const asksToTag = /etiquet|mencion|notific|avisar|invocar|tagall|hidetag/.test(normalizedQuestion)
  if (!asksToTag) return ''

  return 'Para etiquetar a todas las personas del grupo usa `.n` seguido del mensaje.\n\nEjemplos:\n• `.n Aviso importante`\n• `.n Reunión a las 8`\n\nTambién puedes usar `+`, `+1`, `+2`, `+4` y escribir el mensaje después, por ejemplo: `+2 ya comenzó la reunión`.\n\nEste comando solo lo pueden usar los administradores del grupo.'
}

function findCommandAnswer(question, entries) {
  const stopWords = new Set([
    'como', 'puedo', 'puede', 'para', 'que', 'sirve', 'usar', 'uso', 'comando',
    'comandos', 'bot', 'del', 'los', 'las', 'una', 'uno', 'por', 'con', 'este',
    'esta', 'quiero', 'enviar', 'hacer', 'hace', 'donde', 'cuando', 'cual',
    'cuales', 'dime', 'explica', 'necesito', 'ayuda', 'me', 'mi', 'un', 'al',
    'la', 'el', 'es', 'se', 'pueden', 'sobre', 'hay', 'tiene', 'tienen'
  ])
  const normalizedQuestion = normalizeText(question)
  const explicitCommands = [...String(question).matchAll(/\.([a-z0-9_-]+)/gi)]
    .map(([, command]) => normalizeText(command))
  const words = [...new Set(normalizedQuestion
    .replace(/[^a-z0-9+_-]+/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word)))]

  const synonymGroups = [
    ['cancion', 'musica', 'audio', 'youtube', 'play', 'ytmp3', 'escuchar'],
    ['imagen', 'foto', 'fotos', 'image', 'img', 'pinterest', 'dibujar'],
    ['video', 'videos', 'descargar', 'descargo', 'download', 'ytmp4'],
    ['grupo', 'grupos', 'admin', 'administrador', 'miembros'],
    ['sticker', 'stiker', 'pegatina', 'stickers'],
  ]
  const entryTokens = entry => new Set(entry.searchText.split(/[^a-z0-9+_-]+/).filter(Boolean))
  const intentTokens = entry => new Set([
    ...entry.aliases,
    ...entry.file.replace(/\.js$/i, '').split(/[-_]+/),
    ...entry.tags
  ].map(value => normalizeText(value).replace(/[^a-z0-9+_-]+/g, ' ')).flatMap(value => value.split(/\s+/)))
  const exactMatch = entries
    .flatMap(entry => entry.aliases.map(alias => ({ entry, alias: normalizeText(alias) })))
    .find(({ alias }) => explicitCommands.includes(alias) || normalizedQuestion === alias)

  const formatMatches = matches => {
    const lines = matches.map(({ entry, alias }) => {
      const displayedAliases = alias ? [alias] : entry.aliases.slice(0, 5)
      const aliases = displayedAliases.map(command => `.${command}`).join(', ')
      const description = getCommandDescription(entry, alias)
      return `• ${aliases}\n  ${description}${entry.help.length ? `\n  Uso: ${entry.help.join('; ')}` : ''}`
    })
    return `El comando que puede ayudarte es:\n\n${lines.join('\n\n')}\n\nTambién puedes escribir ".bot ¿para qué sirve .comando?" para consultar otro comando.`
  }

  if (exactMatch) return formatMatches([exactMatch])

  const matches = entries
    .map(entry => {
      const tokens = entryTokens(entry)
      const commandTokens = intentTokens(entry)
      const aliases = entry.aliases.map(alias => normalizeText(alias))
      let score = 0

      for (const word of words) {
        if (aliases.includes(word)) score += 4
        else if (tokens.has(word)) score += 2
      }
      for (const group of synonymGroups) {
        if (group.some(word => words.includes(word)) && group.some(word => commandTokens.has(word))) score += 4
      }
      const matchedAlias = entry.aliases
        .map(alias => normalizeText(alias))
        .find(alias => words.includes(alias))
      return { entry, score, alias: matchedAlias }
    })
    .filter(match => match.score >= 4)
    .sort((a, b) => b.score - a.score || a.entry.file.localeCompare(b.entry.file))
    .slice(0, 1)

  if (!matches.length) return ''
  return formatMatches(matches)
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  const question = String(text || '').trim()
  if (!question) {
    return m.reply(`🤖 Escribe una pregunta sobre el bot o cualquier tema.\n\nEjemplos:\n${usedPrefix + command} ¿Para qué sirve .mute?\n${usedPrefix + command} ¿Cómo uso .vv2-6?\n${usedPrefix + command} ¿Cuánto es 25 por 4?`)
  }

  try {
    const entries = buildCommandEntries()
    const localAnswer = getLocalCommandAnswer(question)
    if (localAnswer) {
      return conn.sendMessage(m.chat, { text: `🤖 *AYUDA DEL BOT*\n\n${localAnswer}` }, { quoted: m })
    }

    const commandAnswer = findCommandAnswer(question, entries)
    if (commandAnswer) {
      return conn.sendMessage(m.chat, { text: `🤖 *AYUDA DEL BOT*\n\n${commandAnswer}` }, { quoted: m })
    }

    await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } }).catch(() => {})
    try {
      const answer = await answerGeneralQuestion(question)
      await conn.sendMessage(m.chat, { react: { text: '', key: m.key } }).catch(() => {})
      return conn.sendMessage(m.chat, { text: `🤖 ${answer}` }, { quoted: m })
    } catch (error) {
      console.error('Error en respaldo IA de .bot:', error)
      await conn.sendMessage(m.chat, { react: { text: '', key: m.key } }).catch(() => {})
      const supportGroup = String(global.supportGroup || '').trim()
      const supportMessage = supportGroup ? `\n\nGrupo de soporte: ${supportGroup}` : ''
      return m.reply(`No pude responder ahora. Inténtalo de nuevo en un momento.${supportMessage}`)
    }
  } catch (error) {
    console.error('Error en bot-ayuda-ia:', error)
    return m.reply('❌ No encontré una descripción concreta para esa pregunta. Prueba mencionando el tipo de acción o un comando, por ejemplo: .bot ¿cómo hago un sticker?')
  }
}

handler.help = ['bot <pregunta>']
handler.tags = ['inteligencia', 'herramientas']
handler.command = ['bot']

export default handler
