const optionMessageKeys = new Map()

export async function sendListWithOptionsAndRoster(conn, chat, rosterText, options, quoted, mentions = []) {
	const rosterMessage = await conn.sendMessage(chat, {
		text: rosterText,
		contextInfo: mentions.length ? { mentionedJid: mentions } : {}
	}, { quoted })
	const optionsMessages = []
	try {
		for (let index = 0; index < options.length; index += 3) {
			const buttonOptions = options.slice(index, index + 3)
			const optionsMessage = await conn.sendButtonsLia(
				chat,
				'𝐄𝐒𝐂𝐔𝐀𝐃𝐑𝐀𝐒',
				'Elige una opción para actualizar la lista.',
				buttonOptions.map(({ id, label }) => ({ text: label, id }))
			)
			optionsMessages.push(optionsMessage)
		}
	} catch (error) {
		for (const sentMessage of [...optionsMessages, rosterMessage]) {
			try {
				await conn.sendMessage(chat, { delete: sentMessage.key })
			} catch (cleanupError) {
				console.warn(`[freefire-list] No se pudo limpiar un mensaje incompleto: ${cleanupError.message}`)
			}
		}
		throw error
	}
	const optionsKeys = optionsMessages.map(message => message.key)
	optionMessageKeys.set(rosterMessage.key.id, optionsKeys)
	return { key: rosterMessage.key, optionsKey: optionsKeys[0], optionsKeys }
}

export function getListSelection(m, messageKey, prefix) {
	const selection = m.text?.trim()
	if (!selection?.startsWith(prefix)) return null

	const responseTo = m.quoted?.id
		|| m.msg?.contextInfo?.stanzaId
		|| m.message?.interactiveResponseMessage?.contextInfo?.stanzaId
		|| m.message?.listResponseMessage?.contextInfo?.stanzaId
	const optionsKeys = optionMessageKeys.get(messageKey?.id) || [messageKey]
	if (!responseTo || !optionsKeys.some(key => responseTo === key?.id)) return null

	return selection
}

export async function replaceListWithOptions(conn, chat, text, options, quoted, previousMessageKey, mentions = []) {
	const sent = await sendListWithOptionsAndRoster(conn, chat, text, options, quoted, mentions)
	const previousOptionsKeys = optionMessageKeys.get(previousMessageKey?.id) || []
	if (previousMessageKey?.id) optionMessageKeys.delete(previousMessageKey.id)
	for (const oldKey of [...previousOptionsKeys, previousMessageKey]) {
		if (!oldKey?.id) continue
		try {
			await conn.sendMessage(chat, { delete: oldKey })
		} catch (error) {
			console.warn(`[freefire-list] No se pudo reemplazar el mensaje interactivo anterior: ${error.message}`)
		}
	}
	return sent
}
