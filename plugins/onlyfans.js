import fetch from 'node-fetch'

const IMAGE_API = 'https://api.waifu.pics/sfw/waifu'
const imageUrls = [
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	'',
	''
]

let handler = async (m, { conn }) => {
	try {
		const savedUrls = imageUrls.filter(url => /^https?:\/\//i.test(url))
		let imageUrl = savedUrls[Math.floor(Math.random() * savedUrls.length)]

		if (!imageUrl) {
			const response = await fetch(IMAGE_API)
			if (!response.ok) throw new Error(`API respondió con HTTP ${response.status}`)

			const data = await response.json()
			imageUrl = data?.url
		}

		if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
			throw new Error('La API no devolvió una URL de imagen válida')
		}

		await conn.sendMessage(m.chat, {
			image: { url: imageUrl }
		}, { quoted: m })
	} catch (error) {
		console.error('Error en onlyfans:', error)
	}
}

handler.command = ['onlyfans']

export default handler
