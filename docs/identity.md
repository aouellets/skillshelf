# Identity & library ownership

How a person's installed-skill library stays attached to *them* across the web
app and the MCP connector — and how we reconcile the fact that one human can
arrive under several different identities.

## The identity token

Every user-owned row (`user_installs`, `user_pack_installs`, `user_favorites`,
`user_collections`, `skill_reviews`) is partitioned by a single text
`user_token`. There are two shapes:

| Token | Meaning | Source |
|---|---|---|
| `auth:<uuid>` | a signed-in Skill Me account | the OAuth `sub`, == `auth.users.id` |
| `mcp_<uuid>` | an anonymous connector | minted by `newSubject()` when connecting without signing in |

The web app derives `auth:<id>` from the Supabase session
(`lib/userToken.ts`); the MCP endpoint derives the token from the OAuth bearer
(`app/api/mcp/route.ts` → `verifyAccessToken`). **Identity is fixed once, at the
OAuth authorize step** (`app/api/oauth/authorize/route.ts`): if you're signed in
to skillme.dev *in that browser* when the consent screen runs, the grant binds
`auth:<id>` and the connector shares the website's library forever. If not, it
mints a throwaway `mcp_<uuid>` and that connector's installs are stranded from
your account.

## Why fragmentation happens

The same person can end up with several tokens:

- **Connected anonymously first.** Clicked "Continue without signing in" (or
  wasn't signed into skillme.dev when authorize ran) → an `mcp_<uuid>` library.
- **Different login emails/providers.** Signed in once with GitHub (email A) and
  once with email/password (email B). Supabase treats distinct emails as
  **distinct `auth.users`** → two `auth:<uuid>` libraries.
- **Claude account email ≠ Skill Me email.** The Claude account a connector runs
  inside is unrelated to the Skill Me login; only the Skill Me OAuth identity
  decides `user_token`.

## How we reconcile it

### 1. Anonymous → account (automatic)

`authorize` drops a 90-day `skillme_anon_sub` cookie naming the anonymous
subject. The next time that browser authorizes **while signed in**, it calls
`mergeAnonLibrary(anonSub, accountToken)` and folds the stranded library into the
account. Requires the same browser within 90 days.

### 2. The merge primitive (any token → any token)

`public.merge_user_library(p_from, p_to)` (migration 0014, SECURITY DEFINER,
service-role only) re-keys **every** user-owned table conflict-safely in one
place: the target row always wins, source duplicates are dropped, and a re-run
is a no-op. It works for `mcp_→auth:` **and** `auth:→auth:` (account merges).
`mergeAnonLibrary` delegates to it, so the automatic reclaim now covers packs,
favorites, collections, and reviews — not just installs.

Manual/admin use (e.g. merging two accounts the same person created):

```sql
select public.merge_user_library('auth:<old-id>', 'auth:<keep-id>');
-- returns {"user_installs":N,"user_pack_installs":N,...}
```

### 3. Multi-email accounts (the durable fix)

To stop *creating* fragments in the first place:

- **Enable same-email identity linking** in Supabase Auth
  (Dashboard → Authentication → settings: link identities with the same email).
  Then GitHub-login and email-login that share an email resolve to one
  `auth.users` automatically — no merge needed for the common case.
- **Self-serve "Connected logins"** (proposed, not yet built): a signed-in user
  links another provider via `supabase.auth.linkIdentity()`, attaching that login
  to their existing `auth.users.id`. Future logins via that provider hit the same
  library. Already-separate accounts are reconciled with `merge_user_library`.

## Operational checklist

- Library empty after signing in? The installs are under a different token. Find
  it: match the connector's `list_installed` output (or recent
  `telemetry_events.user_token`) to a `user_token` in `user_installs`, then
  `merge_user_library(<that>, 'auth:<your-id>')`.
- A connector that should be signed-in still shows `mcp_<uuid>` in
  `telemetry_events` → the OAuth consent ran anonymously. Remove + re-add the
  connector **while signed into skillme.dev** and choose "Sign in to sync my
  skills" so authorize binds `auth:<id>` (and auto-merges via the cookie).
