import express from "express";
import { ZodError } from "zod";
import { InfraiError, InfraiModerationClient } from "./infrai_moderation_client.js";
import { screenShipmentSubmission } from "./shipment_intake.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

const app = express();
const moderator = new InfraiModerationClient(apiKey);
app.use(express.json({ limit: "12mb" }));

app.post("/shipment-events/screen", async (request, response) => {
  try {
    const decision = await screenShipmentSubmission(request.body, moderator);
    response.status(200).json(decision);
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "invalid_request", issues: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.status(status).json({ error: error.code });
      return;
    }
    response.status(500).json({ error: "internal_error" });
  }
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`shipment moderation listening on :${port}`));
