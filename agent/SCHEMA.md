# Brain Schema Contract (v2 — Memgraph + Weaviate)

このファイルが agent 側 skill 群(writer/reader)とバックエンドの間の API 契約。
skill は必ずこのファイルを読んでからグラフを触ること。
ここに無いラベル・エッジ・プロパティ名を勝手に発明しない。

## ストア構成

| ストア | 役割 | アクセス手段 |
|---|---|---|
| Memgraph | グラフ本体(構造・provenance) | `POST http://localhost:3001/cypher` `{query, params}` |
| Weaviate | セマンティック検索(繋ぎ先候補の発見) | `POST http://localhost:3001/vector-search` `{type, query, limit}` |
| Memgraph Lab | グラフ可視化(デモ用) | http://localhost:3000 |

## ノードラベルとプロパティ

全ノード共通の必須プロパティ: `id`(下記規約), `title`, `created`(YYYY-MM-DD)

| ラベル | id接頭辞 | 追加プロパティ |
|---|---|---|
| `Client` | `cli-` | `industry` |
| `Requirement` | `req-` | `raw`(原文) |
| `Presentation` | `pres-` | `summary`, `version`: `draft` \| `final` |
| `Data` | `data-` | `summary`, `source` |
| `Outcome` | `out-` | `result`: `success` \| `fail`, `reason`(一行、クライアントのフィードバックに基づく) |
| `Judgment` | `jdg-` | `statement`(ルール本文), `confidence`(0.0-1.0), `status`: `active` \| `contradicted` \| `retired`, `scope`(適用範囲。`global` / `client:cli-x` / `industry:小売` など) |
| `Attribute` | `attr-` | `kind`: `segment` \| `industry` \| `goal` \| `deliverable` \| `budget` \| `timing` \| `other`, `value` |
| `Prediction` | `pred-` | `expects`(成功/失敗の予測と根拠一行), `risks`(想定される失敗理由), `scored`(bool, 初期値 false) |

id は kebab-case: 例 `req-clientx-2026-07`, `jdg-insight-first`, `attr-segment-f50-500`

## エッジ種(これ以外を作らない)

```
(Requirement)-[:FROM_CLIENT]->(Client)
(Requirement)-[:ANSWERED_BY]->(Presentation)
(Requirement)-[:HAS_ATTRIBUTE]->(Attribute)      ← 手法B「赤い枝」の実体
(Presentation)-[:FOR_CLIENT]->(Client)
(Presentation)-[:RESULTED_IN]->(Outcome)
(Presentation)-[:BACKED_BY]->(Data)
(Presentation)-[:REVISED_TO]->(Presentation)      ← draft → final
(Data)-[:ABOUT]->(Attribute)
(Judgment)-[:DERIVED_FROM]->(任意のノード)         ← provenance の鎖
(Judgment)-[:SUPPORTED_BY]->(Outcome)             ← 学習の支持証拠
(Judgment)-[:CONTRADICTED_BY]->(Outcome)          ← 学習の反証
(Prediction)-[:ABOUT]->(Requirement)
(Prediction)-[:BASED_ON]->(Judgment)
```

## Judgment のライフサイクル(/brain-learn が管理)

- 新規作成時: `confidence: 0.5`, `status: active`。必ず `DERIVED_FROM` を1本以上張る。
- 支持する Outcome が増えるたび `confidence +0.1`(上限 0.95)+ `SUPPORTED_BY` エッジ。
- 矛盾する Outcome が出るたび `confidence -0.2` + `CONTRADICTED_BY` エッジ。
- `confidence < 0.3` になったら `status: contradicted`。復活は full-scan の再評価でのみ。
- `scope` は必ず付ける。無条件に一般化できる確証がない限り `global` にしない。
- 帰属の注意: Outcome の `reason` が資料内容と無関係(価格・関係性・タイミング等)の場合、
  その Outcome は judgment の証拠として使わない(エッジを張らない)。

## 二重書き込みルール

テキストを持つノード(`Requirement`, `Judgment`, `Data`, `Presentation`)は
Memgraph への MERGE と同時に Weaviate の同名コレクションへ upsert する。
Weaviate オブジェクトは `{ gid: <グラフのid>, text: <検索対象テキスト> }` を持つ。
`gid` が検索ヒット→グラフ traverse への橋。

- `POST /node` が実装済みならそれを使う(1リクエストで両ストアに書く)。
- 404 なら `POST /cypher` のみで書き、応答に「vector index 未同期」と明記する。

## バックエンドへの要求仕様(未実装分)

1. `POST /node` — body: `{ label, id, props, text? }`。Memgraph に MERGE、
   text があれば Weaviate の label コレクションへ gid 付き upsert。
2. 起動時 ensure: Weaviate に `Requirement` / `Judgment` / `Data` / `Presentation`
   コレクションが無ければ作成。

## ルール

1. ノード作成は必ず `MERGE`(id で)。`CREATE` は使わない — 重複ノードがグラフを汚す。
2. skill の出力で judgment を引用するときは必ず `id` で引用し、
   その judgment の `DERIVED_FROM` 先も一緒に示す(provenance の鎖がデモの核)。
3. 破壊的 Cypher(`DETACH DELETE` 等)は skill からは実行しない。
4. デモ前に `docker compose` の `mg_data` ボリュームをバックアップすること。
