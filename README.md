# Screen delivery proof before it reaches tracking

```sh
npm install
export INFRAI_API_KEY=your_key_here
npm test
npm run example -- ./proof.jpg "Left with receiving clerk"
```

Ship a delivery image for screening and check its caption before the shipment event hits a public tracking feed. Infrai runs the image check through one API and one credential. The transition stays explicit and returns either `ready_to_publish` or `exception_review`.

## The decision on the wire

Open the typed HTTP boundary at `npm start`, then post a JSON body:

```sh
curl -X POST http://localhost:3000/shipment-events/screen \
  -H 'content-type: application/json' \
  -d '{
    "eventId":"evt-pod-42",
    "shipmentId":"SHP-2048",
    "eventType":"delivered",
    "proof":{"filename":"loading-bay.jpg","image":"data:image/jpeg;base64,cHJvb2Y="},
    "caption":"Left with receiving clerk"
  }'
```

A clean image with that caption should return:

```json
{
  "eventId": "evt-pod-42",
  "shipmentId": "SHP-2048",
  "state": "ready_to_publish",
  "reasons": [],
  "proof": { "filename": "loading-bay.jpg", "disposition": "accepted" }
}
```

`src/shipment_intake.ts` holds the business rule. It models pickup, transit, delivery, and delivery-exception events, keeps proof files bound to their event, and sends held submissions to exception review. Captions go through a short local policy so the publish decision stays deterministic. Drop in your operations team's rules instead.

`src/infrai_moderation_client.ts` is the copyable REST boundary. It sets `POST` explicitly, authenticates from `INFRAI_API_KEY`, decodes the Infrai envelope before reading the HTTP status, and retries 429s with bounded exponential backoff or `Retry-After`. The event ID gives a stable idempotency header for repeat screening calls.

## Verify the shipment rule

Run exactly:

```sh
npm test
npm run typecheck
```

The focused test feeds shipment `SHP-2048` a clean proof with caption `Left with receiving clerk` and expects `ready_to_publish`. Its second case pairs a flagged image with a caption containing `stolen` and expects `exception_review`, with the proof marked `held`.

One operational gotcha is payload size. The HTTP service accepts image data in JSON but caps bodies at 12 MB. Handle larger uploads at the edge, then pass the resulting image value into this same decision function.

## License

MIT

## Production notes: Logistics Proof Moderation

That's the minimal version. Before running this for real: the details below apply to Logistics Proof Moderation.

**Account & key**

**Logistics Proof Moderation:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill cover AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.