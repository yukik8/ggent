# ggent — company brain

営業提案の「エースの判断」を組織のグラフ資産にするブレイン。
過去の requirement / presentation / outcome をグラフに蓄積し、
success/fail から勝ちパターン(Judgment)を学習、新案件の戦略立案に使う。

## アーキテクチャ

```
[skill 群 (.claude/skills/)]  ← エージェント層。オーケストレーションはここ
        │  curl
        ▼
[backend :3001]  Hono — POST /cypher, POST /vector-search (予定: POST /node)
        │                │
        ▼                ▼
[Memgraph :7687]   [Weaviate :8080]
 グラフ本体          セマンティック検索
 (Lab UI :3000)     (MiniLM ローカルベクトル化)
```

## 契約

**グラフを読み書きする前に必ず `agent/SCHEMA.md` を読むこと。**
ノードラベル・エッジ種・id 規約・judgment のライフサイクル・二重書き込みルールが
全てそこに定義されている。スキーマ外のラベルやエッジを発明しない。

## skill パイプライン

| skill | 役割 | 呼ばれ方 |
|---|---|---|
| `/ace-review` | 戦略立案(メインエントリ) | 人が起動。未投入の案件は内部で brain-connect を呼ぶ |
| `/brain-connect` | requirement のグラフ投入・接続 | ace-review から連鎖 or 単体起動 |
| `/brain-record` | 結果(success/fail)の記録 | 人が起動。内部で brain-learn を呼ぶ |
| `/brain-learn` | judgment の抽出・confidence 更新 | brain-record から連鎖。`--full-scan` で全体照合 |

ループ: ace-review が Prediction をグラフに書き → 結果が出たら brain-record が採点 →
brain-learn が judgment の confidence に反映 → 次の ace-review が賢くなる。

## 起動

```bash
docker compose up -d          # memgraph + weaviate + transformers
npm run dev -w backend        # :3001
```

## 開発メモ

- backend のエンドポイント実装は backend チーム担当。agent 側からの要求仕様は
  `agent/SCHEMA.md` の「バックエンドへの要求仕様」節。
- デモ前に `mg_data` ボリュームをバックアップ(生 Cypher が通るため)。
