# narration-slides — 台本から自動生成する解説スライド動画

`script.json`（台本）を差し替えるだけで、**音声・字幕・図解アニメーションのタイミングが自動で決まる**解説スライド動画の生成パイプラインです。VOICEVOX Engine でナレーションを合成し、Remotion で 1920×1080 / 30fps の MP4 にレンダリングします。

- 1シーン = 1スライド。シーン内のカード・矢印・ボックスがセリフに同期して出現
- 画面下部中央に現在のナレーション文を字幕表示、左下に動画タイトルラベル
- シーン切り替えは短いクロスフェード、要素出現はフェード＋スライド（0.4秒・easeOut）

## 必要環境

- Node.js 18 以上
- VOICEVOX Engine（音声生成時のみ。後述）

## セットアップ

```bash
npm install
```

フォント（Noto Sans JP）は `public/fonts/` に同梱しているため、レンダリング時に外部通信は不要です。

## VOICEVOX Engine の起動

音声生成（`npm run audio`）の前に、http://localhost:50021 で VOICEVOX Engine を起動してください。

**Docker の場合**（公式イメージ・Windows / macOS / Linux 共通）

```bash
docker run -d --rm --name voicevox -p 127.0.0.1:50021:50021 voicevox/voicevox_engine:cpu-latest
```

- `-d` でバックグラウンド起動するので、起動後はそのまま同じターミナルで `npm run audio` が実行できます。停止は `docker stop voicevox`（`--rm` 付きなので停止時にコンテナも削除）
- **`-p` の値に引用符を付けないこと**: `-p '127.0.0.1:50021:50021'` のようにシングルクォートで囲むと、Windows の cmd.exe では引用符が値の一部として渡され、`docker: invalid IP address` エラーになります
- `docker daemon is not running` エラーが出るときは、先に Docker Desktop を起動してください

**デスクトップアプリの場合**: [VOICEVOX](https://voicevox.hiroshiba.jp/) を起動すれば、既定のポート 50021 でエンジンが立ちます（設定で「APIサーバー」を有効化）。

起動を確認:

```bash
curl http://localhost:50021/version
```

> エンジンなしでタイミングだけ確認したい場合は `npm run audio:mock` を使えます（無音WAV＋概算尺でタイムラインを生成）。

## 使い方（音声生成 → プレビュー → レンダリング）

```bash
# 1. 台本 (public/script.json) の各セリフを音声化し、timeline.json を作成
npm run audio

# 2. Remotion Studio でプレビュー（http://localhost:3000）
npm run dev

# 3. MP4 に書き出し → out/video.mp4
npm run render
```

台本を編集したら、**必ず `npm run audio` を再実行**してからプレビュー/レンダリングしてください（`timeline.json` が音声の実寸から再計算されます。未再生成の場合、Remotion 側で明確なエラーメッセージが出ます）。

## 台本の書き方（public/script.json）

```jsonc
{
  "scenes": [
    {
      "id": "flow",              // シーンID（音声ファイル名に使う）
      "layout": "flow",          // "title" | "compare" | "flow" | "inputOutput"
      "label": "FLOW",           // 左上の英字ラベル（省略可）
      "heading": "処理の流れ",    // 見出し（titleレイアウトでは省略）
      "content": { ... },        // レイアウトごとの中身（下表）
      "lines": [
        {
          "text": "ナレーション文（そのまま読み上げ・字幕に使われる）",
          "reveal": ["step-1"]   // このセリフの開始時に出現させる要素のID
        }
      ]
    }
  ]
}
```

### レイアウト種別と要素ID

| layout | content の中身 | reveal で使える要素ID |
|---|---|---|
| `title` | `kicker?` / `title` / `subtitle?`（濃紺背景＋白文字。要素は常時表示） | なし |
| `compare` | `leftTitle` / `rightTitle` / `left[]` / `right[]` — 各項目は `{ id, icon?, title, body?, tone? }`（`tone: "warning"` で控えめな赤） | 各項目の `id` |
| `flow` | `steps[]` — `{ id, icon?, title, body? }` | 各stepの `id` と、矢印 `arrow-1`〜`arrow-N-1`（自動付与） |
| `inputOutput` | `input` / `transform { id, label }` / `output` | `input.id`・`transform.id`・`output.id` と矢印 `arrow-1`, `arrow-2` |
| `bullets` | `items[]` — `{ id, icon?, title, body? }` の縦リスト | 各項目の `id` |
| `stats` | `items[]` — `{ id, value, label, body? }` の数字強調カード（2〜4枚） | 各項目の `id` |
| `section` | 章扉（濃紺背景）。`number?` / `title` / `subtitle?` | なし（常時表示） |
| `table` | 比較表。`headers[]`（`{ label, tone? }`）+ `rows[]` — `{ id, label, note?, cells: [{ text, tone? }] }` + `source?`。`tone` は `good`(青) / `bad`(赤) / `normal` | 各行の `id` |
| `bars` | 横棒グラフ。`items[]` — `{ id, label, value, display?, tone? }` + `caption?` | 各項目の `id` / `caption` |
| `checklist` | 番号付きチェックカード。`items[]` — `{ id, text, note? }` | 各項目の `id` |
| `axes` | 空の直角座標系の図解。`xAxis { label }` / `yAxis { label }` / `hint?` | `axes` / `hint` |

- `reveal` に書かれない要素IDは **シーン開始から常時表示** になります。
- シーンには `chapter`（左下の章タグ、例: `"chapter": "02 仕組み"`）と `badge`（右上のバッジ、例: `"badge": "おすすめ"`）を付けられます。
- `icon` に指定できるキーは約45種（`check` `search` `shield-check` `target` `chart-bar` `layers` など）。一覧は `src/components/IconBox.tsx` のレジストリを参照。未登録キーはプレースホルダー表示になります。
- `flow` の `steps` は2要素以上が必要です。

### アイコンの追加

`src/components/IconBox.tsx` の `REGISTRY` に `キー: LucideIcon` を追加するだけです。

## 設定（voicevox.config.json）

| キー | 既定値 | 説明 |
|---|---|---|
| `endpoint` | `http://localhost:50021` | VOICEVOX Engine のURL |
| `speakerId` | `3` | 話者（スタイル）ID。**3 = ずんだもん(ノーマル)** など。一覧は `curl http://localhost:50021/speakers` で確認できます |
| `speedScale` | `1.0` | 話速。1.2 などで速くなります |

## 台本の自動生成（プロンプト / URL から）

台本を手書きする代わりに、LLM で自動生成できます。OpenAI互換の Chat Completions API を使います。

```bash
export OPENAI_API_KEY="sk-..."
npm run script -- "Remotionの魅力を解説する動画の台本を作って"   # プロンプトから
npm run script -- --url https://example.com/article              # 記事URLから
npm run audio && npm run render                                  # いつもの流れへ
```

| 環境変数 | 既定値 | 説明 |
|---|---|---|
| `OPENAI_API_KEY` | （必須） | APIキー |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI互換エンドポイント（Ollama なら `http://localhost:11434/v1`） |
| `SCRIPT_MODEL` | `gpt-4o-mini` | モデル名（JSON mode 対応のものを推奨） |

- 生成結果はそのまま `public/script.json` に**上書き**されます。スキーマ検証を通らない場合はエラー内容を渡して1回だけ自動リトライします
- URL指定はHTMLの本文テキストを抽出して使います。JavaScriptで描画されるページやログインが必要なページは取得できないため、本文をコピーしてプロンプトとして渡してください
- 生成後は台本を確認・手直ししてから `npm run audio` を実行してください

## タイミングの仕組み

1. `scripts/generate-audio.ts` が各セリフを VOICEVOX (`/audio_query` → `/synthesis`) で WAV 化し、`public/audio/{sceneId}_{index}.wav` に保存
2. WAV ヘッダから実寸秒を取得し、フレーム数に丸めた上で `public/timeline.json` に各セリフの開始フレーム・長さを書き出し
3. Remotion 側（`src/Root.tsx` の `calculateMetadata`）が `timeline.json` の `totalFrames` から総尺を自動算出
4. 各セリフの `startFrame` で、`reveal` 指定要素の出現（0.4秒・フェード＋上からのスライド・easeOut）と字幕の切替を駆動。音声は `<Sequence>` で同じ `startFrame` に配置

間隔などの定数は `shared/timing.ts` に一元化されています（変更後は `npm run audio` の再実行が必要）:

| 定数 | 値 |
|---|---|
| `GAP_BETWEEN_LINES_SEC` | 0.3秒（セリフ間の間） |
| `SCENE_LEAD_SEC` | 0.6秒（シーン開始→最初のセリフ） |
| `SCENE_TAIL_SEC` | 0.8秒（最後のセリフ→シーン終了） |

クロスフェード（0.5秒）と出現アニメ（0.4秒）は `src/theme.ts` の `CROSSFADE_FRAMES` / `REVEAL_FRAMES` で変更できます。

## 長尺（最大10分）を狙う

- 目安: 10分 ≒ ナレーション約3,000字 ≒ **25〜30シーン / 80〜90セリフ**
- 長尺では `section`（章扉）と `chapter` タグで章構成を作ると視聴者が迷わない
- 総尺が10分を超えると `npm run audio` が警告を出します（目安超過。ブロックはしない）
- 素材集: `templates/sample-full-demo-9min.json`（約9分のフルデモ — 全レイアウトを網羅）と `templates/sample-claude-code-7scenes.json`（7シーンのコンパクト版）、`templates/zatsugaku-ao-shingou.json`（雑学解説「緑なのになぜ青信号？」約3〜4分）。シーン単位でコピーして組み合わせて使えます。`public/script.json` にコピーすると動画化できます

## デザインの変更

配色・余白・影などのトークンは `src/theme.ts` に集約しています（背景 `#F3F6FA` / 濃紺 `#0F1F3D` / アクセント青 `#2B5FC7` / 警告赤 `#B0432F`）。

## トラブルシューティング

- **`npm run audio` で「VOICEVOX Engine に接続できません」** — エンジンが起動していません。上記のコマンドで起動するか、`npm run audio:mock` でタイミングのみ確認してください。
- **`docker: invalid IP address: '127.0.0.1.`** — `-p` の値をシングルクォートで囲んだ古いコマンドを使っているのが原因です（Windows の cmd.exe はクォートを剥がしません）。README上部の引用符なしのコマンドを使ってください。
- **「timeline.json に … 対応するエントリがありません」** — 台本を編集した後に `npm run audio` を実行していない状態です。再実行してください。
- **レンダリングが遅い/落ちる** — `remotion.config.ts` で同時実行数をメモリから自動算出しています。手動で変える場合は `npm run render -- --concurrency=4` のように指定できます。
- **音声がずれる** — `npm run audio` をやり直してください。タイムラインは常に音声の実寸から再計算されます。

## GitHub Actions で自動生成する（リポジトリ側で完結）

`.github/workflows/generate-video.yml` をリポジトリにpushすると、**音声生成・タイムライン計算・レンダリングをGitHub側で実行**できます。ローカルにVOICEVOXもNodeも不要です。

**起動方法（2種類）**

1. **手動**: GitHub の Actions タブ → `generate-video` → Run workflow → `source_type` を選んで実行
   - `none`: リポジトリの `public/script.json` をそのまま動画化
   - `prompt` / `url`: LLM で台本を自動生成してから動画化（Secrets に `OPENAI_API_KEY` が必要。任意の Variables: `OPENAI_BASE_URL` / `SCRIPT_MODEL`）
2. **API から**: `repository_dispatch` で起動（Genspark などのエージェントから実行できる）

```bash
# PAT (repo権限) を使って外部から起動する例
curl -X POST \
  -H "Authorization: Bearer <YOUR_PAT>" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/repos/<user>/<repo>/dispatches \
  -d '{"event_type":"generate-video","client_payload":{"source_type":"url","source":"https://example.com/article"}}'
```

gh CLI なら: `gh api repos/<user>/<repo>/dispatches -f event_type=generate-video -F 'client_payload[source_type]=url' -F 'client_payload[source]=https://…'`

**実行の流れ**: VOICEVOX Engine を service コンテナで起動 → `npm ci` → (台本生成) → `npm run audio` → `npm run render` → `video.mp4` をアーティファクトに保存（30日）→ 台本生成時は `script.json` / `timeline.json` もリポジトリにコミットして戻します。

**費用**: 公開リポジトリなら無料（プライベートは無料枠2,000分/月）。10分動画1本で約20〜40分のランタイムを見込んでください。

## Genspark 側との連携

- Genspark のサンドボックスは使い捨てのため、**VOICEVOX・レンダリングのような常駐/重い処理をGenspark側に置くことはできません**。実行本体は GitHub Actions に置くのが正解です
- Genspark側で担えるのは「題材（プロンプト/URL/資料）→ `script.json` の生成 → リポジトリへの反映 → Actionsの起動」まで。手元での運用なら: Gensparkで台本を作ってもらい `npm run script` と同じ形式で受け取る → リポジトリにpush → Actionsが自動で動画化
- 上記の `repository_dispatch` 起動をGensparkのカスタムワークフローのステップに組み込めば、「プロンプトを投げたら動画ができてGitHubに上がる」フローになります（GitHub側の PAT 発行が必要）

## 構成

```
├── public/
│   ├── script.json      # 台本（差し替え対象）
│   ├── timeline.json    # 生成物: フレーム計算の結果
│   ├── audio/           # 生成物: セリフごとの WAV
│   └── fonts/           # Noto Sans JP (可変フォント)
├── scripts/
│   ├── generate-audio.ts   # 音声生成 + タイムライン作成
│   ├── generate-script.ts  # プロンプト/URL → 台本自動生成 (LLM)
│   └── lib/ (voicevox.ts / llm.ts / fetch-page.ts / wav.ts / estimate.ts)
├── shared/timing.ts     # 音声側とRemotion側の共通定数
├── templates/           # 台本サンプル（素材集）
└── src/
    ├── Root.tsx / Slideshow.tsx / data.ts / schemas.ts / theme.ts / fonts.ts
    ├── components/ (Reveal / HeadingChrome / SubtitleLayer / AudioLayer / IconBox)
    └── layouts/ (TitleLayout / FlowLayout / CompareLayout / InputOutputLayout)
```
