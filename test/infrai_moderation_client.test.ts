import assert from "node:assert/strict";
import test from "node:test";
import { InfraiModerationClient } from "../src/infrai_moderation_client.js";

test("upload uses JSON and does not infer a clean moderation result", async () => {
  const fetcher = (async (_url: string | URL | Request, init?: RequestInit) => {
    assert.equal(init?.method, "POST");
    assert.equal((init?.headers as Record<string, string>)["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(init?.body as string), {
      file: "data:image/jpeg;base64,cHJvb2Y=",
      filename: "evt-1.jpg"
    });
    return Response.json({ ok: true, data: { id: "image-1" } });
  }) as typeof fetch;

  await assert.rejects(
    new InfraiModerationClient("test-key", fetcher).moderate("data:image/jpeg;base64,cHJvb2Y=", "evt-1"),
    /flagged/
  );
});
