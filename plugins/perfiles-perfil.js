import { fileURLToPath } from 'url'
import { findGroupParticipant } from '../lib/group-participant.js'

let handler = async (m, { conn, usedPrefix, command }) => {
  
  let targetUser = m.sender

  
  if (m.mentionedJid && m.mentionedJid.length > 0) {
    targetUser = m.mentionedJid[0]
  }

  const data = global.db.data.users[targetUser]


  if (!data || !data.registered) {
    
    if (!global.db.data.users[targetUser]) {
      global.db.data.users[targetUser] = {
        registered: true,
        name: 'Usuario', 
        regTime: Date.now(),
        age: -1,
        level: 0,
        coins: 0,
        exp: 0,
        genre: 'No establecido',
        birth: 'No registrado',
        desc: 'Sin descripción',
        favourite: 'No establecido',
        partner: '',
        banned: false,
        prem: false
      }
      console.log(`✅ Usuario registrado automáticamente desde perfil: ${targetUser}`)
    }
  }

  const userData = global.db.data.users[targetUser]



  const createOwnerIds = (number) => {
    const cleanNumber = number.replace(/[^0-9]/g, '')
    return [
      cleanNumber + '@s.whatsapp.net',
      cleanNumber + '@lid'
    ]
  }

  const allOwnerIds = [
    conn.decodeJid(conn.user.id),
    ...global.owner.flatMap(([number]) => createOwnerIds(number)),
    ...(global.ownerLid || []).flatMap(([number]) => createOwnerIds(number))
  ]

  const isROwner = allOwnerIds.includes(targetUser)
  const isOwner = isROwner || m.fromMe
  const isMods = isOwner || global.mods.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(targetUser)
  const _user = global.db.data?.users?.[targetUser]
  const isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(targetUser) || _user?.prem == true

  let isRAdmin = false
  let isAdmin = false
  let isGroupCreator = false
  
  let targetIsRAdmin = false
  let targetIsAdmin = false
  let targetIsGroupCreator = false
  
  if (m.isGroup) {
    try {
      const groupMetadata = conn.chats[m.chat]?.metadata || await conn.groupMetadata(m.chat).catch(_ => null)
      if (groupMetadata) {
        const participants = groupMetadata.participants || []
      
        const viewerData = findGroupParticipant(participants, m, conn) || {}
        isRAdmin = viewerData?.admin == 'superadmin' || false
        isAdmin = isRAdmin || viewerData?.admin == 'admin' || false
        isGroupCreator = groupMetadata.owner === m.sender ||
                        groupMetadata.subjectOwner === m.sender ||
                        viewerData?.admin === 'superadmin'

        
        const targetData = findGroupParticipant(participants, targetUser, conn) || {}
        targetIsRAdmin = targetData?.admin == 'superadmin' || false
        targetIsAdmin = targetIsRAdmin || targetData?.admin == 'admin' || false
        targetIsGroupCreator = groupMetadata.owner === targetUser ||
                               groupMetadata.subjectOwner === targetUser ||
                               targetData?.admin === 'superadmin'

      }
    } catch (error) {
      console.error('Error obteniendo metadata del grupo:', error)
    }
  }

  
  let userRole = 'Miembro'
  if (isROwner || isOwner) {
    if (targetIsGroupCreator) {
      userRole = '👑 Creador del Bot y Grupo'
    } else if (targetIsRAdmin || targetIsAdmin) {
      userRole = '👑 Creador del Bot y Admin'
    } else {
      userRole = '👑 Creador del Bot'
    }
  } else if (isMods) {
    if (targetIsGroupCreator) {
      userRole = 'Moderador del Bot y Creador'
    } else if (targetIsRAdmin || targetIsAdmin) {
      userRole = 'Moderador del Bot y Admin'
    } else {
      userRole = 'Moderador del Bot'
    }
  } else if (targetIsGroupCreator) {
    userRole = 'Creador del Grupo'
  } else if (targetIsRAdmin || targetIsAdmin) {
    userRole = 'Admin del Grupo'
  }

  
  let bancoInfo = 'Sin banco'
  let totalCoins = userData.coins || 0
  if (userData.banco && global.bancos && global.bancos[userData.banco]) {
    bancoInfo = global.bancos[userData.banco].nombre || 'Banco desconocido'
    totalCoins += (userData.bancoDinero || 0)
  }

  const texto = `
👤 *PERFIL DE USUARIO*
━━━━━━━━━━━━━━

📌 *DATOS PERSONALES*
• Nombre: ${userData.name || 'No establecido'}
• Género: ${userData.genre || 'No establecido'}
• Cumpleaños: ${userData.birth || 'No registrado'}
• Descripción: ${userData.desc || 'Sin descripción'}
• Favorito: ${userData.favourite || 'No establecido'}

📊 *ESTADÍSTICAS*
• Nivel: ${userData.level || 0}
• Monedas: ${totalCoins} ${global.moneda}
• Experiencia: ${userData.exp || 0}
• Banco: ${bancoInfo}

🛡️ *INFORMACIÓN DE CUENTA*
• ID: ${targetUser}
• Rol: ${userRole}
• Registrado: ${userData.registered ? 'Sí' : 'No'}`.trim()

  let imgBot

  imgBot = await conn.profilePictureUrl(targetUser, 'image').catch(() => null)
  if (!imgBot) imgBot = await conn.profilePictureUrl(targetUser, 'preview').catch(() => null)
  const hasUserPP = Boolean(imgBot)

  if (hasUserPP) {
    await conn.sendMessage(m.chat, {
      image: { url: imgBot },
      caption: texto,
      contextInfo: {
        ...rcanal.contextInfo,
        mentionedJid: [userData.partner || targetUser]
      }
    }, { quoted: m })
  } else {
    const fallbackImages = ['perfil1.jpg', 'perfil2.jpg', 'perfil3.jpg']
    imgBot = fileURLToPath(new URL(`../${fallbackImages[Math.floor(Math.random() * fallbackImages.length)]}`, import.meta.url))
    await conn.sendFile(m.chat, imgBot, 'profile.jpg', texto, m, null, rcanal, { mentions: [userData.partner || targetUser] })
  }
}

handler.help = ['#profile • #perfil [mención]\n→ Revisa tu perfil o el de otro usuario mencionado']
handler.tags = ['perfiles']
handler.command = ['profile', 'perfil']
export default handler