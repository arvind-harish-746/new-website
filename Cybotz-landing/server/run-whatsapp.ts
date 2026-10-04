import "dotenv/config";
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import express from "express";

const app = express();
app.use(express.json());

let waSock: ReturnType<typeof makeWASocket> | null = null;
let isConnected = false;

console.log("[WHATSAPP] Starting CYBOTZ WhatsApp Automation (Baileys Engine)");

async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth_session");

  waSock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  waSock.ev.on("creds.update", saveCreds);

  waSock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n--------------------------------------------------");
      console.log("SCAN THIS QR CODE WITH YOUR WHATSAPP PHONE APP:");
      console.log("--------------------------------------------------\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      isConnected = true;
      console.log("\n--------------------------------------------------");
      console.log("[WHATSAPP] CONNECTED & READY TO SEND MESSAGES!");
      console.log("--------------------------------------------------\n");
    }

    if (connection === "close") {
      isConnected = false;
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[WHATSAPP] Connection closed (reason code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(startWhatsApp, 3000);
      } else {
        console.log("[WHATSAPP] Logged out. Delete 'baileys_auth_session' folder and restart to scan new QR code.");
      }
    }
  });
}

// V7: API Key Authentication for WhatsApp Runner (supports Header 'x-api-key' or Query Param '?apiKey=...')
const verifyApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = (req.headers["x-api-key"] as string) || (req.query.apiKey as string) || (req.query.key as string) || (req.query.api_key as string) || (req.query.apikey as string);
  const requiredKey = process.env.WHATSAPP_API_KEY || "cybotz_wa_key_2026";

  if (!apiKey || apiKey !== requiredKey) {
    return res.status(401).json({ error: "Unauthorized. Invalid API key. Send header 'x-api-key' or append '?apiKey=cybotz_wa_key_2026' in browser." });
  }

  next();
};

// GET /groups endpoint to list all joined WhatsApp groups and their Group IDs
app.get("/groups", verifyApiKey, async (_req, res) => {
  if (!waSock || !isConnected) {
    return res.status(503).json({ error: "WhatsApp client is not connected yet." });
  }

  try {
    const groupFetch = await waSock.groupFetchAllParticipating();
    const groups = Object.values(groupFetch).map((g) => ({
      id: g.id,
      subject: g.subject,
      participantsCount: g.participants.length,
    }));
    return res.status(200).json({ groups });
  } catch (err: any) {
    console.error("[WhatsApp Group Error]", err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.post("/sendText", verifyApiKey, async (req, res) => {
  const { chatId, content, to } = req.body;
  const rawTarget = to || chatId || "";

  if (!rawTarget || !content) {
    return res.status(400).json({ error: "Target (to/chatId) and content message are required." });
  }

  if (!waSock || !isConnected) {
    return res.status(503).json({ error: "WhatsApp client is not connected yet. Please scan the QR code in terminal." });
  }

  // Format JID for Baileys:
  // - If it ends with @g.us or contains @g.us, it's a Group Chat ID.
  // - Otherwise, strip non-digits and append @s.whatsapp.net for individual phone numbers.
  const jid = rawTarget.includes("@g.us")
    ? rawTarget
    : `${rawTarget.replace(/\D/g, "")}@s.whatsapp.net`;

  try {
    const result = await waSock.sendMessage(jid, { text: content });
    console.log(`[WhatsApp Baileys] Message sent successfully to ${jid}`);
    return res.status(200).json({ success: true, result });
  } catch (err: any) {
    console.error(`[WhatsApp Baileys Error]`, err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /status endpoint to check connection state (Public health check)
app.get("/status", (_req, res) => {
  return res.status(200).json({
    status: isConnected ? "connected" : "disconnected",
    apiKeyConfigured: Boolean(process.env.WHATSAPP_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.WHATSAPP_PORT || 8080;
app.listen(PORT, () => {
  console.log(`[WHATSAPP] API Server listening on http://localhost:${PORT}/sendText`);
  console.log(`[WHATSAPP] Fetch WhatsApp Group IDs (Browser): http://localhost:${PORT}/groups?apiKey=${process.env.WHATSAPP_API_KEY || "cybotz_wa_key_2026"}`);
  console.log(`[WHATSAPP] Status Health Check: http://localhost:${PORT}/status`);
  console.log(`[WHATSAPP] API Key Protection: ${process.env.WHATSAPP_API_KEY ? "CONFIGURED (Header 'x-api-key' required)" : "DISABLED (Set WHATSAPP_API_KEY in .env)"}`);
});

startWhatsApp().catch((err) => console.error("Initialization error:", err));
