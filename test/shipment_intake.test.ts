import assert from "node:assert/strict";
import test from "node:test";
import type { ImageModerator } from "../src/infrai_moderation_client.js";
import { screenShipmentSubmission } from "../src/shipment_intake.js";

function moderator(flagged: boolean): ImageModerator {
  return { moderate: async () => ({ flagged }) };
}

const delivery = {
  eventId: "evt-pod-42",
  shipmentId: "SHP-2048",
  eventType: "delivered",
  proof: { filename: "loading-bay.jpg", image: "data:image/jpeg;base64,cHJvb2Y=" },
  caption: "Left with receiving clerk"
};

test("clean delivery proof is ready to publish", async () => {
  const result = await screenShipmentSubmission(delivery, moderator(false));
  assert.equal(result.state, "ready_to_publish");
  assert.equal(result.proof.disposition, "accepted");
  assert.deepEqual(result.reasons, []);
});

test("flagged proof and caption are held as an exception", async () => {
  const result = await screenShipmentSubmission(
    { ...delivery, caption: "Package reported stolen at dock" },
    moderator(true)
  );
  assert.equal(result.state, "exception_review");
  assert.equal(result.proof.disposition, "held");
  assert.deepEqual(result.reasons, ["image_flagged", "caption_flagged"]);
});
