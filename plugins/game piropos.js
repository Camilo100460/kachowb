/* By https://github.com/DIEGO-OFC/DORRAT-BOT-MD */

const handler = async (m, { conn, text }) => {
  m.reply(`💐• *${pickRandom(global.piropo)}*`)
}

handler.tags = ['frases']
handler.command = ['piropo']

export default handler

function pickRandom(list) {
  return list[Math.floor(list.length * Math.random())]
}

global.piropo = [
  '¿Me regalas una sonrisa? Es que la mía se perdió cuando te vio.',
  'Con esa sonrisa cualquiera pierde la concentración.',
  '¿Siempre eres así de encantadora o hoy estás haciendo una excepción?',
  'Si la belleza fuera tiempo, tú serías una eternidad.',
  'No sé qué tiene tu mirada, pero definitivamente funciona.',
  'Creo que mi día acaba de mejorar después de verte.',
  '¿Tienes brújula? Porque me perdí en tu mirada.',
  'Tu sonrisa debería tener advertencia: puede alegrarle el día a cualquiera.',
  'No eres Google, pero tienes todo lo que estaba buscando.',
  'Si fueras canción, serías la que pondría en repetición.',
  '¿Eres magia? Porque apareciste y cambiaste el ambiente.',
  'Qué peligro esa sonrisa, casi me hace olvidar lo que iba a decir.',
  '¿Me la va a prestar o solo la va a usar pa mear?',
  'Con ese culo venga la invito a cagar a mi casa',
  'Esos ojos están como pa chuparle esas t*tas',
  'Si asi como camina culea.. Me la como hasta con gonorrea',
  'Quien fuera pirata pa encontrar ese tesoro que tiene entre pata y pata',
  'uy mami si cocina como camina me le como hasta la pega',
  'Quien fuera baldosa pa verle esa cosa',
  'Ojalá fueras perico pa olerte esa raja',
  'Nada más es que me diga donde es el velorio qué yo voy y se lo entierro mi amor',
  'Ojala ser paleontologo para chuparte ese tapón y decirte cual es el periodo',
  'Tiene esa carita de galleta como para llenarsela de leche',
  'Uy mami dime dónde cagas para ir a revolcarme en su m***',
  'Quisiera ser mantequilla para derretirme en tu arepa',
  'Quien pudiera ser paleontologo para chuparte el tampón y decirte que periodo es',
  'Oye nena eres escuela gringa porque te voy a disparar niños adentro',
  'El nombre de su ginecólogo para ir a chuparle los dedos',
  '(leala con voz de ñero) uy sotcia quien fuera ollla express pa meterle la carne dura y sacarsela balndita mi amor',
  'Mamacita estás tan buena que te comería con todo y ropa, aunque pasara un mes "cagando" trapos',
  'si tu fueras peo yo apretaria culo pa no soltarte',
  'De tus amigos sos el que más grande la tiene',
  'La tienes bien grandota y gruesa',
  'Tenés el teléfono entre las nalgas? Porque tu culo me está llamando',
  'con ese culito, cagame un ojo y decime pirata de mierda'
]