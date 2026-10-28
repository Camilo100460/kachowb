import { createRiddleHandler } from '../lib/riddle-game.js'

export default createRiddleHandler({
  dataset: 'adivinanzas-futbol.json',
  activeKey: 'adivinanzasFutbolActivas',
  commandName: 'futbol',
  title: '⚽ *ADIVINANZA DE FÚTBOL*',
  categoryLabel: 'Categoría'
})
