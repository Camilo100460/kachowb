import fs from 'node:fs'
import {
  addItem,
  chooseWeightedPokemon,
  ensurePokemonGroup,
  ensurePokemonPlayer,
  getSpecies,
  ITEMS,
  mutatePokemonState,
  newPokemon,
  refreshPokemonCare
} from '../lib/pokemon-rpg.js'

const EXPLORE_COOLDOWN_MS = 20 * 60 * 1000
const RARE_FINDS = ['nugget', 'stardust', 'pearl', 'rare_candy', 'relic_gold']

function formatWait(ms) {
  const minutes = Math.ceil(ms / 60_000)
  return `${minutes} minuto${minutes === 1 ? '' : 's'}`
}

let runExplore = async (m, { conn }) => {
  if (!m.isGroup) return m.reply('La exploración Pokémon solo está disponible en grupos.')

  const now = Date.now()
  const roll = Math.floor(Math.random() * 100)
  const result = await mutatePokemonState(state => {
    const player = ensurePokemonPlayer(state, m.sender)
    const group = ensurePokemonGroup(state, m.chat)
    const escaped = refreshPokemonCare(group, now)
    const remaining = EXPLORE_COOLDOWN_MS - (now - player.lastExplore)
    if (remaining > 0) return { error: `Podrás explorar de nuevo en ${formatWait(remaining)}.`, escaped }

    player.lastExplore = now
    if (roll < 40) {
      const species = chooseWeightedPokemon()
      if (!species) return { error: 'No hay cartas Pokémon básicas disponibles; revisa el catálogo y las imágenes.', escaped }
      if (group.pokemon.length >= 4) return { kind: 'full', species, escaped }
      const pokemon = newPokemon(species, now)
      pokemon.capturedBy = m.sender
      group.pokemon.push(pokemon)
      return { kind: 'pokemon', species, escaped }
    }

    if (roll < 95) return { kind: 'trash', escaped }

    const itemId = RARE_FINDS[Math.floor(Math.random() * RARE_FINDS.length)]
    addItem(player, itemId)
    return { kind: 'item', itemId, escaped }
  })

  const escapedMessage = result.escaped?.length
    ? `\n😢 ${result.escaped.map(pokemon => getSpecies(pokemon)?.name || pokemon.speciesId).join(', ')} escapó por falta de cuidados.`
    : ''
  if (result.error) return m.reply(`${result.error}${escapedMessage}`)

  if (result.kind === 'pokemon' || result.kind === 'full') {
    const caption = result.kind === 'pokemon'
      ? `🎉 ¡El grupo encontró a *${result.species.name}*!\nSe unió al equipo compartido. Todos pueden cuidarlo y usarlo en batallas.\n\nUsa .pokemon para ver el equipo.${escapedMessage}`
      : `🐾 ¡Apareció *${result.species.name}*, pero el equipo del grupo ya tiene 4 Pokémon y no pudo ser atrapado.${escapedMessage}`
    return conn.sendMessage(m.chat, {
      image: fs.readFileSync(result.species.imagePath),
      caption,
      contextInfo: {
        ...(global.rcanal?.contextInfo || {}),
        mentionedJid: [m.sender]
      }
    }, { quoted: m })
  }

  if (result.kind === 'item') {
    const item = ITEMS[result.itemId]
    return m.reply(`✨ Encontraste *${item.name}*. Quedó en tu mochila personal; véndelo con .venderpoke ${result.itemId}.${escapedMessage}`)
  }

  return m.reply(`🗑️ Solo encontraste basura esta vez. La búsqueda tiene 40% de Pokémon básicos, 55% de basura y 5% de objetos raros.${escapedMessage}`)
}

let handler = async (m, context) => {
  try {
    return await runExplore(m, context)
  } catch (error) {
    console.error('[pokemon-rpg] Error ejecutando .explorar:', error)
    return m.reply('❌ No se pudo completar la exploración Pokémon. Inténtalo de nuevo y, si continúa, avisa al administrador.')
  }
}

handler.help = ['explorar → Busca Pokémon básicos u objetos en grupo (cada 20 min)']
handler.tags = ['rpg']
handler.command = ['explorar', 'explorarpokemon']

export default handler
