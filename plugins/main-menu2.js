// ==========================================
// CONFIGURACIÓN DE MENÚS Y CONSTANTES
// ==========================================

const BORDER_TOP = '╭━';
const BORDER_BOTTOM = '╰━━━━━━━━━━━━━⬣';

const MENU_CATEGORIES = [
  '┃ ⚡ .menuantisistema',
  '┃ ⚡ .menuotros',
  '┃ ⚡ .menuiaimagenes',
  '┃ ⚡ .menubusqueda',
  '┃ ⚡ .menuadvertencias'
].join('\n');

const GENERAL_MENU_ITEMS = [
  '🏠 .menu / .comandos',
  '🐬 .menubienvenidas',
  '👑 .owner',
  'ℹ️ .info',
  '⚡ .ping',
  '🆔 .id',
  '🌐 .ge',
  '🌍 .webinfo'
];

export const MENU_BLOCKS = [
  ['🏁 𝙋𝙄𝙎𝙏𝘼 𝙁𝙍𝙀𝙀 𝙁𝙄𝙍𝙀', [
    '◦ 🕹️ .freefire', '◦ 🏆 .12vs12', '◦ 🏆 .16vs16', '◦ ⚔️ .clk', '◦ ⚔️ .clk6vs6',
    '◦ ⚔️ .vv2', '◦ ⚔️ .vv2-6', '◦ ♾️ .infinito', '◦ ♾️ .infinito6vs6',
    '◦ 🏟️ .scrim', '◦ 🏟️ .cuadrilatero', '◦ 🛡️ .interna', '◦ 🔥 .interna6vs6',
    '◦ 💬 .discord', '◦ 📸 .insta'
  ]],
  ['🛡️ 𝘼𝙉𝙏𝙄𝙎', [
    '◦ 🛡️ .antiaudio', '◦ 🛡️ .anticaracter', '◦ 🛡️ .anticontact', '◦ 🛡️ .antidocument',
    '◦ 🛡️ .antiimg', '◦ 🛡️ .antilink', '◦ 🛡️ .antimention', '◦ 🛡️ .antipalabra',
    '◦ 🛡️ .antiprefijo', '◦ 🛡️ .antispam', '◦ 🛡️ .antisticker', '◦ 🛡️ .antivideo'
  ]],
  ['🚩 𝘼𝘿𝙑𝙀𝙍𝙏𝙀𝙉𝘾𝙄𝘼𝙎', [
    '◦ ⚠️ .warn', '◦ ⚠️ .warnings', '◦ 🗑️ .delwarn', '◦ 👻 .fantasmas'
  ]],
  ['⛽ 𝘿𝙀𝙎𝘾𝘼𝙍𝙂𝘼𝙎', [
    '◦ 📱 .aptoide', '◦ 🎬 .facebook', '◦ 📦 .git', '◦ 📸 .instagram', '◦ 🔎 .igsearch',
    '◦ 🖼️ .imagen', '◦ 📌 .pinterest', '◦ 🎵 .play / .music (máx. 10 min)', '◦ 🎵 .play2', '◦ 🎵 .sc',
    '◦ 🎵 .spotify (YouTube)', '◦ 🎬 .download', '◦ 🎞️ .tiktok2', '◦ 🎞️ .tiktok'
  ]],
  ['📡 𝘽𝙐́𝙎𝙌𝙐𝙀𝘿𝘼', [
    '◦ 🔎 .yt', '◦ 🔎 .google', '◦ 🎵 .scsearch', '◦ 📝 .ly', '◦ 🏷️ .search-sticker', '◦ 🖼️ .wall'
  ]],
  ['📻 𝘼𝙐𝘿𝙄𝙊', [
    '◦ 🐌 .slow', '◦ ⚡ .speed', '◦ 🎙️ .stt', '◦ 🔊 .tts'
  ]],
  ['🏆 𝙍𝙀𝘼𝘾𝘾𝙄𝙊𝙉𝙀𝙎', [
    '◦ 🤗 .hug', '◦ 💋 .kiss', '◦ 💃 .dance', '◦ 😡 .angry', '◦ 😄 .alegre',
    '◦ 😂 .reir', '◦ 😢 .triste', '◦ 👋 .bang'
  ]],
  ['🎨 𝙎𝙏𝙄𝘾𝙆𝙀𝙍𝙎', [
    '◦ 🏷️ .delstickermeta', '◦ ✏️ .delmeta', '◦ ⚙️ .setstickermeta', '◦ 🏳️‍🌈 .sgay',
    '◦ 🖼️ .sp', '◦ 🏷️ .sss / .ver', '◦ 🏷️ .prueba / .s / .sticker / .stickers', '◦ ✨ .sw', '◦ 📝 .st',
    '◦ 🟩 .tutu <texto>', '◦ 🖼️ .toimg'
  ]],
  ['🏎️ 𝙅𝙐𝙀𝙂𝙊𝙎', [
    '◦ 🎲 .adivinanza', '◦ ⚽ .futbol', '◦ 🏦 .banco', '◦ 💣 .bomba', '◦ 🎲 .dado', '◦ 📅 .daily',
    '◦ 🐱 .michi', '◦ ⛏️ .miner', '◦ 🪙 .moneda', '◦ 🎣 .pescar', '◦ 🕵️ .robar',
    '◦ 🎰 .ruleta', '◦ 🎰 .slot', '◦ 🎁 .sorpresa', '◦ 🍀 .suerte', '◦ 💸 .transf', '◦ 💼 .work',
    '◦ 🐾 .pokemon / .equipo', '◦ 🌿 .explorar', '◦ 🛒 .poketienda / .pokebolsa',
    '◦ 🍓 .alimentar <número> <comida>', '◦ ✨ .evolucionar <número>', '◦ 🌱 .liberar <número>',
    '◦ 💰 .venderpoke <objeto>', '◦ ⚔️ .pokebatalla retar <ID-grupo> / aceptar <código>',
    '◦ 🕵️ .doxeo', '◦ 🧠 .iqtest', '◦ 💖 .love'
  ]],
  ['🤖 𝙄𝘼', [
    '◦ 🎨 .animg', '◦ 🤖 .bot', '◦ 🤖 .gpt', '◦ 🤖 .copilot', '◦ 🤖 .kora', '◦ 🔤 .text', '◦ 💬 .replia',
    '◦ ✨ .hd', '◦ 🏳️‍🌈 .imgay', '◦ 😂 .meme', '◦ 📄 .pdf', '◦ 📐 .resize', '◦ 🖼️ .sfimg',
    '◦ 🖼️ .ssimg', '◦ 🐱 .cat', '◦ 🌸 .waifu', '◦ 🌸 .waifu2', '◦ 🌸 .corean', '◦ 👧 .girls',
    '◦ 🔞 .waifu18', '◦ 🔞 .tetas', '◦ 🔞 .tik18', '◦ 🏳️‍🌈 .gay', '◦ 🔮 .horoscopo <fecha>'
  ]],
  ['🛠️ 𝙂𝙍𝙐𝙋𝙊𝙎', [
    '◦ ➕ .adg', '◦ 🧹 .clear', '◦ 🔒 .close', '◦ 🗑️ .delete', '◦ 📝 .delnota',
    '◦ ⬇️ .demote', '◦ 🚫 .ban', '◦ 🧹 .kicktodos', '◦ 🔇 .silenciar', '◦ 🔊 .desilenciar', '◦ 📝 .nota',
    '◦ 🔓 .open', '◦ 📌 .fijar', '◦ ⬆️ .promote', '◦ 📄 .desgp', '◦ 📸 .photogp',
    '◦ ✏️ .namegp', '◦ 📝 .vernotas', '◦ 📋 .reglas', '◦ ⚙️ .grupo', '◦ 👋 .bienvenida', '◦ 👋 .despedida',
    '◦ 📸 .imagenbienvenida', '◦ 📸 .imagendespedida', '◦ 📋 .menubienvenidas', '◦ 🔗 .link', '◦ 🔗 .linkslist',
    '◦ 📣 .hidetag', '◦ 📣 .notify', '◦ 👥 .tagall'
  ]],
  ['🏆 𝘾𝙊𝙈𝙐𝙉𝙄𝘿𝘼𝘿', [
    '◦ 💰 .balance', '◦ 🎂 .allbirthdays', '◦ 🎂 .birthdays', '◦ 🗑️ .delbirth', '◦ 🗑️ .delgenre',
    '◦ 👤 .profile', '◦ 🎂 .setbirth', '◦ 📝 .setdesc', '◦ ⭐ .setfav', '◦ ⚧️ .setgenre', '◦ ✏️ .setname',
    '◦ 🏆 .topburros', '◦ 💰 .topcoins', '◦ 🏆 .top', '◦ 🏳️‍🌈 .topfemboys', '◦ 🤢 .topfeos',
    '◦ 🎂 .cumpleaños @persona', '◦ 💞 .topfieles', '◦ 💀 .topfracasados', '◦ 🏳️‍🌈 .topgays', '◦ 💔 .topinfieles', '◦ 🧑‍💻 .topingenieros',
    '◦ 🌸 .toplindos', '◦ 😎 .topmachos', '◦ 🦾 .topmancos', '◦ 🎓 .topotakus', '◦ 😏 .toppajeros',
    '◦ 💕 .topparejas', '◦ ⚧️ .toptransexuales', '◦ 🌐 .traduc'
  ]],
  ['🔞 𝙉𝙎𝙁𝙒', [
    '◦ 🔞 .hentai', '◦ 🔞 .xnxxsearch', '◦ 🔞 .xvideos', '◦ 🔞 .onlyfans'
  ]],
  ['🚦 𝘼𝘿𝙈𝙄𝙉', [
    '◦ 👑 .admin on/off', '◦ 👑 .owner / .dueño / .dueña', '◦ 📂 .plugin', '◦ 📢 .difusiongrupos', '◦ 🚪 .exit', '◦ 🔗 .join',
    '◦ 📁 .nameplugins', '◦ 🔄 .reconnectbots', '◦ 🔧 .replugin', '◦ 🔁 .restart', '◦ 👁️ .setvist',
    '◦ 🤖 .subme', '◦ 🔄 .update', '◦ 👁️ .verplugin', '◦ 🤖 .listjadibot', '◦ ℹ️ .info', '◦ 🔢 .maxsubs'
  ]],
  ['🔧 𝙊𝙏𝙍𝙊𝙎', [
    '◦ 📢 .actualizacion', '◦ 🔁 .cmd18', '◦ 🆔 .canalid', '◦ 🆔 .id', '◦ ℹ️ .infogrupo', '◦ 🌐 .ip', '◦ 🌐 .ip2',
    '◦ 🕵️ .sher', '◦ 🎵 .tik', '◦ 🌐 .webinfo', '◦ 📷 .ge', '◦ 📷 .leerqr', '◦ ⏱️ .temp'
  ]]
];

// ==========================================
// FUNCIONES AUXILIARES DE RENDERIZADO
// ==========================================

const renderMenuBlock = (title, commands) => {
  const lines = commands
    .map(command => `┃ ${String(command).replace(/^◦\s*/, '')}`)
    .join('\n');
  return `${BORDER_TOP}〔 ${title} 〕━━⬣\n${lines}\n${BORDER_BOTTOM}`;
};

// ==========================================
// MANEJADOR PRINCIPAL (HANDLER)
// ==========================================

let handler = async (m, { conn, args }) => {
  // Manejo del submenú de categorías
  if (String(args?.[0] || '').toLowerCase() === 'categorias') {
    return conn.sendMessage(m.chat, {
      text: `╭━〔 🏁 *MENÚS ESPECIALIZADOS* 🏁 〕━━━⬣\n${MENU_CATEGORIES}\n╰━━━━━━━━━━━━━⬣`
    }, { quoted: m });
  }

  // Generación de bloques dinámicos
  const generalBlock = renderMenuBlock('🏎️ 𝙂𝙀𝙉𝙀𝙍𝘼𝙇', GENERAL_MENU_ITEMS);
  const blocks = MENU_BLOCKS
    .map(([title, commands]) => renderMenuBlock(title, commands))
    .join('\n\n');

  // Cabecera y Pie de página con temática de carreras
  const header = 
`
 🏁 *KACHOW MENU* 🏎️💨

👤 *Piloto:* @${m.sender.split('@')[0]}
🏆 *Copa:* Piston Cup #95
🤖 *Pregunta:* .bot <pregunta>
📂 *Más menús:* .categorias`;

  const footer = 
`┏━━━━━━━━━━━━━━━┓
┃ 🏁 *RADIADOR SPRINGS* 🏁
┃
┃        ⚡ *KA-CHOW!* ⚡
┃
┃ « Velocidad. Yo soy velocidad. »
┗━━━━━━━━━━━━━━━┛`;

  const menu = `${header}\n\n${generalBlock}\n\n${blocks}\n\n${footer}`;

  // Selección aleatoria de imagen y envío
  const menuImages = ['./menu1.jpg', './menu2.jpg', './menu3.jpg'];
  const image = menuImages[Math.floor(Math.random() * menuImages.length)];

  await conn.sendMessage(m.chat, {
    image: { url: image },
    caption: menu,
    mentions: [m.sender]
  }, { quoted: m });
};

handler.command = ['menu', 'comandos', 'tools'];

export default handler;