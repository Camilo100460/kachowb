let handler = async () => {}

handler.before = async function (m) {
  if (m.isBaileys && m.fromMe) return
  if (m.isGroup || m.fromMe) return
  if (!m.message) return

  m.commandExecuted = true
}

handler.command = []

export default handler
