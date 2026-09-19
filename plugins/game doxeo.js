const random = max => Math.floor(Math.random() * max)
const randomIp = () => `${random(256)}.${random(256)}.${random(256)}.${random(256)}`
const randomHex = length => Array.from({ length }, () => random(256).toString(16).padStart(2, '0')).join(':').toUpperCase()

const getRandomValue = values => values[random(values.length)]

let handler = async (m, { text }) => {
  const name = String(text || '').trim() || 'Usuario desconocido'
  const fakeIp = randomIp()
  const fakeData = {
    ip: fakeIp,
    ipv6: `fe80::${random(65536).toString(16)}:${random(65536).toString(16)}`,
    mac: randomHex(6),
    isp: getRandomValue(['ISP Ficticio', 'Internet Demo', 'Red Simulada']),
    dns: randomIp(),
    gateway: `192.${random(256)}.${random(256)}.1`,
    router: getRandomValue(['Router Demo', 'TP-Link Ficticio', 'Network Box']),
    device: getRandomValue(['WIN32-DEMO', 'Device Ficticio', 'SecureTech Demo']),
    ports: `${random(10000)}, ${random(10000)}, ${random(10000)}`
  }

  const message = `🕵️ *DOXEO TERMINADO* 🕵️

⚠️ • 𝙉𝙤 𝙩𝙤𝙙𝙤 𝙡𝙤 𝙦𝙪𝙚 𝙧𝙚𝙘𝙞𝙗𝙚 𝙙𝙚𝙗𝙚 𝙨𝙚𝙧 𝙧𝙚𝙥𝙡𝙞𝙘𝙖𝙙𝙤.

👤 *Objetivo:* ${name}
🌐 *IP:* ${fakeData.ip}
🔐 *IPv6:* ${fakeData.ipv6}
💻 *MAC:* ${fakeData.mac}
📡 *ISP:* ${fakeData.isp}
🔎 *DNS:* ${fakeData.dns}
🚪 *Gateway:* ${fakeData.gateway}
📦 *Puertos:* ${fakeData.ports}
📡 *Router:* ${fakeData.router}
💿 *Dispositivo:* ${fakeData.device}`

  return m.reply(message)
}

handler.help = ['doxeo <nombre>']
handler.tags = ['fun']
handler.command = ['doxeo', 'doxear', 'doxxeo', 'doxeame']

export default handler
