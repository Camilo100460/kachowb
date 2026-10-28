import fs from 'node:fs'
import {
  careLevel,
  ensurePokemonGroup,
  ensurePokemonPlayer,
  findOwnedPokemon,
  getSpecies,
  ITEMS,
  maxPokemonHp,
  mutatePokemonState,
  POKEMON_BY_ID,
  refreshPokemonCare,
  removeItem
} from '../lib/pokemon-rpg.js'

let handler = async (m, { conn, args }) => {
  if (!m.isGroup) return m.reply('Los Pokémon del equipo compartido solo pueden evolucionarse desde su grupo.')

  const now = Date.now()
  const result = await mutatePokemonState(state => {
    const player = ensurePokemonPlayer(state, m.sender)
    const group = ensurePokemonGroup(state, m.chat)
    const escaped = refreshPokemonCare(group, now)
    const pokemon = findOwnedPokemon(group, args[0])
    if (!pokemon) return { error: 'Indica el número o ID del Pokémon: .evolucionar <número/ID>.', escaped }

    const species = getSpecies(pokemon)
    const evolution = species && POKEMON_BY_ID.get(species.evolvesTo)
    const requirements = species?.evolution
    if (!evolution || !requirements) {
      return { error: `${species?.name || 'Este Pokémon'} no puede evolucionar con las cartas disponibles.`, escaped }
    }
    if (pokemon.level < (requirements.level || 1)) {
      return { error: `Necesita nivel ${requirements.level} para evolucionar; actualmente está en nivel ${pokemon.level}.`, escaped }
    }
    if (requirements.care && careLevel(pokemon, now) < requirements.care) {
      return { error: `Necesita ${requirements.care}% de cuidado para evolucionar; dale comida primero.`, escaped }
    }
    if (requirements.wins && (Number(pokemon.battlesWon) || 0) < requirements.wins) {
      return { error: `Necesita ganar ${requirements.wins} batallas; lleva ${pokemon.battlesWon || 0}.`, escaped }
    }
    if (requirements.item && !removeItem(player, requirements.item)) {
      return { error: `Necesitas ${ITEMS[requirements.item]?.name || requirements.item}. Cómprala en .poketienda.`, escaped }
    }

    pokemon.speciesId = evolution.id
    const hp = maxPokemonHp(pokemon, now)
    return { from: species.name, to: evolution.name, imagePath: evolution.imagePath, hp, escaped }
  })

  const escapedMessage = result.escaped?.length
    ? `\n😢 Escaparon por falta de cuidados: ${result.escaped.map(pokemon => getSpecies(pokemon)?.name || pokemon.speciesId).join(', ')}.`
    : ''
  if (result.error) return m.reply(`${result.error}${escapedMessage}`)
  return conn.sendMessage(m.chat, {
    image: fs.readFileSync(result.imagePath),
    caption: `✨ ¡*${result.from}* evolucionó a *${result.to}*!\nSu equipo lo ayudó a crecer.${escapedMessage}`,
    contextInfo: { ...(global.rcanal?.contextInfo || {}), mentionedJid: [m.sender] }
  }, { quoted: m })
}

handler.help = ['evolucionar <número/ID>']
handler.tags = ['rpg']
handler.command = ['evolucionar', 'evolucionarpokemon']

export default handler
