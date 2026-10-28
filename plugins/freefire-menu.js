import { readFileSync } from 'node:fs'

const menuImages = ['./freefire.jpg']

let handler = async (m, { conn, usedPrefix }) => {
  const menu = `
🔥 *𝐅𝐑𝐄𝐄 𝐅𝐈𝐑𝐄* 🔥

╭━〔 ⚔️ _*LISTAS/COLOR*_ 〕━╮
┃
┃ 🎯 ${usedPrefix}cuadrilatero <color>/<hora>
┃ ⚔️ ${usedPrefix}12vs12 <color>/<hora>
┃ 🔥 ${usedPrefix}16vs16 <color>/<hora>
┃ 🦅 ${usedPrefix}clk <color>/<hora>
┃ ⚡ ${usedPrefix}clk6vs6 <color>/<hora>
┃ ♾️ ${usedPrefix}infinito <color>/<hora>
┃ ♾️ ${usedPrefix}infinito6vs6 <color>/<hora>
╰━━━━━━━━━━━━━━━╯

╭━〔 🏆 _*DUELOS/SCRIMS*_ 〕━╮
┃
┃ ⚔️ ${usedPrefix}vv2 <hora>
┃ ⚔️ ${usedPrefix}vv2-6 <hora>
┃ 🌷 ${usedPrefix}scrim <hora>
╰━━━━━━━━━━━━━━━╯

╭━〔 📋 _*INFORMACIÓN*_ 〕━╮
┃
┃ 📜 ${usedPrefix}reglas
┃ 💬 ${usedPrefix}discord
┃ 📸 ${usedPrefix}insta
╰━━━━━━━━━━━━━━━╯

╭━〔 📝 _*CÓMO ANOTARSE*_ 〕━╮
┃
┃ ✅ *Para anotarte, reacciona:*
┃ 👍 ❤️ 😮 😂 = Escuadras en orden
┃ 🙋 = Suplente
┃
┃ ❌ *Para salir de la lista:*
┃ 😢 = Salir
┃
┃ 🔘 En las listas con botones,
┃ pulsa la opción debajo de la lista.
╰━━━━━━━━━━━━━━━╯

> 📌 *Formato de hora:* 24 horas, ejemplo *20:30*.
> 🎨 *Color y hora:* separados por /, ejemplo *${usedPrefix}clk rojo/20:30*.`

  const imagePath = menuImages[Math.floor(Math.random() * menuImages.length)]
  const image = readFileSync(new URL(`../${imagePath}`, import.meta.url))

  await conn.sendMessage(m.chat, {
    image,
    caption: menu
  }, { quoted: m })
}

handler.command = ['freefire', 'listas', 'menulistas']
handler.tags = ['listas']
handler.help = ['freefire']

export default handler