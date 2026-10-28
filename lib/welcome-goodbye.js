/**
* Sistema de bienvenidas y despedidas
*/

import { shouldSkipByModoSub } from '../plugins/modo-sub.js'
import { resolvePhoneNumber } from './resolve-phone.js'
import fs from 'node:fs/promises'

export async function handleWelcomeGoodbye(conn, update) {
    let { id, participants, action } = update

    if (!id) return
    id = conn.decodeJid(id)
    if (id === 'status@broadcast') return

    // Solo el bot elegido con .modosub responde bienvenidas/despedidas en el grupo
    if (id.endsWith('@g.us') && shouldSkipByModoSub(conn, id)) return

    
    if (!global.db || !global.db.data) {
        return
    }

    
    if (!global.db.data.bienvenidas) {
        global.db.data.bienvenidas = {}
    }

    try {
        

        const config = global.db.data.bienvenidas[id]
        if (config === true) {
            global.db.data.bienvenidas[id] = {
                formatVersion: 2,
                enabled: true,
                welcomeEnabled: true,
                goodbyeEnabled: true,
                welcomeMsg: '',
                goodbyeMsg: '',
                welcomeImg: '',
                goodbyeImg: ''
            }
        } else if (config === false) {
            global.db.data.bienvenidas[id] = {
                formatVersion: 2,
                enabled: false,
                welcomeEnabled: false,
                goodbyeEnabled: false,
                welcomeMsg: '',
                goodbyeMsg: '',
                welcomeImg: '',
                goodbyeImg: ''
            }
        } else if (!config || typeof config !== 'object') {
            global.db.data.bienvenidas[id] = {
                formatVersion: 2,
                enabled: false,
                welcomeEnabled: false,
                goodbyeEnabled: false,
                welcomeMsg: '',
                goodbyeMsg: '',
                welcomeImg: '',
                goodbyeImg: ''
            }
        }

        const currentConfig = global.db.data.bienvenidas[id]
        let migrated = false
        if (currentConfig.formatVersion !== 2) {
            currentConfig.formatVersion = 2
            currentConfig.welcomeEnabled = currentConfig.enabled === true
            currentConfig.goodbyeEnabled = currentConfig.enabled === true
            currentConfig.welcomeMsg = ''
            currentConfig.goodbyeMsg = ''
            migrated = true
        }
        if (typeof currentConfig.welcomeImg !== 'string') {
            currentConfig.welcomeImg = ''
            migrated = true
        }
        if (typeof currentConfig.goodbyeImg !== 'string') {
            currentConfig.goodbyeImg = ''
            migrated = true
        }
        if (typeof currentConfig.welcomeImgUrl !== 'string') {
            currentConfig.welcomeImgUrl = ''
            migrated = true
        }
        if (typeof currentConfig.goodbyeImgUrl !== 'string') {
            currentConfig.goodbyeImgUrl = ''
            migrated = true
        }
        if (migrated) await global.db.write().catch(() => {})
        if (typeof currentConfig.welcomeEnabled !== 'boolean') currentConfig.welcomeEnabled = currentConfig.enabled === true
        if (typeof currentConfig.goodbyeEnabled !== 'boolean') currentConfig.goodbyeEnabled = currentConfig.enabled === true

        if (!currentConfig || !currentConfig.enabled) {
            return
        }

        
        const groupMetadata = await conn.groupMetadata(id).catch(_ => null)
        if (!groupMetadata) {
            return
        }

        

        for (const participant of participants) {
            let participantId = conn.decodeJid(participant)
            
            
            if (typeof participantId === 'object') {
                participantId = participantId.id || participantId.jid || participant.toString()
            }

            participantId = conn.decodeJid(String(participantId))
            

            try {
                if (action === 'add' && currentConfig.welcomeEnabled) {
                    await sendWelcomeMessage(conn, id, participantId, groupMetadata)
                } else if (action === 'remove' && currentConfig.goodbyeEnabled) {
                    await sendGoodbyeMessage(conn, id, participantId, groupMetadata)
                }
            } catch (error) {
                
            }

            
            await new Promise(resolve => setTimeout(resolve, 1000))
        }

    } catch (error) {
        
    }
}

async function sendWelcomeMessage(conn, groupId, participantId, groupMetadata) {
    try {
        

        let user = await conn.getName(participantId) || 'Usuario'
        const group = groupMetadata.subject || await conn.getName(groupId) || 'Grupo'
        const memberCount = groupMetadata.participants.length
        const description = groupMetadata.desc || 'Sin descripción'

        const now = new Date()
        const date = `${now.getDate()} de ${now.toLocaleDateString('es-ES', {
            month: 'long'
        }).toLocaleUpperCase('es-ES')}`
        const time = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        })

        let welcomeMsg = global.db.data.bienvenidas[groupId].welcomeMsg || getDefaultWelcomeMessage()
        welcomeMsg = replacePlaceholders(welcomeMsg, { user, group, description, memberCount, date, time, participant: participantId })

        const welcomeConfig = global.db.data.bienvenidas[groupId]
        const customImage = await readCustomImage(welcomeConfig?.welcomeImg)
        const imageUrl = welcomeConfig?.welcomeImgUrl
        let image = customImage || (imageUrl ? { url: imageUrl } : null)
        if (!image) {
            const profileJid = await getParticipantProfileJid(conn, participantId, groupId, groupMetadata)
            const pp = profileJid
                ? await conn.profilePictureUrl(profileJid, 'image').catch(_ => null)
                : null
            image = pp ? { url: pp } : { url: './imagenbienvenida.jpg' }
        }

        const payload = {
            caption: welcomeMsg,
            contextInfo: {
                mentionedJid: [participantId]
            }
        }

        try {
            await conn.sendMessage(groupId, { image, ...payload })
        } catch (error) {
            if (!imageUrl || !customImage) throw error
            await conn.sendMessage(groupId, { image: customImage, ...payload })
        }

        

    } catch (error) {
        
    }
}

async function sendGoodbyeMessage(conn, groupId, participantId, groupMetadata) {
    try {
        

        let user = await conn.getName(participantId) || 'Usuario'
        const group = groupMetadata.subject || await conn.getName(groupId) || 'Grupo'
        const memberCount = groupMetadata.participants.length
        const description = groupMetadata.desc || 'Sin descripción'

        const now = new Date()
        const date = `${now.getDate()} de ${now.toLocaleDateString('es-ES', {
            month: 'long'
        }).toLocaleUpperCase('es-ES')}`
        const time = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        })

        let goodbyeMsg = global.db.data.bienvenidas[groupId].goodbyeMsg || getDefaultGoodbyeMessage()
        goodbyeMsg = replacePlaceholders(goodbyeMsg, { user, group, description, memberCount, date, time, participant: participantId })

        const goodbyeConfig = global.db.data.bienvenidas[groupId]
        const customImage = await readCustomImage(goodbyeConfig?.goodbyeImg)
        const imageUrl = goodbyeConfig?.goodbyeImgUrl
        let image = customImage || (imageUrl ? { url: imageUrl } : null)
        if (!image) {
            const profileJid = await getParticipantProfileJid(conn, participantId, groupId, groupMetadata)
            const pp = profileJid
                ? await conn.profilePictureUrl(profileJid, 'image').catch(_ => null)
                : null
            image = pp ? { url: pp } : { url: './imagendespedida.jpg' }
        }

        const payload = {
            caption: goodbyeMsg,
            contextInfo: {
                mentionedJid: [participantId]
            }
        }

        try {
            await conn.sendMessage(groupId, { image, ...payload })
        } catch (error) {
            if (!imageUrl || !customImage) throw error
            await conn.sendMessage(groupId, { image: customImage, ...payload })
        }

        

    } catch (error) {
        
    }
}

async function readCustomImage(filePath) {
    if (!filePath) return null
    try {
        const image = await fs.readFile(filePath)
        return image.length ? image : null
    } catch {
        return null
    }
}

async function getParticipantProfileJid(conn, participantId, groupId, groupMetadata) {
    const phone = await resolvePhoneNumber(participantId, conn, null, null, {
        groupId,
        participants: groupMetadata?.participants || []
    })

    const profileJid = phone ? `${phone}@s.whatsapp.net` : participantId
    if (!profileJid || String(profileJid).endsWith('@g.us')) return null
    return profileJid
}

function replacePlaceholders(message, data) {
    let participant = data.participant
    if (typeof participant !== 'string') {
        participant = participant.toString()
    }
    
    return message
        .replace(/\${user}/g, data.user)
        .replace(/\${participant}/g, `@${participant.split('@')[0]}`)
        .replace(/\${group}/g, data.group)
        .replace(/\${description}/g, data.description)
        .replace(/\${memberCount}/g, data.memberCount)
        .replace(/\${date}/g, data.date)
        .replace(/\${time}/g, data.time)
}

function getDefaultWelcomeMessage() {
    return `> 🐬 ¡Welcome to \${group}! 🐬
◦ Usuario: \${participant} 🎀
◦ Date: \${date}

> 🌟 ¡Qué emoción! \${participant} 🫶 se ha sumado a nuestro grupo. ¡Bienvenida!`
}

function getDefaultGoodbyeMessage() {
    return `> 🐬 ¡Hasta pronto, \${group}! 🐬
◦ Usuario: \${participant} 🎀
◦ Date: \${date}

> 💫 \${participant} ha salido de nuestro grupo. ¡Gracias por compartir este tiempo con nosotros!`
}
