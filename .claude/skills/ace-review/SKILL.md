---
name: ace-review
description: 案件(requirement)に対する提案戦略を立案するメインエントリポイント。グラフの前例とjudgment(勝ちパターン)を統合し、引用付き戦略ブリーフ+スライド骨子+事前予測を出力する。トリガー例:「この案件の戦略を立てて」「提案作って」「エースならどうする」。
---

# ace-review — 戦略立案(reader)

役割: reader。手法B(前例検索)と手法A(judgment)を統合して、成功確率を最大化する
提案戦略を出す。**全ての判断に provenance(引用の鎖)を付ける** — これがこのブレインの価値。

## 手順

1. **契約を読む**: `agent/SCHEMA.md`。

2. **グラフ投入の確認**: 対象 requirement がグラフに存在するか確認:
   `MATCH (r:Requirement {id: $id}) RETURN r`
   **無ければ Skill tool で `brain-connect` を先に実行**してから続行する。

3. **前例の収集(手法B)**: requirement の赤い枝から共有 Attribute 経由で前例を引く:
   ```cypher
   MATCH (r:Requirement {id: $id})-[:HAS_ATTRIBUTE]->(a:Attribute)<-[:HAS_ATTRIBUTE]-(other:Requirement)
   MATCH (other)-[:ANSWERED_BY]->(p:Presentation)-[:RESULTED_IN]->(o:Outcome)
   OPTIONAL MATCH (p)-[:BACKED_BY]->(d:Data)
   RETURN other.id, count(DISTINCT a) AS shared, collect(DISTINCT a.value) AS via,
          p.id, p.summary, o.result, o.reason, collect(DISTINCT d.id) AS data
   ORDER BY shared DESC
   ```
   同一クライアント(`FROM_CLIENT` が同じ)の前例は別枠で必ず取得し、最優先で扱う。

4. **judgment の収集(手法A)**:
   - scope が合う active な judgment を Cypher で取得(global + client + industry)
   - `POST /vector-search` (type: Judgment) で requirement 原文に意味的に近いものも取得
   - `confidence` 降順で整理。`contradicted` / `retired` は使わない。

5. **統合 — 優先順位はこの順で固定**:
   1. 同一クライアントの具体的前例(成功も失敗も)
   2. scope が一致する judgment
   3. global な judgment
   矛盾したら上位が勝つ。採用しなかった下位の根拠も「不採用とその理由」として残す。

6. **アウトプット** — 3層で出す:

   ### A. 戦略ブリーフ(本体)
   判断ごとに1ブロック:
   - 判断内容(何をする / 何を避ける)
   - 根拠: `jdg-xxx (confidence 0.8, scope: client:cli-x) ← DERIVED_FROM: pres-yyy, out-zzz`
     の形式で **id の鎖を明示**。前例引用も同様に id で。
   - 使うべきデータ(前例が BACKED_BY していた Data ノードで今回も使えるもの)

   ### B. スライド骨子
   ブリーフの判断をスライド構成に落とす(1枚ごとに: 目的 / 載せる内容 / 根拠にした判断)。

   ### C. 事前予測(Prediction ノードとしてグラフに書き戻す)
   - `expects`: 成功すると予測する根拠(依拠した judgment)
   - `risks`: 失敗するとしたら何が原因か(類似の fail 前例から)
   - `(pred)-[:ABOUT]->(requirement)`、`(pred)-[:BASED_ON]->(各judgment)` を張り、
     `scored: false` で MERGE。**結果が出たとき brain-record がこれを採点する** —
     これがあるから confidence 更新が意味のある学習になる。

7. **リスク/反証セクション**: 類似する過去の fail(手順3で `result: 'fail'` のもの)を
   必ずブリーフ末尾に載せる。「この状況で過去に失敗した例と今回それを避ける手当て」。

## 注意

- 前例ゼロ・judgment ゼロでも落ちない: その場合は「ブレインに前例なし」と明示した上で
  一般論の提案を出し、predictionは confidence の低い仮説として登録する。
- 引用は必ず実在ノードの id。存在しない id を捏造しない(出力前に Cypher で存在確認)。
