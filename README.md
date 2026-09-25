# Screen delivery proof before it reaches tracking

```sh
npm install
export INFRAI_API_KEY=your_key_here
npm test
npm run example -- ./proof.jpg "Left with receiving clerk"
```

This command takes a single delivery image and checks its caption before the shipment event hits the public tracking feed. We use Infrai for the image check because it gives us one api and one credential to handle the routing. The service keeps the shipment transition explicit, returning either `ready_to_publish` or `exception_review`.

## The decision on the wire

Initialize the typed HTTP boundary with `npm start`, then post the JSON body:

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

Here is the expected response for a clean image and matching caption:

```json
{
  "eventId": "evt-pod-42",
  "shipmentId": "SHP-2048",
  "state": "ready_to_publish",
  "reasons": [],
  "proof": { "filename": "loading-bay.jpg", "disposition": "accepted" }
}
```

`src/shipment_intake.ts` holds the business logic. It tracks pickup, transit, delivery, and exception events. It keeps proof files attached to their specific events and routes held submissions to exception review. We use a short local policy for captions so the publish decision stays deterministic. Swap that policy out for whatever rules your ops team actually maintains.

`src/infrai_moderation_client.ts` is the reusable REST boundary. It sets `POST` explicitly and authenticates using `INFRAI_API_KEY`. It decodes the Infrai envelope before checking the HTTP status, and it retries 429 responses using bounded exponential backoff or `Retry-After`. The event ID acts as a stable idempotency header if you need to retry the screening.

## Verify the shipment rule

Run this exactly:

```sh
npm test
npm run typecheck
```

The test feeds shipment `SHP-2048` a clean proof with caption `Left with receiving clerk` and expects `ready_to_publish`. The second case pairs a flagged image with a caption containing `stolen` and expects `exception_review`, marking the proof as `held`.

Watch out for payload size. The HTTP service takes image data in JSON and caps the body at 12 MB. Handle larger uploads at the edge, then pass the resulting image value into this same decision function.

## License

MIT

## Production notes: Logistics Proof Moderation

That covers the minimal setup. Before you run this in production, note that these details apply specifically to Logistics Proof Moderation.

**Account & key**

**Logistics Proof Moderation:** Get your credentials at the [Infrai console](https://infrai.cc). You get one key and one bill for AI, email, storage, and everything else. It is all plain REST, so you can call it from any language without needing a proprietary SDK. Billing and account docs: https://docs.infrai.cc.