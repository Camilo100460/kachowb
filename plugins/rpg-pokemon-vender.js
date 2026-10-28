import {
  ensurePokemonPlayer,
  ITEMS,
  mutatePokemonState,
  removeItem
} from '../lib/pokemon-rpg.js'

let handler = async (m, { conn, args }) => {
  const itemId = String(args[0] || '').toLowerCase()
  const item = ITEMS[itemId]
  const quantity = args[1] === undefined ? 1 : Number(args[1])
  if (!item?.sellPrice) return m.reply('Ese objeto no se puede vender. Revisa los objetos de tu .pokebolsa.')
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
    return m.reply('La cantidad debe ser un número entero entre 1 y 99.')
  }

  const result = await mutatePokemonState(state => {
    const player = ensurePokemonPlayer(state, m.sender)
    if (!removeItem(player, itemId, quantity)) {
      return { error: `No tienes ${quantity} × ${item.name} en tu mochila.` }
    }
    return { total: item.sellPrice * quantity }
  })
  if (result.error) return m.reply(result.error)

  const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
  user.coins = (Number(user.coins) || 0) + result.total
  return conn.sendMessage(m.chat, {
    text: `💰 Vendiste ${quantity} × *${item.name}* y recibiste ${result.total} ${global.moneda}. Saldo: ${user.coins} ${global.moneda}.`,
    contextInfo: { ...(global.rcanal?.contextInfo || {}), mentionedJid: [m.sender] }
  }, { quoted: m })
}

handler.help = ['venderpoke <objeto> [cantidad] → Vende objetos raros por dinero RPG']
handler.tags = ['rpg']
handler.command = ['venderpoke']

export default handler
