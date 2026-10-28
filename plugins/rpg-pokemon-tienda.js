import {
  addItem,
  ensurePokemonPlayer,
  ITEMS,
  mutatePokemonState
} from '../lib/pokemon-rpg.js'

const purchasableItems = Object.entries(ITEMS).filter(([, item]) =>
  ['food', 'evolution'].includes(item.kind)
)

function renderShop() {
  return purchasableItems
    .map(([id, item]) => `• ${item.name} (\`${id}\`) — ${item.price} ${global.moneda}`)
    .join('\n')
}

let handler = async (m, { conn, args }) => {
  const action = String(args[0] || '').toLowerCase()
  if (action !== 'comprar' && action !== 'buy') {
    return conn.sendMessage(m.chat, {
      text: `🛒 *Tienda Pokémon*\n${renderShop()}\n\nCompra con .poketienda comprar <objeto> <cantidad>. El costo se descuenta de tus ${global.moneda} RPG.`,
      contextInfo: { ...(global.rcanal?.contextInfo || {}) }
    }, { quoted: m })
  }

  const itemId = String(args[1] || '').toLowerCase()
  const item = ITEMS[itemId]
  const quantity = args[2] === undefined ? 1 : Number(args[2])
  if (!item || !['food', 'evolution'].includes(item.kind)) {
    return m.reply(`Ese objeto no se vende en la tienda. Consulta .poketienda.`)
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return m.reply('La cantidad debe ser un número entero entre 1 y 99.')
  }

  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  const coins = Number(user.coins) || 0
  const total = item.price * quantity
  if (coins < total) return m.reply(`Necesitas ${total} ${global.moneda}; tienes ${coins}.`)

  await mutatePokemonState(state => {
    addItem(ensurePokemonPlayer(state, m.sender), itemId, quantity)
  })
  user.coins = coins - total
  return conn.sendMessage(m.chat, {
    text: `✅ Compraste ${quantity} × *${item.name}* por ${total} ${global.moneda}. Te quedan ${user.coins} ${global.moneda}.`,
    contextInfo: { ...(global.rcanal?.contextInfo || {}), mentionedJid: [m.sender] }
  }, { quoted: m })
}

handler.help = ['poketienda [comprar <objeto> <cantidad>]']
handler.tags = ['rpg']
handler.command = ['poketienda', 'tiendapokemon']

export default handler
