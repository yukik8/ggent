---
name: brain-learn
description: outcome(success/fail)からブレインの勝ちパターン(Judgment)を更新する学習エンジン。引数に outcome id を渡すと差分更新、--full-scan で全体照合。通常は brain-record から自動で呼ばれる。トリガー例:「学習して」「judgmentを更新」「full scan」。
---

# brain-learn — judgment の抽出と更新

役割: 手法A。グラフの success/fail から一般化可能なルール(Judgment)を掘り、
confidence を証拠に基づいて上下させる。**全体スキャンはしない** — 渡された outcome の
近傍だけを見る差分更新が基本。

## モード判定

- args に outcome id → **差分更新モード**
- args に `--full-scan` → **全体照合モード**

## 差分更新モード

1. **契約を読む**: `agent/SCHEMA.md`(特に Judgment のライフサイクル)。

2. **近傍の取得**: outcome から depth 2-3 を traverse:
   ```cypher
   MATCH (o:Outcome {id: $outId})<-[:RESULTED_IN]-(p:Presentation)
   OPTIONAL MATCH (p)-[:BACKED_BY]->(d:Data)
   OPTIONAL MATCH (p)-[:FOR_CLIENT]->(c:Client)
   OPTIONAL MATCH (req:Requirement)-[:ANSWERED_BY]->(p)
   OPTIONAL MATCH (req)-[:HAS_ATTRIBUTE]->(a:Attribute)
   OPTIONAL MATCH (draft:Presentation)-[:REVISED_TO]->(p)
   RETURN o, p, collect(DISTINCT d), c, req, collect(DISTINCT a), draft
   ```
   draft→final の差分(REVISED_TO)は最も濃い証拠。エースが何を直したかがそこにある。

3. **帰属チェック**: `o.reason` を読む。理由が資料内容と無関係(価格・関係性・
   タイミング等)なら、**judgment の更新はせず**その旨を報告して終了。

4. **既存 judgment との照合**: 近傍のスコープに合う active な judgment を取得:
   ```cypher
   MATCH (j:Judgment {status: 'active'})
   WHERE j.scope = 'global' OR j.scope = 'client:' + $clientId OR j.scope = 'industry:' + $industry
   RETURN j
   ```
   加えて `POST /vector-search` (type: Judgment) で近傍の内容に意味的に近い judgment も引く。
   各 judgment をこの outcome が**支持 / 矛盾 / 無関係**のどれかに分類する。

5. **更新の書き込み**(SCHEMA.md の規則通り):
   - 支持: `confidence +0.1`(上限 0.95)+ `SUPPORTED_BY` エッジ
   - 矛盾: `confidence -0.2` + `CONTRADICTED_BY` エッジ、`< 0.3` なら `status: 'contradicted'`
   - brain-record から予測の採点結果が渡されていれば、それも同じ規則で反映
     (予測が当たった judgment は支持、外れた judgment は矛盾として扱う)

6. **新規 judgment の抽出**: 既存で説明できないパターンがあれば新規作成。
   - `statement` は「条件 → 行動 → 結果」の形で一般化する
     (例:「小売クライアントのコンペでは、スライド1でターゲットインサイトを提示する」)
   - `scope` は証拠が及ぶ範囲に限定する。1件の証拠で `global` にしない。
   - `confidence: 0.5`、`DERIVED_FROM` を証拠ノード全てに張る。
   - 二重書き込み(Weaviate の Judgment コレクションへ upsert)を忘れない。
   - **fail 由来のアンチパターンも対等に抽出する**(「〜してはいけない」も judgment)。

7. **報告**: 更新した judgment(id / 変化 / 理由)と新規 judgment を一覧で出力。

## 全体照合モード(--full-scan)

差分更新が拾えない横断パターンの回収。週次バッチ想定。

1. 全 outcome と全 judgment を取得し、複数クライアント・複数案件にまたがる
   共通パターンを探す(同じ Attribute を持つ requirement 群の成否の偏り、など)。
2. 既存 judgment の confidence を証拠エッジ数から再計算し、乖離があれば修正。
3. `contradicted` の judgment を再評価 — その後の証拠で復活し得るなら `active` に戻す。
4. 類似 judgment の統合(scope 違いの同一ルールは広い scope に併合)。
5. 変更は全て報告に含める。
