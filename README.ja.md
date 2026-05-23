# DeFi Hack Chronicle

DeFi 安全事件編年史

[English](./README.md) | [繁體中文](./README.zh_TW.md)

![Index Page](public/img/README-1.png)
![Chart Page](public/img/README-2.png)

---

## プロジェクト概要

DeFi Hack Chronicle は、歴史上の重大な DeFi セキュリティ事件を記録・探索するためのオンライン視覚化カレンダーサイトです。

すべての主要な攻撃イベントは、カレンダーページから閲覧、多次元フィルタリング、詳細な事件分析が可能です。最も古い記録は 2016 年の The DAO 事件から始まります。

セキュリティ研究者や開発者は、このサイトを通じて DeFi の重大セキュリティ事件が仮想通貨の価格に与える影響を観察し、構造化された履歴イベントデータ（JSON）を迅速にエクスポートして、セキュリティ研究や教育トレーニングに活用できます。

---

## 主な機能

- **複数のビューモード** — 年 / 月 / 週ビュー
- **豊富なフィルタリング** — 攻撃イベントの種類（リエントランシー攻撃、フラッシュローン攻撃、価格操作など）、ブロックチェーン、エコシステム、プログラミング言語、カスタム日付範囲でフィルタリング
- **詳細な事件分析** — 各事件に根本原因、攻撃手法、学んだ教訓、攻撃者／被害者アドレス、オンチェーントランザクション証拠を含む
- **多言語サポート** — 英語、繁体字中国語、日本語の UI を内蔵。イベントごとの言語上書きに対応
- **時価総額影響の観察** — `/chart` ページで暗号資産の過去の価格推移を表示し、主要イベントの時点をマーキング
- **エクスポート機能** — フィルタ条件に一致するイベントを JSON ZIP アーカイブとして一括ダウンロード
- **静的データ駆動** — JSON ファイルを1つ追加するだけでコード変更なしに編年史にイベントを追加可能（詳細は [CONTRIBUTE.md](./CONTRIBUTE.md) を参照）

---

## クイックスタート

技術詳細は [DEVELOPER.md](./DEVELOPER.md)（プロジェクト構成、ビルド手順、デプロイ方法）をご参照ください。

---

## データモデル

各ハックイベントは1つの JSON ファイル（`public/data/hacks/YYYYMMDD-ProtocolName.json`）で構成され、以下の情報を含みます：

| フィールド | 型 | 説明 |
|------------|-----|------|
| `id` | string | 一意の識別子（例：`dao-2016`） |
| `title` | string | イベントタイトル |
| `protocol` | string | 攻撃されたプロトコル名 |
| `blockchain` | string[] | 影響を受けたブロックチェーン（例：`["ethereum", "bsc"]`） |
| `category` | string[] | 攻撃タイプ（例：`["reentrancy", "flashloan"]`） |
| `ecosystem` | string | VM エコシステム（`evm`、`solana`、`move` など） |
| `language` | string | スマートコントラクト言語（`solidity`、`rust` など） |
| `estimatedLoss` | object | 米ドルでの損失額と資産内訳 |
| `attackTime` | object | 攻撃開始／終了時刻、日付 |
| `description` | string | 事件の説明 |
| `rootCause` | string? | 脆弱性の根本原因 |
| `attackVector` | string? | 攻撃手法 |
| `lessons` | string[]? | 学んだ教訓 |
| `references` | string[]? | 参考リンク（レポート、ポストモーテム） |
| `transactions` | object[]? | オンチェーントランザクション証拠 |
| `attackers` | object[]? | 攻撃者のアドレス情報 |
| `victims` | object[]? | 被害者のアドレス情報 |
| `locales` | object? | 言語別上書き（`zh-TW`、`ja`） |

静的 JSON ファイルは Schema の仕様に従う必要があります。詳細は [schema.json](./public/data/schema.json) を参照してください。

---

## コントリビューションガイド

編年史に新しいハックイベントを追加するには、**JSON ファイル1つ** だけで十分です — コードの変更は一切不要です。

クイックステップ：
1. リポジトリをフォーク
2. `public/data/hacks/YYYYMMDD-ProtocolName.json` を作成
3. [CONTRIBUTE.md](./CONTRIBUTE.md) のテンプレートをコピーして記入
4. Pull Request を作成

GitHub Actions が push 時にインデックスを自動コンパイルします。

完全なコントリビューションガイドは [CONTRIBUTE.md](./CONTRIBUTE.md) をご覧ください。

---

## 特別謝辞

メンテナー: [whiteberets.eth](https://github.com/finn79426)

技術顧問: [SunSec](https://x.com/1nf0s3cpt)

データソース：コミュニティ分析レポート、オンチェーン分析、[DeFiHackLabs](https://github.com/DeFiHackLabs)
