/**
* Sistema de bienvenidas y despedidas
*/

import { shouldSkipByModoSub } from '../plugins/modo-sub.js'
import { resolvePhoneNumber } from './resolve-phone.js'

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
        const group = await conn.getName(groupId) || 'Grupo'
        const memberCount = groupMetadata.participants.length
        const description = groupMetadata.desc || 'Sin descripción'

        const now = new Date()
        const date = now.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        const time = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        })

        let welcomeMsg = global.db.data.bienvenidas[groupId].welcomeMsg || getDefaultWelcomeMessage()
        welcomeMsg = replacePlaceholders(welcomeMsg, { user, group, description, memberCount, date, time, participant: participantId })

        const profileJid = await getParticipantProfileJid(conn, participantId, groupId, groupMetadata)
        const pp = profileJid
            ? await conn.profilePictureUrl(profileJid, 'image').catch(_ => null)
            : null
        if (pp) {
            await conn.sendMessage(groupId, {
                image: { url: pp },
                caption: welcomeMsg,
                contextInfo: {
                    mentionedJid: [participantId]
                }
            })
        } else {
            await conn.sendMessage(groupId, {
                text: welcomeMsg,
                contextInfo: {
                    mentionedJid: [participantId]
                }
            })
        }

        

    } catch (error) {
        
    }
}

async function sendGoodbyeMessage(conn, groupId, participantId, groupMetadata) {
    try {
        

        let user = await conn.getName(participantId) || 'Usuario'
        const group = await conn.getName(groupId) || 'Grupo'
        const memberCount = groupMetadata.participants.length
        const description = groupMetadata.desc || 'Sin descripción'

        const now = new Date()
        const date = now.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        const time = now.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        })

        let goodbyeMsg = global.db.data.bienvenidas[groupId].goodbyeMsg || getDefaultGoodbyeMessage()
        goodbyeMsg = replacePlaceholders(goodbyeMsg, { user, group, description, memberCount, date, time, participant: participantId })

        const profileJid = await getParticipantProfileJid(conn, participantId, groupId, groupMetadata)
        const pp = profileJid
            ? await conn.profilePictureUrl(profileJid, 'image').catch(_ => null)
            : null
        if (pp) {
            await conn.sendMessage(groupId, {
                image: { url: pp },
                caption: goodbyeMsg,
                contextInfo: {
                    mentionedJid: [participantId]
                }
            })
        } else {
            await conn.sendMessage(groupId, {
                text: goodbyeMsg,
                contextInfo: {
                    mentionedJid: [participantId]
                }
            })
        }

        

    } catch (error) {
        
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
    return `╭─❖ 𝑩𝑰𝑬𝑵𝑽𝑬𝑵𝑰𝑫𝑶/𝑨 ❖─╮
│ 𖤐 \${participant}
│ 𝑺𝒆𝒂𝒔 𝒎𝒖𝒚 𝒃𝒊𝒆𝒏𝒗𝒆𝒏𝒊𝒅𝒐/𝒂 𝒂𝒍 𝒈𝒓𝒖𝒑𝒐. ✦
│ 𝑬𝒔𝒑𝒆𝒓𝒂𝒎𝒐𝒔 𝒒𝒖𝒆 𝒅𝒊𝒔𝒇𝒓𝒖𝒕𝒆𝒔 𝒕𝒖 𝒆𝒔𝒕𝒂𝒅í𝒂. ♡
╰───────────────╯`
}

function getDefaultGoodbyeMessage() {
    return `╭─❖ 𝑨𝑫𝑰Ó𝑺 ❖─╮
│ 𖤐 \${participant}
│ 𝑯𝒂𝒔𝒕𝒂 𝒑𝒓𝒐𝒏𝒕𝒐, 𝒕𝒆 𝒅𝒆𝒔𝒆𝒂𝒎𝒐𝒔 𝒍𝒐 𝒎𝒆𝒋𝒐𝒓. ✦
│ 𝑮𝒓𝒂𝒄𝒊𝒂𝒔 𝒑𝒐𝒓 𝒉𝒂𝒃𝒆𝒓 𝒇𝒐𝒓𝒎𝒂𝒅𝒐 𝒑𝒂𝒓𝒕𝒆 𝒅𝒆𝒍 𝒈𝒓𝒖𝒑𝒐. ♡
╰───────────────╯`
}
