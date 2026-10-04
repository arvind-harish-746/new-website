import { Worker } from "bullmq";
import "dotenv/config";

const redisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

console.log("[WORKER] Starting CYBOTZ WhatsApp Worker (BullMQ)");

const worker = new Worker("whatsappQueue", async (job) => {
  console.log(`[Worker] Processing job ${job.id}...`);
  
  const payload = job.data;
  
  const targetNumber = process.env.WHATSAPP_TARGET_NUMBER || "120363433941861599@g.us";
  const openWaServer = process.env.OPENWA_SERVER_URL || "http://localhost:8080/sendText";
  const waApiKey = process.env.WHATSAPP_API_KEY || "cybotz_wa_key_2026";

  const messageText = payload.messageText || `*New Cybotz Event for ${payload.phone || "Unknown"}*`;

  try {
    const response = await fetch(openWaServer, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": waApiKey,
      },
      body: JSON.stringify({
        chatId: targetNumber,
        content: messageText,
        to: targetNumber
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Baileys API error: ${response.status} ${errorText}`);
    }

    console.log(`[Worker] Job ${job.id} completed successfully.`);
  } catch (err: any) {
    console.error(`[Worker] Job ${job.id} failed:`, err.message);
    throw err; // triggers BullMQ retry
  }
}, { connection: redisOptions });

worker.on("failed", (job, err) => {
  if (job) {
    console.error(`[Worker] Job ${job.id} has failed with ${err.message}`);
  }
});

worker.on("error", (err: any) => {
  // Gracefully log Redis connection issues instead of crashing
  if (err.code === "ECONNREFUSED") {
    // Avoid spamming logs repeatedly
    return;
  }
  console.warn("[Worker Redis Warning]", err.message);
});
