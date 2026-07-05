---
name: brain-record
description: プレゼンの結果(受注/失注、success/fail)とその理由をブレインに記録し、その場で学習(brain-learn の差分更新)まで走らせる。トリガー例:「クライアントXの結果を記録して」「勝った/負けたので記録」「コンペの結果が出た」。
---

# brain-record — 結果の記録と即時学習

役割: writer + 学習トリガー。Outcome を記録した瞬間にブレインが学習する、を1コマンドで実現する。

## 手順

1. **契約を読む**: `agent/SCHEMA.md` を読む。

2. **対象の特定**: どの presentation の結果かを特定する。
   `MATCH (p:Presentation) RETURN p.id, p.title` で候補を出し、曖昧ならユーザーに確認。
   presentation 自体が未登録なら、先に Presentation ノード(と ANSWERED_BY / FOR_CLIENT /
   BACKED_BY エッジ)を MERGE してから進む。

3. **Outcome の記録**:
   - `result`(success | fail)と `reason` を確定する。**reason は必ず聞き出すか原文から
     抽出する** — 理由のない outcome は学習に使えない(帰属問題)。
   - Outcome ノードを MERGE し、`(Presentation)-[:RESULTED_IN]->(Outcome)` を張る。

   ```cypher
   MERGE (o:Outcome {id: $id})
     SET o.title = $title, o.result = $result, o.reason = $reason, o.created = $created
   WITH o
   MATCH (p:Presentation {id: $presId})
   MERGE (p)-[:RESULTED_IN]->(o)
   ```

4. **予測の採点**: この requirement に対する Prediction ノード(`scored: false`)が
   あるか確認:
   ```cypher
   MATCH (pred:Prediction {scored: false})-[:ABOUT]->(:Requirement)-[:ANSWERED_BY]->(p:Presentation {id: $presId})
   MATCH (pred)-[:BASED_ON]->(j:Judgment)
   RETURN pred, collect(j.id) AS judgments
   ```
   あれば予測と実際の結果を突き合わせ、当たった/外れた judgment を特定して
   `scored: true` に更新。この採点結果を次ステップの brain-learn に引き継ぐ。

5. **即時学習**: Skill tool で `brain-learn` を呼び出す。
   args に outcome の id(と、あれば採点結果)を渡す。差分更新モードで動く。

6. **報告**: 記録した outcome、採点した prediction、brain-learn が更新/新規作成した
   judgment を一覧で出力する。
