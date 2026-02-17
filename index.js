require("dotenv").config()
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys")
const OpenAI = require("openai")

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("auth")

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message || msg.key.fromMe) return

        const sender = msg.key.remoteJid
        const text = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text

        if (!text) return

        if (!text.startsWith("!ai")) return

        const userPrompt = text.replace("!ai", "").trim()

        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "You are a smart, friendly WhatsApp AI assistant." },
                    { role: "user", content: userPrompt }
                ],
            })

            const reply = response.choices[0].message.content

            await sock.sendMessage(sender, { text: reply })

        } catch (err) {
            await sock.sendMessage(sender, { text: "Error connecting to AI." })
        }
    })
}

startBot()
