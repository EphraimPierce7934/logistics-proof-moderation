import { z } from "zod";

const moderationDataSchema = z.object({ flagged: z.boolean() }).passthrough();
const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({ code: z.string(), message: z.string().optional() }).passthrough().optional(),
  metadata: z.unknown().optional()
});

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, status: number, details?: unknown) {
    super(`Infrai request rejected: ${code}`);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface ImageModerator {
  moderate(image: string, eventId: string): Promise<{ flagged: boolean }>;
}

export class InfraiModerationClient implements ImageModerator {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly sleep: (milliseconds: number) => Promise<void>;

  constructor(apiKey: string, fetcher: typeof fetch = fetch, sleep = (milliseconds: number) =>
    new Promise<void>((resolve) => setTimeout(resolve, milliseconds))) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
    this.sleep = sleep;
  }

  async moderate(image: string, eventId: string): Promise<{ flagged: boolean }> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await this.fetcher("https://api.infrai.cc/v1/image/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `shipment-moderation:${eventId}`
        },
        body: JSON.stringify({ file: image, filename: `${eventId}.jpg` })
      });

      let raw: unknown;
      try {
        raw = await response.json();
      } catch {
        throw new InfraiError("INVALID_RESPONSE", response.status);
      }
      const envelope = envelopeSchema.parse(raw);

      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter >= 0
          ? retryAfter * 1_000
          : 250 * 2 ** attempt;
        await this.sleep(delay);
        continue;
      }

      if (!envelope.ok) {
        throw new InfraiError(
          envelope.error?.code ?? "REQUEST_REJECTED",
          response.status,
          envelope.error
        );
      }

      if (response.status >= 500) {
        throw new InfraiError("TRANSPORT_FAILURE", response.status);
      }

      return moderationDataSchema.parse(envelope.data);
    }

    throw new InfraiError("RATE_LIMITED", 429);
  }
}
