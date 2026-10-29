/* By Sunkovv
*/



import { watchFile, unwatchFile } from 'fs' 
import chalk from 'chalk'
import { fileURLToPath } from 'url'


// CAMBIA POR EL NUMERO QUE VA SER OWNER DEL BOT
global.owner = [
  ['573107668900', 'Dueño', true],
  ['26666668999', 'Owner', true],
  ['573146680977', 'Owner', true],
]
global.scrimUsers = [
  '573146680977',
  '573009876543',
  '19152160389',
  '573011277561',
]

global.scrimUsers2 = [
  '573146680977',
  '573009876543',
  '19152160389',
  '573011277561',
]

// Usuarios autorizados para los comandos de resultados/administración del cuadrilátero.
// El registro de equipo con logo (.cuadricorp) está disponible para cualquier integrante del grupo.
global.cuadriUsers = [
  '573146680977',
  '573009876543',
  '19152160389',
  '573011277561',
]
//  ACA PON EL LID DEL OWNER DEL BOT PARA QUE TE HAGA CASO COMO OWNER EL BOT, USA EL COMANDO /ID EN TU 
//PRIVADO PARA SACAR TU LID
global.ownerLid = []

global.sessions = 'Sessions'
global.bot = 'Serbot' 
global.AFBots = true

global.packname = '𝗣𝗔𝗜𝗡 𝗕𝗢𝗧'
global.namebot = '𝗣𝗔𝗜𝗡 𝗕𝗢𝗧'
global.author = 'Camilo'
global.moneda = 'USD'


// Etiqueta de canal en mensajes (rcanal). Obtén el JID con: .canalid <link del canal>
// Ejemplo: global.canal = { jid: '120363423390538090@newsletter', name: 'Pain Community' }
// También acepta link: global.canal = 'https://whatsapp.com/channel/XXXXXXXX'
global.canal = { jid: 'https://whatsapp.com/channel/0029VbDoqAbL7UVTIPkXw42x', name: 'MayBot' }

// Enlace del grupo de soporte que muestran los comandos .info y .owner.
global.supportGroup = 'https://chat.whatsapp.com/BOHAe6LJpEH9sSzIo3jcMB'

// Canales que el bot y sub-bots siguen al conectar.
// Puedes usar el JID (recomendado) o el link del canal:
// ch1: '120363405059433072@newsletter'
global.ch = {
ch1: '1203634433072@newsletter',
}

// Canal para logs/anuncios de sub-bots. El bot y sub-bots también lo siguen al conectar.
global.logssubbots = '1203634309652@newsletter'

// true = botones/listas con @itsliaaa/baileys | false = solo @whiskeysockets/baileys
global.baileysInteractive = true

global.mods =   []
global.prems = []

global.multiplier = 69 
global.maxwarn = '2'

// APIS QUE USA EL BOT EN GLOBAL(NO BORRES)
global.APIs = {
vreden: { url: "https://api.vreden.web.id", key: null },
delirius: { url: "https://api.delirius.online", key: null },
zenzxz: { url: "https://api.zenzxz.my.id", key: null },
siputzx: { url: "https://api.siputzx.my.id", key: null },
hunt: { url: "https://api.huntapi.com", key: null, webhookUrl: null }
}

import { syncRcanalFromConfig } from './lib/newsletter-rcanal.js'
syncRcanalFromConfig()

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  import(`${file}?update=${Date.now()}`)
})
