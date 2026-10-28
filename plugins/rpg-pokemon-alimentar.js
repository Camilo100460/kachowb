import {
  careLevel,
  currentPokemonHp,
  ensurePokemonGroup,
  ensurePokemonPlayer,
  findItemId,
  findOwnedPokemon,
  getSpecies,
  ITEMS,
  maxPokemonHp,
  mutatePokemonState,
  refreshPokemonCare,
  removeItem
} from '../lib/pokemon-rpg.js'

let handler = async (m, { conn, args }) => {
  if (!m.isGroup) return m.reply('Los Pokémon compartidos solo pueden cuidarse desde su grupo.')

  const now = Date.now()
  const result = await mutatePokemonState(state => {
    const player = ensurePokemonPlayer(state, m.sender)
    const group = ensurePokemonGroup(state, m.chat)
    const escaped = refreshPokemonCare(group, now)
    const pokemon = findOwnedPokemon(group, args[0])
    if (!pokemon) return { error: 'Indica el número o ID de un Pokémon del grupo: .alimentar <número/ID> <comida>.', escaped }

    const itemId = findItemId(args[1])
    const item = itemId && ITEMS[itemId]
    if (!item || item.kind !== 'food') {
      return { error: 'Comida no válida. Usa oran_berry, pokemon_food o poke_puff; revisa .poketienda.', escaped }
    }
    if (!removeItem(player, itemId)) return { error: `No tienes ${item.name} en tu mochila. Cómprala con .poketienda comprar ${itemId}.`, escaped }

    const hpBefore = currentPokemonHp(pokemon, now)
    pokemon.care = Math.min(100, careLevel(pokemon, now) + item.care)
    pokemon.lastFed = now
    const hpMax = maxPokemonHp(pokemon, now)
    const hpAfter = Math.min(hpMax, hpBefore + item.heal)
    pokemon.hp = Math.round((hpAfter / hpMax) * 100)
    return { name: getSpecies(pokemon)?.name || pokemon.speciesId, item: item.name, care: pokemon.care, hpAfter, hpMax, escaped }
  })

  const escapedMessage = result.escaped?.length
    ? `\n😢 Escaparon por falta de cuidados: ${result.escaped.map(pokemon => getSpecies(pokemon)?.name || pokemon.speciesId).join(', ')}.`
    : ''
  if (result.error) return m.reply(`${result.error}${escapedMessage}`)
  return conn.sendMessage(m.chat, {
    text: `💖 Cuidaste a *${result.name}* con *${result.item}*.\nCuidado: ${result.care}% · Vida: ${result.hpAfter}/${result.hpMax}${escapedMessage}`,
    contextInfo: { ...(global.rcanal?.contextInfo || {}), mentionedJid: [m.sender] }
  }, { quoted: m })
}

handler.help = ['alimentar <número/ID> <comida>']
handler.tags = ['rpg']
handler.command = ['alimentar']

export default handler
