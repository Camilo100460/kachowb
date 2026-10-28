import { createRiddleHandler } from '../lib/riddle-game.js'

export default createRiddleHandler({
  dataset: 'matematicas.json',
  activeKey: 'matematicasActivas',
  commandName: 'mate',
  commands: ['mate', 'mates', 'matematicas', 'matemáticas', 'math'],
  title: '🧮 𝗥𝗘𝗧𝗢 𝗗𝗘 𝗠𝗔𝗧𝗘𝗠𝗔́𝗧𝗜𝗖𝗔𝗦',
  categoryLabel: 'Dificultad',
  categories: ['easy', 'medium', 'hard'],
  defaultCategory: 'medium',
  helpText: '.mate [easy|medium|hard] (responde citando la operación; premio de 250-500 monedas)'
})
