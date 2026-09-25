import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { InfraiModerationClient } from "./infrai_moderation_client.js";
import { screenShipmentSubmission } from "./shipment_intake.js";

const apiKey = process.env.INFRAI_API_KEY;
const imagePath = process.argv[2];
const caption = process.argv.slice(3).join(" ");

if (!apiKey || !imagePath || !caption) {
  throw new Error("Usage: INFRAI_API_KEY=... npm run example -- ./proof.jpg 'Left at reception'");
}

const bytes = await readFile(imagePath);
const image = `data:image/jpeg;base64,${bytes.toString("base64")}`;
const decision = await screenShipmentSubmission({
  eventId: `delivery-${Date.now()}`,
  shipmentId: process.env.SHIPMENT_ID ?? "SHP-2048",
  eventType: "delivered",
  proof: { filename: basename(imagePath), image },
  caption
}, new InfraiModerationClient(apiKey));

console.log(JSON.stringify(decision, null, 2));
