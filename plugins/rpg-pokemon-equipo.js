import {
  careLevel,
  currentPokemonHp,
  ensurePokemonGroup,
  getSpecies,
  maxPokemonHp,
  mutatePokemonState,
  refreshPokemonCare
} from '../lib/pokemon-rpg.js'

let handler = async (m, { conn }) => {
  if (!m.isGroup) return m.reply('El equipo Pokémon compartido solo está disponible en grupos.')

  const result = await mutatePokemonState(state => {
    const group = ensurePokemonGroup(state, m.chat)
    const escaped = refreshPokemonCare(group)
    return {
      pokemon: group.pokemon,
      escaped: escaped.map(entry => getSpecies(entry)?.name || entry.speciesId)
    }
  })

  const roster = result.pokemon.length
    ? result.pokemon.map((pokemon, index) => {
      const name = getSpecies(pokemon)?.name || pokemon.speciesId
      const hp = currentPokemonHp(pokemon)
      const maxHp = maxPokemonHp(pokemon)
      return `> *${index + 1}.* ${name} · Nv. ${pokemon.level}\n> ❤️ ${hp}/${maxHp}  ·  🍓 ${careLevel(pokemon)}%`
    }).join('\n')
    : '> _Aún no hay Pokémon. Usa .explorar para buscar._'
  const escapeNotice = result.escaped.length
    ? `\n\n😢 Escaparon: ${result.escaped.join(', ')}`
    : ''

  return conn.sendMessage(m.chat, {
    text: `🐾 *𝗣𝗢𝗞É𝗠𝗢𝗡 DEL GRUPO*  ·  ${result.pokemon.length}/4\n\n${roster}${escapeNotice}\n\n> .explorar  ·  .alimentar <n°> <comida>  ·  .liberar <n°>`,
    contextInfo: { ...(global.rcanal?.contextInfo || {}) }
  }, { quoted: m })
}

handler.help = ['pokemon → Muestra el equipo compartido del grupo']
handler.tags = ['rpg']
handler.command = ['pokemon', 'pokemones', 'equipo']

export default handler
