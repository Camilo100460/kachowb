import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const ROOT = process.cwd()
const CARD_DIR = path.join(ROOT, 'imagenes', 'Cartas Pokemon')
const STATE_FILE = path.join(ROOT, 'storage', 'databases', 'pokemon-rpg-state.json')
const DAY_MS = 24 * 60 * 60 * 1000
const rawCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'storage', 'databases', 'pokemon-rpg-catalog.json'), 'utf8'))

export const POKEMON = rawCatalog.map(entry => ({
  ...entry,
  imagePath: path.join(CARD_DIR, entry.file)
}))
export const POKEMON_BY_ID = new Map(POKEMON.map(pokemon => [pokemon.id, pokemon]))
export const DISCOVERABLE_POKEMON = POKEMON.filter(pokemon =>
  pokemon.discoverable &&
  !['rare', 'legendary'].includes(pokemon.rarity) &&
  fs.existsSync(pokemon.imagePath)
)

export const ITEMS = {
  oran_berry: { name: 'Baya Aranja', price: 20, kind: 'food', care: 18, heal: 15 },
  pokemon_food: { name: 'Comida Pokémon', price: 40, kind: 'food', care: 25, heal: 20 },
  poke_puff: { name: 'Poké Puffs', price: 60, kind: 'food', care: 35, heal: 30 },
  fire_stone: { name: 'Piedra Fuego', price: 35, kind: 'evolution' },
  thunder_stone: { name: 'Piedra Trueno', price: 35, kind: 'evolution' },
  moon_stone: { name: 'Piedra Lunar', price: 35, kind: 'evolution' },
  prism_scale: { name: 'Escama Bella', price: 40, kind: 'evolution' },
  nugget: { name: 'Pepita', sellPrice: 25, kind: 'rare' },
  stardust: { name: 'Polvo Estelar', sellPrice: 12, kind: 'rare' },
  pearl: { name: 'Perla', sellPrice: 8, kind: 'rare' },
  rare_candy: { name: 'Caramelo Raro', sellPrice: 15, kind: 'rare' },
  relic_gold: { name: 'Reliquia Dorada', sellPrice: 50, kind: 'rare' }
}

export const DAY_MS_POKEMON = DAY_MS

let stateCache
let queue = Promise.resolve()

function serialize(operation) {
  const result = queue.then(operation, operation)
  queue = result.catch(() => {})
  return result
}

async function loadState() {
  if (stateCache) return stateCache
  try {
    const parsed = JSON.parse(await fs.promises.readFile(STATE_FILE, 'utf8'))
    stateCache = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : { version: 2, players: {}, groups: {}, challenges: {} }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    stateCache = { version: 2, players: {}, groups: {}, challenges: {} }
  }

  if (!stateCache.players || typeof stateCache.players !== 'object' || Array.isArray(stateCache.players)) {
    stateCache.players = {}
  }
  if (!stateCache.groups || typeof stateCache.groups !== 'object' || Array.isArray(stateCache.groups)) {
    stateCache.groups = {}
  }
  if (!stateCache.challenges || typeof stateCache.challenges !== 'object' || Array.isArray(stateCache.challenges)) {
    stateCache.challenges = {}
  }
  stateCache.version = 2
  return stateCache
}

async function persistState() {
  await fs.promises.mkdir(path.dirname(STATE_FILE), { recursive: true })
  const temporary = `${STATE_FILE}.${process.pid}.${randomUUID()}.tmp`
  try {
    await fs.promises.writeFile(temporary, `${JSON.stringify(stateCache, null, 2)}\n`, 'utf8')
    await fs.promises.rename(temporary, STATE_FILE)
  } catch (error) {
    await fs.promises.rm(temporary, { force: true }).catch(cleanupError => {
      console.error('[pokemon-rpg] No se pudo limpiar archivo temporal:', cleanupError)
    })
    throw error
  }
}

export function mutatePokemonState(update) {
  return serialize(async () => {
    const state = await loadState()
    const result = await update(state)
    await persistState()
    return result
  })
}

export function readPokemonState() {
  return serialize(async () => structuredClone(await loadState()))
}

export function ensurePokemonPlayer(state, jid) {
  if (!state.players[jid] || typeof state.players[jid] !== 'object' || Array.isArray(state.players[jid])) {
    state.players[jid] = {}
  }
  const player = state.players[jid]
  if (!player.inventory || typeof player.inventory !== 'object' || Array.isArray(player.inventory)) player.inventory = {}
  if (!Number.isFinite(player.lastExplore)) player.lastExplore = 0
  return player
}

export function ensurePokemonGroup(state, jid) {
  if (!state.groups[jid] || typeof state.groups[jid] !== 'object' || Array.isArray(state.groups[jid])) {
    state.groups[jid] = {}
  }
  const group = state.groups[jid]
  if (!Array.isArray(group.pokemon)) group.pokemon = []
  group.pokemon = group.pokemon.slice(0, 4)
  return group
}

export function newPokemon(species, now = Date.now()) {
  return {
    uid: randomUUID(),
    speciesId: species.id,
    level: 1,
    hp: 100,
    care: 100,
    lastFed: now,
    battlesWon: 0,
    caughtAt: now
  }
}

export function careLevel(pokemon, now = Date.now()) {
  const lastFed = Number(pokemon.lastFed) || Number(pokemon.caughtAt) || now
  const missedDays = Math.floor(Math.max(0, now - lastFed) / DAY_MS)
  const care = Number.isFinite(Number(pokemon.care)) ? Number(pokemon.care) : 100
  return Math.max(0, Math.min(100, care - missedDays * 15))
}

export function refreshPokemonCare(group, now = Date.now()) {
  const escaped = []
  group.pokemon = group.pokemon.filter(pokemon => {
    if (careLevel(pokemon, now) > 0) return true
    escaped.push(pokemon)
    return false
  })
  return escaped
}

export function maxPokemonHp(pokemon, now = Date.now()) {
  return 50 + Math.floor(careLevel(pokemon, now) / 2)
}

export function currentPokemonHp(pokemon, now = Date.now()) {
  const hp = Number.isFinite(Number(pokemon.hp)) ? Number(pokemon.hp) : 100
  return Math.round(maxPokemonHp(pokemon, now) * Math.max(0, Math.min(100, hp)) / 100)
}

export function getSpecies(pokemon) {
  return POKEMON_BY_ID.get(pokemon.speciesId)
}

export function findOwnedPokemon(group, identifier) {
  const value = String(identifier || '').trim()
  if (!value) return null
  if (/^\d+$/.test(value)) return group.pokemon[Number(value) - 1] || null
  const normalized = value.toLowerCase()
  return group.pokemon.find(pokemon =>
    pokemon.uid.toLowerCase().startsWith(normalized) ||
    getSpecies(pokemon)?.name.toLowerCase() === normalized ||
    getSpecies(pokemon)?.id === normalized
  ) || null
}

export function findItemId(value) {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return null
  return Object.entries(ITEMS).find(([id, item]) =>
    id === normalized || item.name.toLowerCase() === normalized
  )?.[0] || null
}

export function formatUsd(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(amount)
}

export function formatPokemonEntry(pokemon, index, now = Date.now()) {
  const species = getSpecies(pokemon)
  const hp = currentPokemonHp(pokemon, now)
  const maxHp = maxPokemonHp(pokemon, now)
  const care = careLevel(pokemon, now)
  return `${index + 1}. *${species?.name || pokemon.speciesId}* Nv.${pokemon.level} · HP ${hp}/${maxHp} · cuidado ${care}% · ID ${pokemon.uid.slice(0, 6)}`
}

export function formatInventory(inventory) {
  const entries = Object.entries(inventory)
    .filter(([itemId, quantity]) => ITEMS[itemId] && Number(quantity) > 0)
    .map(([itemId, quantity]) => {
      const item = ITEMS[itemId]
      const sale = item.sellPrice ? ` · venta ${item.sellPrice} ${global.moneda || 'USD'} c/u` : ''
      return `• ${item.name} ×${quantity} (\`${itemId}\`)${sale}`
    })
  return entries.length ? entries.join('\n') : 'Tu mochila está vacía.'
}

export function addItem(player, itemId, quantity = 1) {
  player.inventory[itemId] = (Number(player.inventory[itemId]) || 0) + quantity
}

export function removeItem(player, itemId, quantity = 1) {
  const count = Number(player.inventory[itemId]) || 0
  if (count < quantity) return false
  if (count === quantity) delete player.inventory[itemId]
  else player.inventory[itemId] = count - quantity
  return true
}

export function chooseWeightedPokemon(random = Math.random) {
  return DISCOVERABLE_POKEMON[Math.floor(random() * DISCOVERABLE_POKEMON.length)]
}
