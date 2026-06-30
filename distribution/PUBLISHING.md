# Publishing to the official MCP Registry

The listing metadata is [`server.json`](./server.json). It validates against the
current registry schema (`2025-12-11`). What remains is a one-time publish, which
is **founder-gated** because it requires either a GitHub device login or a DNS
record — both tied to credentials/infra only the owner controls.

## ⚠️ Decision required: namespace ↔ auth are coupled

The registry derives the allowed `name` namespace from *how you authenticate*.
The brief asked for the name `dev.skillme/skillme` **and** "the GitHub-auth path."
Those two are mutually exclusive — you must pick one:

| Option | `name` in server.json | Auth method | What it costs |
| --- | --- | --- | --- |
| **A — GitHub (ready now)** | `io.github.aouellets/skillme` | `mcp-publisher login github` (device code) | Namespace shows the personal GitHub handle, not the brand |
| **B — Domain (branded)** | `dev.skillme/skillme` *(current draft)* | `mcp-publisher login dns` + an apex TXT record on `skillme.dev` | One DNS change; keeps the branded `dev.skillme` namespace |

`server.json` is currently set to **Option B** (`dev.skillme/skillme`). If you'd
rather publish immediately with GitHub auth, change `name` to
`io.github.aouellets/skillme` first.

## Install the CLI

```bash
# macOS (Homebrew)
brew install mcp-publisher
# …or download a release binary from
# https://github.com/modelcontextprotocol/registry/releases
```

## Option A — GitHub auth

```bash
mcp-publisher login github      # opens github.com/login/device — enter the code
mcp-publisher publish           # run from this directory (reads ./server.json)
```

## Option B — Domain auth (keeps dev.skillme/skillme)

```bash
# 1. Generate a keypair + the TXT record line
mcp-publisher login dns --domain skillme.dev   # prints the TXT record + a private key

# 2. Add the printed record to the APEX of skillme.dev (NOT a _selector subdomain):
#    skillme.dev.  IN  TXT  "v=MCPv1; k=ed25519; p=<PUBLIC_KEY>"
#    (In the Vercel/registrar DNS panel: host "@", type TXT, value the quoted string.)

# 3. After it propagates, log in with the private key it gave you, then publish:
mcp-publisher login dns --domain skillme.dev --private-key <PRIVATE_KEY>
mcp-publisher publish
```

## Verify the listing resolves

```bash
curl -s "https://registry.modelcontextprotocol.io/v0/servers?search=skillme" | jq .
```

## Notes
- Transport is `streamable-http` (single POST endpoint at `/api/mcp`, SSE-framed
  responses). The brief called it "SSE"; the registry term for this transport is
  `streamable-http`. The legacy two-endpoint `sse` type would mislead clients.
- Endpoint is `https://skillme.dev/api/mcp` — the canonical production URL used
  throughout the repo. (The brief's `skillshelf-ten.vercel.app` appears nowhere
  in the codebase and looks like a stale preview alias.)
