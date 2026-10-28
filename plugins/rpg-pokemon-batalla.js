import { randomUUID } from 'node:crypto'
import {
  currentPokemonHp,
  ensurePokemonGroup,
  getSpecies,
  maxPokemonHp,
  mutatePokemonState,
  refreshPokemonCare
} from '../lib/pokemon-rpg.js'

const CHALLENGE_TTL = 10 * 60 * 1000

function alivePokemon(group, now) {
  return group.pokemon.filter(pokemon => currentPokemonHp(pokemon, now) > 0)
}

function simulateBattle(groupA, groupB, now) {
  const fightersA = groupA.pokemon.filter(pokemon => currentPokemonHp(pokemon, now) > 0).map(pokemon => ({
    pokemon,
    hp: currentPokemonHp(pokemon, now),
    maxHp: maxPokemonHp(pokemon, now)
  }))
  const fightersB = groupB.pokemon.filter(pokemon => currentPokemonHp(pokemon, now) > 0).map(pokemon => ({
    pokemon,
    hp: currentPokemonHp(pokemon, now),
    maxHp: maxPokemonHp(pokemon, now)
  }))
  let activeA = 0
  let activeB = 0
  let turn = 0

  while (activeA < fightersA.length && activeB < fightersB.length && turn < 200) {
    const attackerA = fightersA[activeA]
    const defenderB = fightersB[activeB]
    const damageA = Math.max(3, 5 + attackerA.pokemon.level * 2 + Math.floor(Math.random() * 8))
    defenderB.hp = Math.max(0, defenderB.hp - damageA)
    if (defenderB.hp === 0) activeB++

    if (activeB < fightersB.length) {
      const attackerB = fightersB[activeB]
      const defenderA = fightersA[activeA]
      const damageB = Math.max(3, 5 + attackerB.pokemon.level * 2 + Math.floor(Math.random() * 8))
      defenderA.hp = Math.max(0, defenderA.hp - damageB)
      if (defenderA.hp === 0) activeA++
    }
    turn++
  }

  const winner = activeA >= fightersA.length ? groupB : groupA
  const winningFighters = winner === groupA ? fightersA : fightersB
  for (const fighter of [...fightersA, ...fightersB]) {
    fighter.pokemon.hp = Math.round((fighter.hp / fighter.maxHp) * 100)
  }
  for (const { pokemon } of winningFighters) {
    pokemon.level = Math.min(100, pokemon.level + 1)
    pokemon.battlesWon = (Number(pokemon.battlesWon) || 0) + 1
  }
  return { winner, winningFighters, fightersA, fightersB }
}

function resultText(groupA, result, now) {
  const winners = result.winner === groupA ? 'el grupo retador' : 'el grupo defensor'
  const winnersIds = new Set(result.winningFighters.map(({ pokemon }) => pokemon.uid))
  const line = fighters => fighters
    .map(({ pokemon, hp }) => `${getSpecies(pokemon)?.name || pokemon.speciesId}: ${hp}/${maxPokemonHp(pokemon, now)} HP${winnersIds.has(pokemon.uid) ? ' · Nv. ' + pokemon.level : ''}`)
    .join('\n')
  return `⚔️ *¡Combate Pokémon terminado!*\nGanó ${winners}.\n\n*Equipo retador:*\n${line(result.fightersA)}\n\n*Equipo defensor:*\n${line(result.fightersB)}\n\nCada Pokémon que participó en el equipo ganador subió 1 nivel. Cuida a los Pokémon debilitados con .alimentar.`
}

let handler = async (m, { conn, args }) => {
  if (!m.isGroup) return m.reply('Los combates Pokémon entre grupos solo pueden iniciarse desde un grupo.')

  const action = String(args[0] || '').toLowerCase()
  if (action === 'retar' || action === 'reto') {
    const target = String(args[1] || '').trim()
    if (!target.endsWith('@g.us')) {
      return m.reply('Indica el ID del grupo rival, por ejemplo: .pokebatalla retar 120363000000000000@g.us.')
    }
    if (target === m.chat) return m.reply('No puedes retar a tu propio grupo.')

    const now = Date.now()
    const challenge = {
      id: randomUUID().slice(0, 8),
      from: m.chat,
      to: target,
      createdAt: now,
      expiresAt: now + CHALLENGE_TTL
    }
    const result = await mutatePokemonState(state => {
      for (const [id, current] of Object.entries(state.challenges)) {
        if (current.expiresAt <= now) delete state.challenges[id]
      }
      const existing = Object.values(state.challenges).find(current => current.to === target)
      if (existing) return { error: 'Ese grupo ya tiene un reto pendiente. Espera a que lo acepte o expire.' }
      const group = ensurePokemonGroup(state, m.chat)
      const escaped = refreshPokemonCare(group, now)
      if (!alivePokemon(group, now).length) {
        return { error: 'El equipo del grupo no tiene Pokémon con vida para combatir.', escaped }
      }
      while (state.challenges[challenge.id]) challenge.id = randomUUID().slice(0, 8)
      state.challenges[challenge.id] = challenge
      return { challenge }
    })
    if (result.error) {
      const escaped = result.escaped?.length
        ? ` Escaparon: ${result.escaped.map(pokemon => getSpecies(pokemon)?.name || pokemon.speciesId).join(', ')}.`
        : ''
      return m.reply(`${result.error}${escaped}`)
    }

    let notificationError
    try {
      await conn.sendMessage(target, {
        text: `⚔️ *¡Reto Pokémon!*\nEl grupo ${m.chat} te ha retado a una batalla.\nAcepta aquí con .pokebatalla aceptar ${challenge.id}\nEl reto vence en 10 minutos.`
      })
    } catch (error) {
      notificationError = error
      console.error('[pokemon-rpg] No se pudo avisar al grupo rival:', error)
    }
    const notifyText = notificationError
      ? '\nNo pude enviar el aviso directamente; comparte el código con el otro grupo.'
      : ''
    return conn.sendMessage(m.chat, {
      text: `⚔️ Reto enviado al grupo ${target}. Código: *${challenge.id}*.\nSu equipo podrá aceptar con .pokebatalla aceptar ${challenge.id}.${notifyText}`,
      contextInfo: { ...(global.rcanal?.contextInfo || {}) }
    }, { quoted: m })
  }

  if (action === 'aceptar' || action === 'accept') {
    const challengeId = String(args[1] || '').trim()
    if (!challengeId) return m.reply('Indica el código del reto: .pokebatalla aceptar <código>.')

    const now = Date.now()
    const outcome = await mutatePokemonState(state => {
      const challenge = state.challenges[challengeId]
      if (!challenge || challenge.to !== m.chat) return { error: 'No hay un reto pendiente con ese código para este grupo.' }
      delete state.challenges[challengeId]
      if (challenge.expiresAt <= now) return { error: 'El reto ya venció. Pide que lo envíen de nuevo.' }

      const attackingGroup = ensurePokemonGroup(state, challenge.from)
      const defendingGroup = ensurePokemonGroup(state, challenge.to)
      const escapedFrom = refreshPokemonCare(attackingGroup, now)
      const escapedTo = refreshPokemonCare(defendingGroup, now)
      if (!alivePokemon(attackingGroup, now).length || !alivePokemon(defendingGroup, now).length) {
        return {
          error: 'Uno de los grupos no tiene Pokémon con vida; el combate fue cancelado.',
          escapedFrom,
          escapedTo
        }
      }

      const battle = simulateBattle(attackingGroup, defendingGroup, now)
      return {
        battle,
        attackingGroup,
        defendingGroup,
        attackingGroupId: challenge.from,
        escapedFrom: escapedFrom.map(pokemon => getSpecies(pokemon)?.name || pokemon.speciesId),
        escapedTo: escapedTo.map(pokemon => getSpecies(pokemon)?.name || pokemon.speciesId)
      }
    })
    if (outcome.error) {
      const escaped = [...(outcome.escapedFrom || []), ...(outcome.escapedTo || [])]
      return m.reply(`${outcome.error}${escaped.length ? ` Escaparon: ${escaped.map(pokemon => getSpecies(pokemon)?.name || pokemon.speciesId).join(', ')}.` : ''}`)
    }

    const escapeText = outcome.escapedFrom.length || outcome.escapedTo.length
      ? `\n\n😢 Escaparon por falta de cuidados: ${outcome.escapedFrom.join(', ') || 'ninguno'} del grupo retador; ${outcome.escapedTo.join(', ') || 'ninguno'} del defensor.`
      : ''
    const text = `${resultText(outcome.attackingGroup, outcome.battle, now)}${escapeText}`
    await conn.sendMessage(m.chat, {
      text,
      contextInfo: { ...(global.rcanal?.contextInfo || {}) }
    }, { quoted: m })
    try {
      await conn.sendMessage(outcome.attackingGroupId, { text })
    } catch (error) {
      console.error('[pokemon-rpg] No se pudo enviar el resultado al grupo retador:', error)
    }
    return
  }

  return m.reply(`⚔️ *Batallas Pokémon entre grupos*\n• .pokebatalla retar <ID-grupo>\n• .pokebatalla aceptar <código>\nUn reto dura 10 minutos; ganar sube 1 nivel a los Pokémon del grupo vencedor.`)
}

handler.help = ['pokebatalla retar <ID-grupo> | aceptar <código>']
handler.tags = ['rpg']
handler.command = ['pokebatalla', 'batallapokemon']

export default handler
