import { z } from "zod";
import type { ImageModerator } from "./infrai_moderation_client.js";

export const shipmentSubmissionSchema = z.object({
  eventId: z.string().min(1).max(80),
  shipmentId: z.string().min(1).max(80),
  eventType: z.enum(["picked_up", "in_transit", "delivered", "delivery_exception"]),
  proof: z.object({
    filename: z.string().min(1).max(180),
    image: z.string().min(1)
  }),
  caption: z.string().trim().min(1).max(280)
}).strict();

export type ShipmentSubmission = z.infer<typeof shipmentSubmissionSchema>;
export type ScreeningDecision = {
  eventId: string;
  shipmentId: string;
  state: "ready_to_publish" | "exception_review";
  reasons: Array<"image_flagged" | "caption_flagged">;
  proof: { filename: string; disposition: "accepted" | "held" };
};

const blockedCaptionTerms = ["weapon", "threat", "stolen"];

export function captionNeedsReview(caption: string): boolean {
  const words = new Set(caption.toLowerCase().match(/[a-z]+/g) ?? []);
  return blockedCaptionTerms.some((term) => words.has(term));
}

export async function screenShipmentSubmission(
  input: unknown,
  moderator: ImageModerator
): Promise<ScreeningDecision> {
  const submission = shipmentSubmissionSchema.parse(input);
  const imageResult = await moderator.moderate(submission.proof.image, submission.eventId);
  const reasons: ScreeningDecision["reasons"] = [];

  if (imageResult.flagged) reasons.push("image_flagged");
  if (captionNeedsReview(submission.caption)) reasons.push("caption_flagged");

  const accepted = reasons.length === 0;
  return {
    eventId: submission.eventId,
    shipmentId: submission.shipmentId,
    state: accepted ? "ready_to_publish" : "exception_review",
    reasons,
    proof: {
      filename: submission.proof.filename,
      disposition: accepted ? "accepted" : "held"
    }
  };
}
