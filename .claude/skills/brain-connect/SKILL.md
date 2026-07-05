---
name: brain-connect
description: 新しい案件・要件(requirement)をブレインのグラフに投入し、要素分解して既存ノードに接続する(赤い枝を張る)。トリガー例:「この案件をグラフに入れて」「requirementを登録」「新しい依頼が来た」。案件テキストまたはファイルパスを引数に取る。
---

# brain-connect — requirement のグラフ投入と接続

役割: writer。新しい requirement をノード化し、要素分解した各要素を
既存の Attribute / Client ノードへ `HAS_ATTRIBUTE` / `FROM_CLIENT` で接続する。
この接続(赤い枝)が /ace-review の前例検索の起点になる。

## 手順

1. **契約を読む**: `agent/SCHEMA.md` を読む。ラベル・エッジ・id 規約はそこに従う。

2. **要素分解**: requirement の原文から以下を抽出する(無いものはスキップ):
   - クライアント(誰からの依頼か)
   - ターゲット層(segment: 例「50代女性 年収500万」)
   - 業界(industry)
   - 目的(goal: 認知獲得 / 販売促進 / ブランディング…)
   - 納品形式(deliverable: 提案書 / TVCM企画 / キャンペーン…)
   - 予算感(budget)・時期(timing)

3. **繋ぎ先の探索**: 各要素について既存ノードを探す。
   - まず Cypher で完全一致・近い値を確認:
     `MATCH (a:Attribute {kind: $kind}) RETURN a.id, a.value`
   - 候補が多い/表記ゆれがありそうなら `POST /vector-search` で意味検索。
   - **判断基準**: 意味的に同じなら既存ノードを使う(例:「F50」と「50代女性」は同一)。
     確信が持てない場合のみ新規 Attribute を作る。ノードの乱造は前例検索を壊す。

4. **書き込み**: SCHEMA.md の二重書き込みルールに従い、
   - Requirement ノードを MERGE(`raw` に原文全文)+ Weaviate upsert
   - 新規 Attribute があれば MERGE
   - `FROM_CLIENT` / `HAS_ATTRIBUTE` エッジを張る

   ```cypher
   MERGE (r:Requirement {id: $id})
     SET r.title = $title, r.raw = $raw, r.created = $created
   WITH r
   MATCH (a:Attribute {id: $attrId})
   MERGE (r)-[:HAS_ATTRIBUTE]->(a)
   ```

5. **報告**: 以下を必ず出力する:
   - 作成した requirement の id
   - 張った枝の一覧(既存ノードへの接続 / 新規作成したノード を区別して)
   - この接続によって間接的に繋がった過去案件(共有 Attribute 経由で 1 ホップの
     Requirement)があれば列挙 — これが「グラフに入れた瞬間に前例が見える」画になる

## 注意

- requirement 同士を直接繋がない。接続は必ず Attribute / Client 経由。
  類似性 = 共有する隣接ノード数、という説明可能な形を保つ。
- 書き込みは全て MERGE。実行した Cypher はそのまま応答に含める(検査可能性のため)。
