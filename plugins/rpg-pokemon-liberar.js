import {
  ensurePokemonGroup,
  findOwnedPokemon,
  getSpecies,
  mutatePokemonState,
  refreshPokemonCare
} from '../lib/pokemon-rpg.js'

let handler = async (m, { conn, args }) => {
  if (!m.isGroup) return m.reply('Los Pokémon del equipo compartido solo pueden liberarse desde su grupo.')

  const result = await mutatePokemonState(state => {
    const group = ensurePokemonGroup(state, m.chat)
    const escaped = refreshPokemonCare(group)
    const pokemon = findOwnedPokemon(group, args[0])
    if (!pokemon) return { error: 'Indica el número o ID del Pokémon que quieres liberar: .liberar <número/ID>.', escaped }
    group.pokemon = group.pokemon.filter(entry => entry.uid !== pokemon.uid)
    return {
      name: getSpecies(pokemon)?.name || pokemon.speciesId,
      escaped
    }
  })

  const escapedMessage = result.escaped?.length
    ? `\nAdemás, escaparon por falta de cuidados: ${result.escaped.map(pokemon => getSpecies(pokemon)?.name || pokemon.speciesId).join(', ')}.`
    : ''
  if (result.error) return m.reply(`${result.error}${escapedMessage}`)
  return conn.sendMessage(m.chat, {
    text: `🌿 El grupo liberó a *${result.name}*. Ya no forma parte del equipo.${escapedMessage}`,
    contextInfo: { ...(global.rcanal?.contextInfo || {}), mentionedJid: [m.sender] }
  }, { quoted: m })
}

handler.help = ['liberar <número/ID> → Libera un Pokémon del equipo compartido']
handler.tags = ['rpg']
handler.command = ['liberar', 'liberarpokemon']

export default handler
