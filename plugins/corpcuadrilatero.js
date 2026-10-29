/*
 * ================= CORP CUADRILÁTEROS (v2.1) =================
 * 4 equipos. Gana el primero que llegue a 2 salas (mín. 2, máx. 5).
 * Grupo de EQUIPOS: registra equipos. Grupo de FLYERS: usa la clave.
 *
 * Los comandos con clave envían los flyers al grupo de EQUIPOS.
 *
 * Plantillas (en la carpeta raíz del bot):
 *   CAIDAS.png · MATCH_DAY.png · BOOYAH__5M.png · GANADOR.png · reglas.png
 * ==============================================================
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from '../lib/sharp.js'

// ---------- Comandos ----------
const SUFIJO = 'corp'
const BASES = ['iniciarcuadri', 'cuadri', 'quitarequipo', 'equipos', 'participantes', 'clave', 'fincuadri',
  'ganador', 'salas', 'campeon', 'borrarsala', 'enviartodo', 'menucuadri',
  'matchdaycuadri', 'machdaycuadri', 'caidascuadri']
const ALIAS_CORTOS = {
  qini: 'iniciarcuadri',
  cuadri: 'cuadri',
  qquita: 'quitarequipo',
  qeq: 'equipos',
  qpart: 'participantes',
  qkey: 'clave',
  qfin: 'fincuadri',
  qgana: 'ganador',
  qsalas: 'salas',
  qcamp: 'campeon',
  qborra: 'borrarsala',
  qtodo: 'enviartodo',
  qmenu: 'menucuadri',
  qmd: 'matchdaycuadri',
  qcaidas: 'caidascuadri'
}
const cmd = b => b + SUFIJO
const aliasPorBase = Object.fromEntries(Object.entries(ALIAS_CORTOS).map(([alias, base]) => [base, alias]))
const COMANDOS_DIRECTOS = {
  ganador: 'ganador',
  enviartodo: 'enviartodo',
  enviarinfo: 'enviarinfo',
  matchday: 'matchdaycuadri',
  machday: 'matchdaycuadri',
  caidas: 'caidascuadri',
  reglas: 'reglas',
  vip: 'vip',
  winner: 'campeon',
  booyah: 'salas'
}
const NOMBRES_PUBLICOS = {
  ganador: 'ganador',
  enviartodo: 'enviartodo',
  enviarinfo: 'enviarinfo',
  matchdaycuadri: 'matchday',
  caidascuadri: 'caidas',
  reglas: 'reglas',
  vip: 'vip',
  campeon: 'winner',
  salas: 'booyah'
}
const c = b => '.' + (NOMBRES_PUBLICOS[b] || aliasPorBase[b] || cmd(b))
const baseDe = {
  ...Object.fromEntries(BASES.map(b => [cmd(b), b])),
  ...Object.fromEntries(Object.entries(ALIAS_CORTOS).map(([alias, base]) => [alias, base])),
  ...COMANDOS_DIRECTOS
}
baseDe[cmd('machdaycuadri')] = 'matchdaycuadri' // alias por si lo escriben sin la "t"
const RESULTADOS = new Set(['ganador', 'salas', 'campeon', 'borrarsala', 'enviartodo'])
const COMANDOS_CON_CLAVE = new Set([
  ...RESULTADOS, 'participantes', 'matchdaycuadri', 'caidascuadri', 'reglas', 'vip', 'enviarinfo'
])

// ---------- Reglas ----------
const MAX_EQUIPOS = 4
const SALAS_PARA_GANAR = 2
const MAX_SALAS = 5
const NOMBRE_EN_GANADOR = true // escribe el nombre del equipo en la barra negra del flyer GANADOR

const COLORES = [
  { id: 'negro', nombre: 'Negro', casillas: [1, 2, 3] },
  { id: 'blanco', nombre: 'Blanco', casillas: [4, 5, 6] },
  { id: 'amarillo', nombre: 'Amarillo', casillas: [7, 8, 9] },
  { id: 'rojo', nombre: 'Rojo', casillas: [10, 11, 12] }
]
const colorPorId = Object.fromEntries(COLORES.map((color, i) => [color.id, { ...color, indice: i }]))

// ---------- Rutas ----------
const DATA_DIR = './cuadri-data-corp'
const LOGO_DIR = path.join(DATA_DIR, 'logos')
const CLAVES_FILE = path.join(DATA_DIR, 'claves.json')
fs.mkdirSync(LOGO_DIR, { recursive: true })

const PLANTILLAS = {
  caidas: 'CAIDAS.png',
  matchday: 'MATCH_DAY.png',
  salas: 'BOOYAH__5M.png',
  ganador: 'GANADOR.png',
  reglas: 'reglas.png'
}
const X_MAPA = path.resolve('.', 'equis corp.png')
const rutaPlantilla = tipo => path.resolve('.', PLANTILLAS[tipo])
const hayPlantilla = tipo => fs.existsSync(rutaPlantilla(tipo))

// ---------- Posiciones de los logos ----------
// Las coordenadas están medidas sobre un ancho base de 1724 px; se escalan al ancho real de cada plantilla.
const BASE_ANCHO = 1724
const ZONAS = {
  // 4 recuadros alineados abajo (uno por zona de caída)
  caidas: [
    { cx: 316, cy: 1660, size: 270 }, { cx: 678, cy: 1660, size: 270 },
    { cx: 1040, cy: 1660, size: 270 }, { cx: 1402, cy: 1660, size: 270 }
  ],
  // 4 recuadros 2x2
  matchday: [
    { cx: 521, cy: 998, size: 480 }, { cx: 1203, cy: 998, size: 480 },
    { cx: 521, cy: 1596, size: 480 }, { cx: 1203, cy: 1596, size: 480 }
  ],
  // 5 columnas (MAPA 1 a MAPA 5): logo del ganador de cada sala
  salas: [
    { cx: 300, cy: 1150, size: 230 }, { cx: 581, cy: 1150, size: 230 },
    { cx: 861, cy: 1150, size: 230 }, { cx: 1141, cy: 1150, size: 230 },
    { cx: 1421, cy: 1150, size: 230 }
  ],
  // recuadro grande central
  ganador: [{ cx: 862, cy: 743, size: 1000 }]
}
// Barra negra bajo el recuadro del ganador (donde va el nombre)
const BARRA_GANADOR = { cx: 925, cy: 1424, w: 700, h: 80 }

// ---------- Estado ----------
const keyOf = v => String(v).replace(/[^\w-]/g, '_')
const stateFile = g => path.join(DATA_DIR, `${keyOf(g)}.json`)
const estadoVacio = () => ({ activo: false, equipos: {}, salas: {}, ganador: null, clave: null })
const load = g => { try { return { ...estadoVacio(), ...JSON.parse(fs.readFileSync(stateFile(g), 'utf8')) } } catch { return estadoVacio() } }
const save = (g, s) => fs.writeFileSync(stateFile(g), JSON.stringify(s, null, 2))

const leerClaves = () => { try { return JSON.parse(fs.readFileSync(CLAVES_FILE, 'utf8')) } catch { return {} } }
function nuevaClave(group) {
  const claves = leerClaves()
  for (const [k, v] of Object.entries(claves)) if (v === group) delete claves[k]
  let clave
  do { clave = String(crypto.randomInt(1000, 10000)) } while (claves[clave])
  claves[clave] = group
  fs.writeFileSync(CLAVES_FILE, JSON.stringify(claves, null, 2))
  return clave
}
function borrarLogosGrupo(group) {
  const prefijo = `${keyOf(group)}_`
  try { for (const f of fs.readdirSync(LOGO_DIR)) if (f.startsWith(prefijo)) fs.unlinkSync(path.join(LOGO_DIR, f)) } catch {}
}

// ---------- Utilidades ----------
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const teamKey = nombre => 't' + crypto.createHash('md5').update(norm(nombre)).digest('hex').slice(0, 10)
const colorDeEquipo = (equipo, indice) => colorPorId[norm(equipo.color)] || colorPorId[COLORES[indice % COLORES.length].id]
const negrita = s => [...String(s)].map(ch => {
  const k = ch.charCodeAt(0)
  if (k >= 65 && k <= 90) return String.fromCodePoint(0x1D5D4 + k - 65)
  if (k >= 97 && k <= 122) return String.fromCodePoint(0x1D5EE + k - 97)
  if (k >= 48 && k <= 57) return String.fromCodePoint(0x1D7EC + k - 48)
  return ch
}).join('')
const escXml = s => String(s).replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[ch]))

const ORDINALES = ['', 'Primera', 'Segunda', 'Tercera', 'Cuarta', 'Quinta']
const nombreSala = n => `${ORDINALES[n] || `${n}ª`} sala`
const ORD_TEXTO = { primera: 1, primer: 1, '1ra': 1, segunda: 2, '2da': 2, tercera: 3, '3ra': 3, cuarta: 4, '4ta': 4, quinta: 5, '5ta': 5 }

const victorias = s => {
  const v = Object.fromEntries(Object.keys(s.equipos).map(id => [id, 0]))
  for (const id of Object.values(s.salas)) if (v[id] !== undefined) v[id]++
  return v
}
const salasJugadas = s => Object.keys(s.salas).length

function resolverEquipo(s, ref) {
  const ids = Object.keys(s.equipos)
  const r = String(ref || '').trim()
  if (!r) return undefined
  if (/^\d+$/.test(r)) return ids[Number(r) - 1]
  if (s.equipos[teamKey(r)]) return teamKey(r)
  const cands = ids.filter(id => norm(s.equipos[id].nombre).includes(norm(r)))
  return cands.length === 1 ? cands[0] : undefined
}
function resolverEquipoPorColor(s, ref) {
  const color = colorPorId[norm(ref)]
  if (!color) return undefined
  return Object.entries(s.equipos).find(([, equipo], i) => colorDeEquipo(equipo, i).id === color.id)?.[0]
}
const marcador = s => {
  const v = victorias(s)
  return Object.entries(s.equipos).map(([id, e], i) => `${i + 1}. ${e.nombre} — *${v[id]}* ${v[id] === 1 ? 'sala' : 'salas'}`).join('\n')
}

// ---------- Captions ----------
const marco = (titulo, cuerpo) => `⸻- 🦩 *${titulo}* -⸻\n\n${cuerpo}`
const capParticipantes = s => `ᝰ.ᐟ𝙈𝘼𝙏𝘾𝙃 𝘿𝘼𝙔🐍\n\n` +
  `⤷𝐄𝐐𝐔𝐈𝐏𝐎𝐒 💕 (${Object.keys(s.equipos).length}/${MAX_EQUIPOS})\n\n` +
  Object.values(s.equipos).map((e, i) => `-> 🎀 ${colorDeEquipo(e, i).nombre} › ${negrita(e.nombre.toUpperCase())}`).join('\n')
const capCaidas = s => `ᝰ.ᐟ𝘾𝘼𝙄𝘿𝘼𝙎 𝙔 𝙍𝙊𝙏𝘼𝘾𝙄𝙊𝙉𝙀𝙎🐍\n\n` +
  `⤷𝐂𝐀𝐈𝐃𝐀𝐒 💕\n\n` +
  Object.values(s.equipos).map((e, i) => {
    const color = colorDeEquipo(e, i)
    return `-> 🪂 ${color.nombre} › ${negrita(e.nombre.toUpperCase())} › C${color.casillas.join(', C')}`
  }).join('\n')
const capReglas = `ᝰ.ᐟ𝙍𝙀𝙂𝙇𝘼𝙎 🐍

➠𝙇𝙚𝙚𝙧 𝙩𝙤𝙙𝙖 𝙡𝙖 𝙞𝙣𝙛𝙤𝙧𝙢𝙖𝙘𝙞𝙤́𝙣.
➠𝙑𝙚𝙨𝙩𝙞𝙢𝙚𝙣𝙩𝙖 𝙢𝙖́𝙨 𝙖 𝙨𝙪 𝙘𝙤𝙡𝙤𝙧 𝙖𝙨𝙞𝙜𝙣𝙖𝙙𝙤.
➠𝙀𝙡 𝙣𝙞𝙫𝙚𝙡 𝙙𝙚 𝙘𝙪𝙚𝙣𝙩𝙖 𝙚𝙨 +𝟮𝟬 𝙮 𝙣𝙤 𝙚𝙨 𝙢𝙤𝙙𝙞𝙛𝙞𝙘𝙖𝙗𝙡𝙚.`
const capVip = `Les recuerdo que ahora contamos con *grupo VIP*, así que cada victoria contará para poder *ascender*.

> \`\`\` Que tengan una linda tarde, nos vemos en un rato. 🫰\`\`\``
const capSalas = s => {
  const v = victorias(s)
  const filas = Object.entries(s.salas).map(([n, id]) => `-> 🏁 ${nombreSala(Number(n))} › ${negrita(String(s.equipos[id]?.nombre || '-').toUpperCase())}`).join('\n')
  return marco('BOOYAH', `⤷𝐒𝐀𝐋𝐀𝐒 💕\n\n${filas || '-> Aún sin salas'}\n\n` +
    Object.entries(s.equipos).map(([id, e]) => `-> ${negrita(e.nombre.toUpperCase())} › ${v[id]}`).join('\n'))
}
const capCampeon = s => marco('GANADOR DEL CUADRILÁTERO',
  `⤷𝐂𝐀𝐌𝐏𝐄𝐎𝐍 💕\n\n-> 👑 ${negrita(String(s.equipos[s.ganador]?.nombre || '-').toUpperCase())} › ${victorias(s)[s.ganador] || 0} salas\n\n⊱_ESTADO_ 🏆\n-> 🎀 *¡Ganó el cuadrilátero!* 🔥`)
const capPublicacionFinal = s => {
  const victoriasEquipo = victorias(s)
  const ranking = Object.entries(s.equipos)
    .sort(([idA], [idB]) => Number(idB === s.ganador) - Number(idA === s.ganador) || victoriasEquipo[idB] - victoriasEquipo[idA])
    .map(([id, equipo], i) => `${['🥇', '🥈', '🥉', '🏅'][i]} • ${equipo.nombre.toUpperCase()}${id === s.ganador ? '\n@Usuario desconocido' : ''}`)
    .join('\n')
  return `╰━𝗖𝗨𝗔𝗗𝗥𝗜𝗦 𝗧𝗬𝗣𝗛𝗢𝗡━╮

 ✦│| 𝗙𝗘𝗖𝗛𝗔: 
 ✦│| 𝗛𝗢𝗥𝗔: 
 ✦│| 𝗢𝗥𝗚: 

🐍 𝗧𝗬𝗣𝗛𝗢𝗡 𝗚𝗔𝗠𝗜𝗡𝗚 —
 𝗔𝘁𝗮𝗰𝗮𝗿. 𝗗𝗼𝗺𝗶𝗻𝗮𝗿. 𝗩𝗲𝗻𝗰𝗲𝗿.

${ranking}

🏆 | 𝙂𝙇𝙊𝙍𝙄𝘼 𝘼𝙇 𝘾𝘼𝙈𝙋𝙀𝙊́𝙉
🔥 | 𝙂𝙍𝘼𝘾𝙄𝘼𝙎 𝙋𝙊𝙍 𝙎𝙀𝙍 𝙋𝘼𝙍𝙏𝙀 𝙉𝙊𝙎 𝙋𝙐𝙀𝘿𝙀𝙉 𝙀𝙏𝙄𝙌𝙐𝙀𝙏𝘼𝙍 𝙀𝙉 𝙉𝙐𝙀𝙎𝙏𝙍𝙊 𝙄𝙂 @𝙘𝙪𝙖𝙙𝙧𝙞𝙨𝙩𝙮𝙥𝙝𝙤𝙣

#𝙂𝙊𝙏𝙔𝙋𝙃𝙊𝙉𝙂𝘼𝙈𝙄𝙉𝙂
#𝙉𝙤 𝙫𝙞𝙣𝙞𝙢𝙤𝙨 𝙖 𝙨𝙚𝙧 𝙪𝙣𝙤 𝙢á𝙨.
𝙀𝙣 𝙡𝙖 𝙖𝙧𝙚𝙣𝙖, 𝙨𝙤𝙡𝙤 𝙡𝙤𝙨 𝙢𝙚𝙟𝙤𝙧𝙚𝙨 𝙨𝙤𝙗𝙧𝙚𝙫𝙞𝙫𝙚𝙣.`
}

// ---------- Imágenes ----------
const TRANSPARENTE = { r: 0, g: 0, b: 0, alpha: 0 }
const guardarLogo = (buffer, file) =>
  sharp(buffer).rotate().resize(800, 800, { fit: 'contain', background: TRANSPARENTE }).png().toFile(file)
const logoEn = (file, size) =>
  sharp(file).resize(size, size, { fit: 'contain', background: TRANSPARENTE }).png().toBuffer()

// Texto centrado como capa SVG
const textoCapa = (texto, w, h) => {
  let fs_ = Math.round(h * 0.72)
  const maxChars = Math.max(1, Math.floor(w / (fs_ * 0.62)))
  if (texto.length > maxChars) fs_ = Math.max(12, Math.floor(fs_ * maxChars / texto.length))
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">` +
    `<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="${fs_}" fill="#ffffff">${escXml(texto)}</text></svg>`)
}

// Pega los logos (y textos opcionales) sobre la plantilla, escalando al ancho real
async function componer(tipo, items, textos = []) {
  const base = await sharp(rutaPlantilla(tipo)).png().toBuffer()
  const { width } = await sharp(base).metadata()
  const k = width / BASE_ANCHO
  const capas = []
  for (const it of items) {
    try {
      const size = Math.round(it.size * k)
      capas.push({
        input: await logoEn(it.file, size),
        left: Math.round(it.cx * k - size / 2),
        top: Math.round(it.cy * k - size / 2)
      })
    } catch (e) { console.log(`[corp] logo ${tipo}:`, e?.message) }
  }
  for (const t of textos) {
    try {
      const w = Math.round(t.w * k), h = Math.round(t.h * k)
      capas.push({
        input: textoCapa(t.texto, w, h),
        left: Math.round(t.cx * k - w / 2),
        top: Math.round(t.cy * k - h / 2)
      })
    } catch (e) { console.log(`[corp] texto ${tipo}:`, e?.message) }
  }
  return sharp(base).composite(capas).png().toBuffer()
}
const imgEquipos = (tipo, s) =>
  componer(tipo, Object.values(s.equipos)
    .map((e, i) => ({ equipo: e, color: colorDeEquipo(e, i) }))
    .sort((a, b) => a.color.indice - b.color.indice)
    .slice(0, ZONAS[tipo].length)
    .map(({ equipo }, i) => ({ file: equipo.logo, ...ZONAS[tipo][i] })))
const imgCaidas = s => imgEquipos('caidas', s)
const imgMatchDay = s => imgEquipos('matchday', s)
const imgParticipantes = imgMatchDay
// Cada sala ganada pone el logo de su ganador en la columna "MAPA n"
const imgSalas = s => componer('salas',
  ZONAS.salas.map((zona, i) => {
    const equipo = s.equipos[s.salas[i + 1]]
    return { file: equipo?.logo || X_MAPA, ...zona }
  }))
const imgCampeon = s => componer('ganador',
  [{ file: s.equipos[s.ganador].logo, ...ZONAS.ganador[0] }],
  NOMBRE_EN_GANADOR ? [{ texto: String(s.equipos[s.ganador].nombre).toUpperCase(), ...BARRA_GANADOR }] : [])

// ---------- Descargar el logo enviado ----------
const EXT_IMAGEN = /\.(jpe?g|png|webp|gif|bmp|tiff?|avif|heic|heif)$/i
async function getImage(m) {
  for (const q of [m, m.quoted]) {
    if (!q) continue
    const mime = String(q.mimetype || q.mediaType || q.msg?.mimetype || '').toLowerCase()
    const nombre = String(q.msg?.fileName || '')
    if (!mime.startsWith('image/') && !EXT_IMAGEN.test(nombre)) continue
    try {
      const buffer = await q.download()
      return { found: true, buffer: buffer?.length ? buffer : null }
    } catch { return { found: true, buffer: null } }
  }
  return { found: false, buffer: null }
}
const captionDe = m => String(m.msg?.caption || m.text || '')
  .replace(new RegExp(`^\\s*[.!#/]?(?:${cmd('cuadri')}|${aliasPorBase.cuadri})\\s*`, 'i'), '').trim()

// ---------- Comandos ----------
async function ejecutar(m, { conn, args, command, isOwner }) {
  const comando = baseDe[String(command).toLowerCase()]
  if (!comando) return
  const chatActual = m.chat
  const sender = conn.decodeJid(m.sender)

  // Permisos (el comando .cuadri lo puede usar cualquiera)
  const digitos = v => String(v || '').replace(/[:@].*$/, '').replace(/\D/g, '')
  const mios = [m.sender, m.key?.participant, m.senderLid, m.senderPn].map(digitos).filter(Boolean)
  const permitidos = (global.cuadriUsers || global.scrimUsers || []).map(digitos).filter(Boolean)
  if (comando !== 'cuadri' && !isOwner && !mios.some(id => permitidos.includes(id))) {
    return m.reply(`⛔ No tienes permiso para usar los comandos del cuadrilátero.\nTu ID: ${mios.join(' / ') || 'desconocido'}\nUn owner debe agregarlo en config.js → global.cuadriUsers`)
  }

  // La clave vincula los comandos del grupo de flyers al grupo de equipos.
  let group = chatActual
  let clave = null
  const primero = String(args[0] || '')
  const pareceClave = /^\d{4}$/.test(primero)
  if (pareceClave && comando !== 'cuadri' && comando !== 'iniciarcuadri') {
    const origen = leerClaves()[primero]
    if (origen) { clave = primero; group = origen; args = args.slice(1) }
  }
  if (comando === 'reglas' && !pareceClave) return
  if (COMANDOS_CON_CLAVE.has(comando)) {
    if (!clave) return m.reply(pareceClave ? '❌ Clave incorrecta o ese cuadrilátero ya no existe.' : `🔐 Usa este comando en el *grupo de flyers* con la clave.\nEjemplo: ${c(comando)} 1234`)
    if (group === chatActual) return m.reply('🚫 Usa este comando en el grupo de flyers, no en el de equipos.')
  }

  const state = load(group)
  const chatDestino = clave ? group : chatActual
  const sendImage = (image, caption = '') => conn.sendMessage(chatDestino, { image, caption })
  const sendAlbum = async images => {
    const album = await conn.sendMessage(chatDestino, {
      album: { expectedImageCount: images.length, expectedVideoCount: 0 }
    })
    for (const image of images) {
      await conn.sendMessage(chatDestino, {
        image: image.buffer,
        caption: image.caption,
        albumParentKey: album.key
      })
    }
  }
  const reaccionar = emoji => conn.sendMessage(chatActual, { react: { text: emoji, key: m.key } }).catch(() => {})
  const falta = tipo => m.reply(`Falta la plantilla de ${tipo}. Debe estar en:\n${rutaPlantilla(tipo)}`)

  try {
    switch (comando) {
      case 'iniciarcuadri': {
        if (state.activo) return m.reply(`⚠️ Ya hay un cuadrilátero activo. Usa *${c('fincuadri')}* y luego *${c('iniciarcuadri')}*.`)
        borrarLogosGrupo(group)
        const nueva = nuevaClave(group)
        save(group, { ...estadoVacio(), activo: true, clave: nueva })
        let enPrivado = false
        try {
          await conn.sendMessage(sender, { text: `🔐 *Clave del cuadrilátero:* ${nueva}\n\nEn el grupo de flyers, usa:\n${c('ganador')} ${nueva} primera sala Negro\n${c('matchdaycuadri')} ${nueva}\n${c('caidascuadri')} ${nueva}\n${c('reglas')} ${nueva}\n${c('vip')} ${nueva}\n${c('enviartodo')} ${nueva}\n${c('enviarinfo')} ${nueva}` })
          enPrivado = true
        } catch {}
        return m.reply(`🔥 *CUADRILÁTERO iniciado* (${MAX_EQUIPOS} equipos, gana quien llegue a ${SALAS_PARA_GANAR} salas)\n\nCualquier integrante del grupo puede registrar un equipo enviando su *logo* con este formato:\n${c('cuadri')} Nombre del equipo/Color\n\nColores: Negro (C1-C3), Blanco (C4-C6), Amarillo (C7-C9) o Rojo (C10-C12).\n\n` +
          (enPrivado ? `🔐 La clave te llegó por privado. Si no la ves, usa ${c('clave')}.` : `🔐 No pude escribirte por privado. Clave: *${nueva}*`))
      }

      case 'clave': {
        if (!state.clave) return m.reply(`No hay clave en este grupo. Abre uno con ${c('iniciarcuadri')}.`)
        try {
          await conn.sendMessage(sender, { text: `🔐 Clave del cuadrilátero: *${state.clave}*` })
          return m.reply('🔐 Te envié la clave por privado.')
        } catch { return m.reply(`🔐 No pude escribirte por privado. Clave: *${state.clave}*`) }
      }

      case 'cuadri': {
        if (!state.activo) return m.reply(`No hay un cuadrilátero activo. Un admin debe usar ${c('iniciarcuadri')}.`)
        if (salasJugadas(state)) return m.reply('El cuadrilátero ya empezó, ya no se pueden registrar equipos.')
        const registro = args.join(' ').trim() || captionDe(m)
        const separador = registro.lastIndexOf('/')
        const nombre = separador < 0 ? '' : registro.slice(0, separador).trim()
        const colorSolicitado = separador < 0 ? '' : norm(registro.slice(separador + 1))
        const color = colorPorId[colorSolicitado]
        const { found, buffer } = await getImage(m)
        if (!nombre || !color || !found) {
          return m.reply(`Formato incorrecto. Envía el *logo* (foto o archivo) con el texto:\n${c('cuadri')} Nombre del equipo/Color\n\nColores válidos: Negro, Blanco, Amarillo o Rojo.`)
        }
        if (!buffer) return m.reply('No pude descargar el logo. Envíalo de nuevo como foto o archivo PNG/JPG.')

        const id = teamKey(nombre)
        const existente = state.equipos[id]
        if (!existente && Object.keys(state.equipos).length >= MAX_EQUIPOS) return m.reply(`Ya se alcanzó el máximo de ${MAX_EQUIPOS} equipos.`)
        const equipoConColor = Object.entries(state.equipos).find(([equipoId, equipo], i) =>
          equipoId !== id && colorDeEquipo(equipo, i).id === color.id)
        if (equipoConColor) return m.reply(`El color *${color.nombre}* ya está asignado a *${equipoConColor[1].nombre}*. Cada equipo debe usar un color distinto.`)

        const logo = path.join(LOGO_DIR, `${keyOf(group)}_${id}.png`)
        try { await guardarLogo(buffer, logo) } catch { return m.reply('No pude leer ese archivo como imagen. Usa PNG, JPG o WebP.') }
        state.equipos[id] = { nombre, logo, color: color.id, owner: existente?.owner || sender }
        save(group, state)
        const total = Object.keys(state.equipos).length
        await m.reply(`✅ Equipo *${nombre}* ${existente ? 'actualizado' : 'registrado'} con color *${color.nombre}* (${total}/${MAX_EQUIPOS}). Casillas: *${color.casillas.join(', ')}*.${total === MAX_EQUIPOS ? `\n\nLos flyers no se envían automáticamente. Al terminar el cuadrilátero, usa ${c('enviartodo')} ${state.clave}.` : ''}`)
        return
      }

      case 'quitarequipo': {
        if (!state.activo) return m.reply('No hay un cuadrilátero activo.')
        if (salasJugadas(state)) return m.reply('El cuadrilátero ya empezó, no se pueden quitar equipos.')
        const nombre = args.join(' ').trim()
        if (!nombre) return m.reply(`Usa: ${c('quitarequipo')} Nombre del equipo`)
        const id = resolverEquipo(state, nombre)
        const eq = id && state.equipos[id]
        if (!eq) return m.reply(`No encontré el equipo *${nombre}*.`)
        try { fs.unlinkSync(eq.logo) } catch {}
        delete state.equipos[id]
        save(group, state)
        return m.reply(`🗑️ Equipo *${eq.nombre}* eliminado (${Object.keys(state.equipos).length}/${MAX_EQUIPOS}).`)
      }

      case 'equipos': {
        const lista = Object.values(state.equipos)
        if (!lista.length) return m.reply('Aún no hay equipos registrados.')
        return m.reply(`*Equipos (${lista.length}/${MAX_EQUIPOS})*\n` + lista.map((e, i) => `${i + 1}. ${e.nombre}`).join('\n'))
      }

      case 'participantes':
      case 'matchdaycuadri': {
        if (!Object.keys(state.equipos).length) return m.reply('Aún no hay equipos registrados.')
        if (!hayPlantilla('matchday')) return falta('matchday')
        return sendImage(await imgMatchDay(state), capParticipantes(state))
      }

      case 'caidascuadri': {
        if (!Object.keys(state.equipos).length) return m.reply('Aún no hay equipos registrados.')
        if (!hayPlantilla('caidas')) return falta('caidas')
        return sendImage(await imgCaidas(state), capCaidas(state))
      }

      case 'reglas': {
        if (!hayPlantilla('reglas')) return falta('reglas')
        return sendImage(fs.readFileSync(rutaPlantilla('reglas')), capReglas)
      }

      case 'vip': {
        return conn.sendMessage(chatDestino, { text: capVip })
      }

      case 'ganador': {
        if (!state.activo) {
          return m.reply(state.ganador
            ? `🏆 El cuadrilátero ya terminó. Ganó *${state.equipos[state.ganador]?.nombre}*. Si te equivocaste usa ${c('borrarsala')} ${state.clave}.`
            : 'No hay un cuadrilátero activo para esa clave.')
        }
        if (Object.keys(state.equipos).length < MAX_EQUIPOS) return m.reply(`Faltan equipos por registrar (${Object.keys(state.equipos).length}/${MAX_EQUIPOS}).`)

        const uso = `${c('ganador')} ${state.clave} primera sala <color>`
        const t = args.map(String)
        const p = norm(t[0])
        const n = ORD_TEXTO[p] || (/^[1-5]$/.test(p) ? Number(p) : null)
        if (!n) return m.reply(`No entendí la sala. Usa:\n${uso}\n\nEjemplos:\n${c('ganador')} ${state.clave} segunda sala Blanco\n${c('ganador')} ${state.clave} 1 Rojo`)
        const rest = t.slice(1)
        if (norm(rest[0]) === 'sala') rest.shift()
        const ref = rest.join(' ').trim()
        if (!ref) return m.reply(`Falta el color ganador. Usa Negro, Blanco, Amarillo o Rojo:\n${uso}`)

        const id = resolverEquipoPorColor(state, ref)
        if (!id) return m.reply(`No encontré un equipo con el color "${ref}". Usa Negro, Blanco, Amarillo o Rojo.`)

        const siguiente = salasJugadas(state) + 1
        if (n !== siguiente) {
          return m.reply(siguiente > MAX_SALAS ? 'Ya se jugaron todas las salas.'
            : `Ahora toca la *${nombreSala(siguiente).toLowerCase()}*. Si te equivocaste usa ${c('borrarsala')} ${state.clave}.`)
        }

        state.salas[n] = id
        const v = victorias(state)
        const nombre = state.equipos[id].nombre
        if (v[id] >= SALAS_PARA_GANAR) { state.ganador = id; state.activo = false }
        save(group, state)

        await reaccionar('👍')
        await m.reply(`🏁 *${nombreSala(n)}* → *${nombre}* (+1)\n\n${marcador(state)}`)
        if (state.ganador) {
          await m.reply(`🏆 *¡${nombre} gana el cuadrilátero!* (${v[id]} salas en ${salasJugadas(state)} jugadas)`)
          await m.reply(`Los flyers no se envían automáticamente. Usa *${c('enviartodo')} ${state.clave}* para enviarlos juntos.`)
        } else {
          await m.reply(`➡️ Sigue la *${nombreSala(n + 1).toLowerCase()}*: ${c('ganador')} ${state.clave} ${nombreSala(n + 1).split(' ')[0].toLowerCase()} sala <color>`)
        }
        return
      }

      case 'borrarsala': {
        const n = salasJugadas(state)
        if (!n) return m.reply('No hay salas registradas.')
        const id = state.salas[n]
        delete state.salas[n]
        state.ganador = null
        state.activo = true
        save(group, state)
        return m.reply(`🗑️ Se borró la *${nombreSala(n).toLowerCase()}* (ganaba ${state.equipos[id]?.nombre || 'un equipo'}).\n\n${marcador(state)}\n\n➡️ Vuelve a registrarla: ${c('ganador')} ${state.clave} ${nombreSala(n).split(' ')[0].toLowerCase()} sala <color>`)
      }

      case 'salas': {
        if (!salasJugadas(state)) return m.reply('Aún no hay salas registradas.')
        if (!hayPlantilla('salas')) return falta('salas')
        return sendImage(await imgSalas(state), capSalas(state))
      }

      case 'campeon': {
        if (!state.ganador) return m.reply(`Aún no hay campeón. Gana quien llegue a ${SALAS_PARA_GANAR} salas.\n\n${marcador(state)}`)
        if (!hayPlantilla('ganador')) return falta('ganador')
        return sendImage(await imgCampeon(state), capCampeon(state))
      }

      case 'enviartodo': {
        if (!Object.keys(state.equipos).length) return m.reply('Aún no hay equipos registrados.')
        if (!state.ganador) return m.reply(`El cuadrilátero aún no tiene campeón. Registra los resultados y luego usa ${c('enviartodo')} ${state.clave || '<clave>'}.`)
        const tareas = [
          ['Ganador', 'ganador', imgCampeon, capCampeon],
          ['Match Day', 'matchday', imgMatchDay, capParticipantes],
          ['Booyah (salas)', 'salas', imgSalas, capSalas]
        ]
        await reaccionar('⏳')
        const faltantes = tareas.filter(([, tipo]) => !hayPlantilla(tipo)).map(([nombre]) => nombre)
        if (faltantes.length) return m.reply(`Faltan plantillas y no puedo enviar el álbum completo: ${faltantes.join(', ')}.`)

        const imagenes = []
        for (const [nombre, , generar] of tareas) {
          try {
            imagenes.push({ buffer: await generar(state), caption: '' })
          } catch (e) {
            console.error(`[corp] enviartodo "${nombre}":`, e?.message)
            return m.reply(`⚠️ No pude generar el flyer de ${nombre}; no se envió el álbum.`)
          }
        }
        imagenes[0].caption = capPublicacionFinal(state)
        try {
          await sendAlbum(imagenes)
        } catch (e) {
          console.error('[corp] enviartodo: error enviando el álbum:', e?.message)
          await reaccionar('❌')
          return m.reply('⚠️ No pude enviar completo el álbum de flyers. Inténtalo de nuevo.')
        }
        await reaccionar('✅')
        return
      }

      case 'enviarinfo': {
        if (!Object.keys(state.equipos).length) return m.reply('Aún no hay equipos registrados.')
        const tareas = [
          ['Caídas', 'caidas', imgCaidas, capCaidas],
          ['Reglas', 'reglas', () => fs.readFileSync(rutaPlantilla('reglas')), () => capReglas],
          ['Match Day', 'matchday', imgMatchDay, capParticipantes]
        ]
        await reaccionar('⏳')
        const faltantes = tareas.filter(([, tipo]) => !hayPlantilla(tipo)).map(([nombre]) => nombre)
        if (faltantes.length) return m.reply(`Faltan plantillas y no puedo enviar el álbum completo: ${faltantes.join(', ')}.`)

        const imagenes = []
        for (const [nombre, , generar, caption] of tareas) {
          try {
            imagenes.push({ buffer: await generar(state), caption: caption(state) })
          } catch (e) {
            console.error(`[corp] enviarinfo "${nombre}":`, e?.message)
            return m.reply(`⚠️ No pude generar el flyer de ${nombre}; no se envió el álbum.`)
          }
        }
        try {
          await sendAlbum(imagenes)
        } catch (e) {
          console.error('[corp] enviarinfo: error enviando el álbum:', e?.message)
          await reaccionar('❌')
          return m.reply('⚠️ No pude enviar completo el álbum de flyers. Inténtalo de nuevo.')
        }
        await reaccionar('✅')
        return
      }

      case 'menucuadri': {
        return m.reply([
          '🔥 *MENÚ CORP CUADRILÁTEROS*',
          `4 equipos · gana quien llegue a ${SALAS_PARA_GANAR} salas`,
          '',
          '*Grupo de LOGOS*',
          `• ${c('iniciarcuadri')} — abre el cuadrilátero y genera la clave`,
          `• ${c('cuadri')} <nombre>/<color> + logo — registra un equipo (Negro, Blanco, Amarillo o Rojo)`,
          `• ${c('quitarequipo')} <nombre> — elimina un equipo`,
          `• ${c('equipos')} — lista de equipos`,
          `• ${c('clave')} — te reenvía la clave por privado`,
          `• ${c('fincuadri')} — termina el cuadrilátero`,
          '',
          '*Grupo de FLYERS* (con la clave)',
          `• ${c('ganador')} <clave> primera sala <color>`,
          `• ${c('booyah')} <clave> — flyer Booyah de salas`,
          `• ${c('winner')} <clave> — flyer del ganador`,
          `• ${c('matchdaycuadri')} <clave> — flyer Match Day`,
          `• ${c('caidascuadri')} <clave> — flyer de Caídas y rotaciones`,
          `• ${c('reglas')} <clave> — flyer de reglas`,
          `• ${c('vip')} <clave> — envía el mensaje VIP sin imagen`,
          `• ${c('borrarsala')} <clave> — borra la última sala`,
          `• ${c('enviartodo')} <clave> — ganador, Match Day y Booyah en un álbum al terminar`,
          `• ${c('enviarinfo')} <clave> — Caídas, Reglas y Match Day en un álbum`,
          'Los flyers se envían al grupo de EQUIPOS.',
          '',
          'También siguen funcionando los nombres largos terminados en "corp".'
        ].join('\n'))
      }

      case 'fincuadri': {
        if (!state.activo) return m.reply('No hay un cuadrilátero activo.')
        state.activo = false
        save(group, state)
        return m.reply(`Cuadrilátero finalizado. Abre uno nuevo con ${c('iniciarcuadri')}.`)
      }
    }
  } catch (error) {
    console.error('Error en corpcuadrilateros:', error)
    return m.reply('Ocurrió un error con el cuadrilátero. Inténtalo de nuevo en un momento.')
  }
}

// Un comando a la vez, para que no se pisen los archivos de estado
let cola = Promise.resolve()
const handler = (m, ctx) => (cola = cola.catch(() => {}).then(() => ejecutar(m, ctx)))

handler.help = [...BASES.map(cmd), ...Object.keys(ALIAS_CORTOS), ...Object.keys(COMANDOS_DIRECTOS)]
handler.tags = ['game']
handler.command = [...BASES.map(cmd), ...Object.keys(ALIAS_CORTOS), ...Object.keys(COMANDOS_DIRECTOS)]
handler.group = true

export default handler
