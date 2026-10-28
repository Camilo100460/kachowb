import {
  ensurePokemonPlayer,
  formatInventory,
  mutatePokemonState
} from '../lib/pokemon-rpg.js'

let handler = async (m, { conn }) => {
  const inventory = await mutatePokemonState(state => ({
    ...ensurePokemonPlayer(state, m.sender).inventory
  }))
  return conn.sendMessage(m.chat, {
    text: `🎒 *Tu mochila Pokémon*\n${formatInventory(inventory)}\n\nUsa .poketienda comprar <objeto> <cantidad> para comprar o .venderpoke <objeto> <cantidad> para vender.`,
    contextInfo: { ...(global.rcanal?.contextInfo || {}), mentionedJid: [m.sender] }
  }, { quoted: m })
}

handler.help = ['pokebolsa → Muestra tu comida y objetos Pokémon']
handler.tags = ['rpg']
handler.command = ['pokebolsa', 'bolsapokemon']

export default handler
