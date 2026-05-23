# DeFi Hack Chronicle

DeFi 安全事件編年史 (Historical chronicle of DeFi security incidents)

[繁體中文](./README.zh_TW.md) | [日本語](./README.ja.md)

![Index Page](public/img/README-1.png)
![Chart Page](public/img/README-2.png)

---

## Project Introduction

DeFi Hack Chronicle is an online visual calendar website for recording and exploring major DeFi security incidents throughout history.

All major attack events can be browsed through the calendar page, filtered across multiple dimensions, and analyzed in depth. The earliest recorded incident dates back to The DAO hack in 2016.

Security researchers and developers can use this site to observe the impact of major DeFi security incidents on token prices, and quickly export structured historical event data (JSON) for security research or educational training.

---

## Key Features

- **Multiple View Modes** — Year / Month / Week views
- **Rich Filtering** — Filter by attack type (reentrancy, flash loan, price manipulation, etc.), blockchain, ecosystem, programming language, and custom date range
- **Detailed Event Analysis** — Each event includes root cause, attack vector, lessons learned, attacker/victim addresses, and on-chain transaction evidence
- **Multi-language Support** — Built-in English, Traditional Chinese, and Japanese UI, with per-event locale overrides
- **Market Cap Impact Observation** — `/chart` page displays crypto historical price trends with major event markers
- **Export Functionality** — Download filtered events as a JSON ZIP archive for further research
- **Static Data Driven** — Anyone can add an event to the chronicle by adding a single JSON file with no code changes (see [CONTRIBUTE.md](./CONTRIBUTE.md))

---

## Quick Start

For technical details, see [DEVELOPER.md](./DEVELOPER.md) (project structure, build instructions, deployment guide).

---

## Data Model

Each hack event is a JSON file (`public/data/hacks/YYYYMMDD-ProtocolName.json`) containing:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (e.g., `dao-2016`) |
| `title` | string | Event title |
| `protocol` | string | Attacked protocol name |
| `blockchain` | string[] | Affected chains (e.g., `["ethereum", "bsc"]`) |
| `category` | string[] | Attack types (e.g., `["reentrancy", "flashloan"]`) |
| `ecosystem` | string | VM ecosystem (`evm`, `solana`, `move`, etc.) |
| `language` | string | Smart contract language (`solidity`, `rust`, etc.) |
| `estimatedLoss` | object | USD loss amount and asset breakdown |
| `attackTime` | object | Attack start/end time, date |
| `description` | string | Event description |
| `rootCause` | string? | Vulnerability root cause |
| `attackVector` | string? | Attack vector |
| `lessons` | string[]? | Lessons learned |
| `references` | string[]? | Reference links (reports, post-mortems) |
| `transactions` | object[]? | On-chain transaction evidence |
| `attackers` | object[]? | Attacker address information |
| `victims` | object[]? | Victim address information |
| `locales` | object? | Per-language overrides (`zh-TW`, `ja`) |

Static JSON files must follow the schema specification; see [schema.json](./public/data/schema.json) for details.

---

## Contributing

Adding a new hack event to the chronicle requires **one JSON file** — no code changes needed.

Quick steps:
1. Fork the repo
2. Create `public/data/hacks/YYYYMMDD-ProtocolName.json`
3. Copy the template from [CONTRIBUTE.md](./CONTRIBUTE.md) and fill it in
4. Open a Pull Request

GitHub Actions automatically recompiles the index on push.

For the full contribution guide, see [CONTRIBUTE.md](./CONTRIBUTE.md).

---

## Special Thanks

Maintainer: [whiteberets.eth](https://github.com/finn79426)

Technical Advisor: [SunSec](https://x.com/1nf0s3cpt)

Data Sources: Community analysis reports, on-chain analysis, [DeFiHackLabs](https://github.com/DeFiHackLabs)
