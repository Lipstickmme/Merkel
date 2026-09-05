# Rebuilding this stack on another site

Ported from the tested build at `Lipstickmme/hospital`. The schema, the
security model and the email plumbing transfer unchanged; the front end here is
static HTML and vanilla JS rather than TanStack Start, so the client-side parts
are written differently while making the same decisions.

## File structure

```
supabase/
  migrations/0001_init.sql   admins, is_admin(), item_status, enquiries,
                             chat_sessions, chat_messages, touch trigger,
                             realtime publication
  migrations/0002_email.sql  email_threads, email_messages, touch trigger
  grant-admin.sql            one-off: make yourself an admin
src/
  utils/
    config.js                resolves env under every accepted name; knows
                             which addresses are "ours" and whether FORWARD_TO
                             would loop
    supabase.js              service-role PostgREST client (server only)
    storage.js               enquiries: Supabase, or local files in dev
    chatStore.js             chat transcripts: Supabase, or local files
    notify.js                Resend send + optional desk webhook
    webhookSignature.js      Svix HMAC over the raw request bytes
  controllers/
    systemController.js      /api/public-config, /api/health
    contactController.js     validation, honeypot, write, notify
    chatController.js        rule-based responder + notification
    inboundController.js     signed webhook -> email_threads -> forward
  routes/                    mounted under /api
  site/                      build-time page source (layout.js, pages.js)
public/                      generated pages, CSS, JS, assets
api/[...path].js             Vercel serverless entry (the whole API)
```

## The five decisions that matter

1. **Visitors authenticate anonymously.** `signInAnonymously()` gives each
   visitor a real `auth.uid()`, so RLS grants them their own chat and nothing
   else, with no token scheme of our own and no service-role key in the
   browser. Requires enabling Anonymous under Authentication, Providers.
   *Schema and `/api/public-config` are in place; the widget does not use them
   yet (see Status).*

2. **Forms never touch the database from the browser.** `enquiries` has no anon
   policy at all; writes go through `POST /api/contact`, which holds the
   service-role key. A leaked anon key cannot stuff the inbox. **Done.**

3. **Chat rows are written from the browser**, under the visitor's own session,
   because RLS can express "your own session" precisely. The server is only
   used to send the staff notification. *Policies exist; the widget still posts
   through the server (see Status).*

4. **The browser's Supabase config is served at runtime** by
   `/api/public-config`, not inlined at build time, so no key needs a public
   prefix and no change needs a rebuild. **Done.**

5. **Realtime is `postgres_changes` under the same RLS**, so a visitor's
   subscription only ever delivers rows from their own session. *Tables are in
   the `supabase_realtime` publication; no client subscribes yet (see Status).*

## Status

Done and verified: the schema, the env contract, `/api/public-config`,
`/api/health` with its warnings, enquiry storage, and inbound mail filed onto
threads with the forward-loop guard.

Not yet built: the browser half. The chat widget still talks to
`/api/chat/message` and gets a rule-based reply, and there is no `/admin`
dashboard, so nobody can answer a visitor live. The database and endpoints are
ready for both.

## Traps this hit, worth pre-empting

- A bare `import "./x"` for its side effect is **tree-shaken away** when
  `package.json` has `"sideEffects": false`. Export a function and call it.
  *(Not applicable here: no bundler.)*
- A global middleware runs for *every* request, including the one that fetches
  config. Guard it, or it constructs a client with an empty URL and 500s the
  whole app. *(Checked here: malformed JSON returns 400, oversized 413, wrong
  content-type 422, and the server stays up.)*
- Vercel deploys the repository's **default branch**. Pushing to `main` when
  the default is something else deploys nothing.
- `FORWARD_TO` on your own domain loops mail back into the inbound webhook
  until the sending quota is gone. **Guarded**: `/api/health` warns, and the
  webhook refuses to forward to any address the site sends or receives as.
- A lockfile from a hosted builder can pin a **private registry** the deploy
  cannot authenticate to. *(This lockfile is public npm, `express` only.)*
- **Set `"framework": null` in `vercel.json`.** With `express` in
  `dependencies`, Vercel auto-detects a Node server preset and, after a
  perfectly successful build, looks for a server entrypoint in the output
  directory: `No entrypoint found in output directory: "public"`. Declaring no
  framework makes it serve `public/` statically with `api/` as functions. This
  one bit us for real.
- **`.vercelignore` matches at any depth.** A pattern like `data/` excludes
  `src/data/` too, so content the build reads never reaches the deploy and it
  dies on a file that is present locally. Anchor with a leading slash: `/data/`.
  `npm run check:vercel` simulates the upload and fails if anything the build
  requires would be excluded. This one bit us for real.
