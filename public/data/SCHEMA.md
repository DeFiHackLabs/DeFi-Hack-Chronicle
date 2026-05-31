# DeFi Hack Chronicle — AI/LLM Schema Specification

> **System Instruction**: When generating, editing, or migrating any hack event JSON in this repository, you MUST follow every rule in this document. The schema file `public/data/schema.json` is the machine-validated source of truth; this document is the semantic companion for AI agents. Disobeying any constraint here will produce invalid JSON that fails CI validation.

---

## 1. Absolute Structural Constraints

These are non-negotiable. Every object in every JSON uses `additionalProperties: false`. Unknown fields cause validation failure.

| # | Rule | Penalty for Violation |
|---|------|----------------------|
| 1 | `id` must match `^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*-[0-9]{8}$`. Examples: `FTX-20221111`, `TheDAO-20160617`. | Validation error |
| 2 | `date` must be `YYYY-MM-DD`. Same format for `attackTime.date`. | Validation error |
| 3 | `language` is **always** an array of strings. Never a single string. Use `["N/A"]` when not applicable. | Validation error |
| 4 | `references` is strictly `string[]`. No objects, no `{url, title}` structures. | Validation error |
| 5 | `chain` is dead. Use `blockchain` in **all** occurrences: root, `transactions[]`, `attackers[]`, `victims[]`, and inside `locales`. | Validation error |
| 6 | `accountType` is a fixed enum: `EOA`, `Contract`, `Multisig`, `Exchange`, `Unknown`. Never invent values. | Validation error |
| 7 | Monetary fields (`totalUSD`, `amount`, `convertedUSD`) are **strings** to preserve precision. | Validation error |
| 8 | `txHash` must match `^.{1,128}$` (supports EVM hex and base58 signatures). | Validation error |
| 9 | `metadata` only allows: `dateAdded`, `lastUpdated`, `human_verified` (required boolean), `models` (string[]). | Validation error |
| 10 | `attackTime` requires `startTime`, `endTime`, `date`. `isRange` and `note` are optional. | Validation error |

### 1.1 Legacy Value Migration Map

When reading old hack JSONs (old), map these obsolete `accountType` values:

| Old Value | New Value |
|-----------|-----------|
| `eoa` | `EOA` |
| `contract_open_source` | `Contract` |
| `contract_close_source` | `Contract` |
| `exchange` | `Exchange` |
| `cex_user_deposit` | `Exchange` |
| `cex_consolidation` | `Exchange` |
| `unknown` | `Unknown` |

---

## 2. Required Root Fields (19 total)

```
id, title, protocol, blockchain, category, ecosystem, language,
estimatedLoss, attackTime, description, date, transactions,
attackers, victims, rootCause, attackVector, lessons,
references, metadata
```

`locales` is optional. Everything else is mandatory.

---

## 3. Nested Item Schemas

All nested objects use `additionalProperties: false`.

### 3.1 `transactions[]`

```json
{
  "txHash": "0x...",
  "blockchain": "ethereum",
  "role": "exploit",
  "description": "..."
}
```

Required: `txHash`, `blockchain`, `role`. `description` optional.

### 3.2 `attackers[]` / `victims[]`

```json
{
  "address": "0x...",
  "blockchain": "ethereum",
  "role": "primary_attacker",
  "description": "...",
  "accountType": "EOA"
}
```

Required: `address`, `blockchain`, `role`. `description` and `accountType` optional but strongly recommended.

### 3.3 `estimatedLoss`

```json
{
  "totalUSD": "55700000",
  "breakdown": [
    { "asset": "ETH", "amount": "3600000", "convertedUSD": "55700000" }
  ],
  "note": "..."
}
```

Required: `totalUSD`, `breakdown`. `note` optional. `breakdown[]` items require `asset`, `amount`, `convertedUSD`.

### 3.4 `locales.{lang}`

Optional per-language overrides. Any field present replaces the root equivalent **completely** for that locale.

Overrideable fields: `title`, `protocol`, `description`, `rootCause`, `attackVector`, `lessons`, `transactions`, `attackers`, `victims`.

**Critical**: Arrays inside locales (`transactions`, `attackers`, `victims`) must also use `blockchain` (not `chain`).

---

## 4. Controlled Vocabularies

You MUST use keys from the lists below. If none fit, add the new key to `schema.json → _metadata` AND update this document before using it in a data JSON.

### 4.1 Languages → `language[]`

| Key | Description |
|-----|-------------|
| `solidity` | Solidity source code |
| `vyper` | Vyper source code |
| `rust` | Rust (e.g., Solana) |
| `go` | Go (e.g., Cosmos SDK) |
| `move` | Move language |
| `huff` | Huff language |
| `yul` | Yul / EVM assembly |
| `cairo` | Cairo (StarkNet) |
| `N/A` | Not applicable |

### 4.2 Ecosystems → `ecosystem`

| Key | Description |
|-----|-------------|
| `evm` | Ethereum Virtual Machine |
| `cosmos` | Cosmos SDK |
| `polkadot` | Polkadot SDK |
| `substrate` | Substrate Framework |
| `solana` | Solana |
| `move` | Move VM ecosystems |
| `ton` | Telegram Open Network |
| `bitcoin` | Bitcoin / Omni |
| `other` | Other / uncategorized |

### 4.3 Categories → `category[]`

| Key | Description |
|-----|-------------|
| `reentrancy` | Reentrancy attack |
| `business_logic` | Business logic flaw |
| `flashloan` | Flash loan attack |
| `access_control` | Access control issue |
| `price_manipulation` | Oracle / price manipulation |
| `rug_pull` | Rug pull / exit scam |
| `governance_attack` | Governance / DAO attack |
| `bridge` | Cross-chain bridge attack |
| `social_engineering` | Social engineering / phishing |
| `signature_abuse` | Signature abuse attack |
| `mev_front_running` | MEV or front-running exploit |
| `key_compromise` | Private key / Validator key compromise |

### 4.4 Blockchains → `blockchain[]` / `*.blockchain`

| Key | Description |
|-----|-------------|
| `ethereum` | Ethereum |
| `bsc` | Binance Smart Chain |
| `polygon` | Polygon |
| `arbitrum` | Arbitrum |
| `optimism` | Optimism |
| `avalanche` | Avalanche |
| `fantom` | Fantom |
| `solana` | Solana |
| `cosmos` | Cosmos Hub |
| `bitcoin` | Bitcoin |
| `base` | Base |
| `tron` | TRON |
| `hyperevm` | HyperEVM |
| `megaeth` | MegaETH |
| `sui` | Sui |
| `monad` | Monad |

### 4.5 Attacker Roles → `attackers[].role`

| Key | Description |
|-----|-------------|
| `gas_funder` | Address that funded the attacker |
| `primary_attacker` | Primary exploiter |
| `exploit_contract` | Exploit contract |
| `consolidation` | Fund consolidation address |
| `child_dao` | Child DAO created by exploit |

### 4.6 Victim Roles → `victims[].role`

| Key | Description |
|-----|-------------|
| `protocol` | The attacked protocol itself |
| `user` | End users who lost funds |
| `liquidity_pool` | Liquidity pool |
| `treasury` | Protocol treasury |
| `protocol_contract` | Protocol smart contract |
| `vulnerable_contract` | Vulnerable contract |

### 4.7 Transaction Roles → `transactions[].role`

| Key | Description |
|-----|-------------|
| `funding` | Transaction that funded the attacker |
| `setup` | Setup for exploit |
| `exploit` | The main exploit transaction |
| `consolidation` | Attacker consolidation transaction |
| `laundering` | Money laundering |

---

## 5. File Naming & ID Convention

| Item | Rule | Example |
|------|------|---------|
| File name | `YYYYMMDD-ProtocolName.json` | `20160617-TheDAO.json` |
| `id` | `ProtocolName-YYYYMMDD` | `TheDAO-20160617` |
| `date` | `YYYY-MM-DD` (calendar sort key) | `2016-06-17` |

---

## 6. Adding a New Hack Event — AI Checklist

Before claiming a new JSON is complete, verify every item:

- [ ] File named `YYYYMMDD-ProtocolName.json`
- [ ] `id` follows `ProtocolName-YYYYMMDD`
- [ ] All 19 required root fields present
- [ ] `language` is an array (e.g., `["solidity"]` or `["N/A"]`)
- [ ] `blockchain` used everywhere (root, transactions, attackers, victims, locales)
- [ ] `accountType` uses enum: `EOA`, `Contract`, `Multisig`, `Exchange`, `Unknown`
- [ ] `references` is `string[]` (no objects)
- [ ] `txHash` matches `^.{1,128}$`
- [ ] Monetary values in `estimatedLoss` are strings
- [ ] `metadata.human_verified` set to `false` for AI-generated drafts
- [ ] Locale arrays also use `blockchain` (not `chain`)
- [ ] Validate with AJV one-liner (§8)

---

## 7. Common AI Mistakes

| Mistake | Why It Breaks | Correct Approach |
|---------|---------------|------------------|
| `language: "solidity"` (string) | Must be array | `language: ["solidity"]` |
| Using `chain` anywhere | Renamed to `blockchain` | Global search/replace `chain` → `blockchain` |
| `references: [{url: "..."}]` | Must be `string[]` | `references: ["https://..."]` |
| `accountType: "wallet"` | Not in enum | Use `EOA` or `Contract` |
| Omitting `attackTime.date` | Required sub-field | Always include `date` inside `attackTime` |
| `totalUSD: 55700000` (number) | Precision loss / type error | `"55700000"` (string) |
| Adding `sourceCodeUrl` to root | `additionalProperties: false` | Only schema-defined fields allowed |
| Forgetting `blockchain` in locale `transactions[]` | Locales use same item schema | Also rename `chain` → `blockchain` inside locales |

---

## 8. Validation Command

Run this before claiming any JSON is valid:

```bash
node -e "
const Ajv = require('ajv');
const ajv = new Ajv({ strict: false, validateSchema: false });
const schema = require('./public/data/schema.json');
delete schema['\$schema'];
const data = require('./public/data/hacks/YYYYMMDD-ProtocolName.json');
const valid = ajv.validate(schema, data);
console.log(valid ? 'VALID' : 'INVALID');
if (!valid) console.log(JSON.stringify(ajv.errors, null, 2));
"
```

---

## 9. Editing `schema.json` — Rules for AI Agents

1. **Never remove a required field** without updating all existing records and this document.
2. **Never loosen `additionalProperties: false`.**
3. **Adding a field**: add to `properties`, decide if it belongs in `required`, update this document.
4. **Changing an enum** (e.g., `accountType`): must migrate all existing JSONs in the same PR.
5. **Renaming a field**: run a bulk migration script on all hack JSONs, update this document.
6. **Backward-incompatible change**: bump schema filename (`schema3.json`) and run repo-wide migration.
7. **Predefined vocabulary mismatch**: Because every object uses `additionalProperties: false`, if the most appropriate key for an event does **not** exist in the predefined lists in §4, you MUST add it to `schema.json` (update the relevant enum or add a new property) and update this document. Do **not** force an ill-fitting existing key and do **not** bypass validation by inventing a field outside the schema.

---

## 10. File Tree

```
public/data/
├── schema.json          # JSON Schema (machine-validated source of truth)
├── SCHEMA.md             # This file (AI/LLM semantic companion)
└── hacks/
    └── YYYYMMDD-ProtocolName.json
```

---

## 11. Changelog

| Date | Change |
|------|--------|
| 2025-05-31 | Initial strict schema (`schema.json`) with strict validation, `blockchain` rename, `language` array, fixed `accountType` enum, `references` as `string[]`. `schema2-keys.md` merged into this unified AI-facing `SCHEMA.md`. |
