import { Queue } from "bullmq";

const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

export const whatsappQueue = new Queue("whatsappQueue", {
  connection: redisOptions,
});

whatsappQueue.on("error", () => {
  // Gracefully handle offline Redis without crashing process
});

export async function enqueueWhatsAppMessage(payload: any) {
  const targetNumber = process.env.WHATSAPP_TARGET_NUMBER || "120363433941861599@g.us";
  const openWaServer = process.env.OPENWA_SERVER_URL || "http://localhost:8080/sendText";
  const waApiKey = process.env.WHATSAPP_API_KEY || "cybotz_wa_key_2026";
  const messageText = payload.messageText || `*New Cybotz Event for ${payload.phone || "Unknown"}*`;

  try {
    await whatsappQueue.add("sendWhatsApp", payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
    console.log(`[Queue] Job enqueued for ${payload.phone || "group chat"}`);
  } catch (err: any) {
    console.warn(`[Queue] Redis offline (${err.message}). Sending directly to WhatsApp API engine...`);
    try {
      const resp = await fetch(openWaServer, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": waApiKey,
        },
        body: JSON.stringify({
          chatId: targetNumber,
          content: messageText,
          to: targetNumber,
        }),
      });
      if (resp.ok) {
        console.log(`[WhatsApp Direct] Message successfully dispatched to ${targetNumber}`);
      } else {
        const errorText = await resp.text();
        console.warn(`[WhatsApp Direct Warning] API responded with ${resp.status}: ${errorText}`);
      }
    } catch (directErr: any) {
      console.error("[WhatsApp Direct Error] Could not reach WhatsApp engine:", directErr.message);
    }
  }
}

