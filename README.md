# narration-slides — 台本から自動生成する YouTube 向け解説動画

`script.json`（台本）を差し替えるだけで、**音声・字幕・アニメーション・効果音のタイミングが自動で決まる**解説動画の生成パイプラインです。VOICEVOX Engine でナレーションを合成し、Remotion で 1920×1080 / 30fps の MP4 にレンダリングします。サムネイル画像と、概要欄に貼れるチャプター・字幕ファイルも同時に作れます。

**YouTube 向けの演出（すべて台本から自動）**

- **動く画面**: 要素はバネの動きで弾むように出現（ポップ・スライド・ズームなど8種）。見出しは1文字ずつ出現し、背景の模様と図形はゆっくり漂い、シーン中はカメラがゆっくりズームし続ける
- **シーン切り替え**: スライド・ワイプ・ズーム・円形などのトランジション（前後のシーンが重なって切り替わる）
- **図解のアニメーション**: 矢印が線を引くように伸びてデータの点が流れる／数字がカウントアップ／棒グラフが伸びる／チェックが「ポン」と付く／ランキング1位に王冠と光
- **強調**: セリフに `focus` を書くと、説明中の要素が拡大＋枠で強調され、他は薄くなる。`**強調**` で字幕の語句に色が付き、大文字のキメ画面ではマーカーが引かれる
- **字幕**: YouTube でおなじみの縁取り文字、または帯付き字幕
- **音**: 効果音（出現の「ポン」・切り替えの「シュッ」・強調の「チーン」）を自動配置。BGM はナレーション中だけ自動で音量を下げる
- **キャラクター**: 右下で喋るカワウソのキャラクター（口パクは音声の音量から自動生成。自前の画像にも差し替え可）。サムネイルにも登場
- **登録の導線**: 途中で出る「チャンネル登録」ポップアップ（カーソルがクリックする演出）と、終了画面の枠付きエンディング
- **進行バー**: 画面下端に再生位置と章の区切り
- **投稿用ファイル**: サムネイル（1280×720）、概要欄用チャプター（目次）、字幕ファイル（SRT）

> 画面例つきの手順書は [`docs/manual.html`](docs/manual.html) にあります（ブラウザで開いてください）。

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

# 4. YouTube 投稿用のサムネイル・チャプター・字幕を作る
npm run thumbnail   # → out/thumbnail.png (1280×720)
npm run youtube     # → out/youtube/description.txt (タイトル+目次) / captions.srt / metadata.json
```

`npm run build:youtube` で 3〜4 をまとめて実行できます。

- `description.txt` の目次をそのまま概要欄に貼ると、YouTube のチャプターになります（章扉 `section` が区切り。0:00 から始まり各10秒以上・3つ以上になるよう自動調整）
- `captions.srt` は YouTube Studio →「字幕」→「ファイルをアップロード」で使えます（自動字幕より正確）

台本を編集したら、**必ず `npm run audio` を再実行**してからプレビュー/レンダリングしてください（`timeline.json` が音声の実寸から再計算されます。未再生成の場合、Remotion 側で明確なエラーメッセージが出ます）。

## 台本の書き方（public/script.json）

```jsonc
{
  "meta": {                     // 動画全体の設定 (すべて省略可)
    "title": "動画タイトル",
    "theme": "pop",             // "clean" | "pop" | "dark"
    "transition": "slide"       // 既定のシーン切り替え
  },
  "scenes": [
    {
      "id": "flow",              // シーンID（音声ファイル名に使う）
      "layout": "flow",          // レイアウト種別（下表）
      "label": "FLOW",           // 左上の英字ラベル（省略可）
      "heading": "処理の流れ",    // 見出し（title / section / outro では省略）
      "transition": "wipe",      // このシーンに入るときの切り替え（省略可）
      "animation": "pop",        // このシーンの要素の出現アニメーション（省略可）
      "content": { ... },        // レイアウトごとの中身（下表）
      "lines": [
        {
          "text": "ナレーション文。**強調**した語句は字幕で色が変わる",
          "reveal": ["step-1"],  // このセリフの開始時に出現させる要素のID
          "focus": ["step-1"],   // このセリフの間だけ強調する要素のID（省略可）
          "speech": "読み上げ用の文（省略可。読み間違いを直すとき）",
          "sfx": "ding"          // このセリフで鳴らす効果音（省略可）
        }
      ]
    }
  ]
}
```

旧形式（`meta` なし・`reveal` だけの台本）もそのまま使えます。その場合は clean テーマ＋各種アニメーションの既定値で描画されます。

### セリフ (lines) に書ける項目

| キー | 説明 |
|---|---|
| `text` | 字幕に表示し、読み上げる文。`**語句**` で囲むと字幕の強調色になる（読み上げには影響しない） |
| `reveal` | このセリフの開始時に出現させる要素ID。同じセリフで複数書くと少しずつ時間差で出る。**書かれない要素はシーン冒頭に順番に出現** |
| `focus` | このセリフの間だけ拡大＋枠で強調する要素ID。他の要素は薄くなる |
| `speech` | 読み上げだけ別の文にしたいとき（例: 英単語の読みを直す）。字幕は `text` のまま |
| `sfx` | セリフ開始時の効果音 `pop` / `whoosh` / `ding` / `click` / `none`。省略時は `reveal` があれば `pop` |

### レイアウト種別と要素ID

| layout | content の中身 | reveal / focus で使える要素ID | 動き |
|---|---|---|---|
| `title` | `kicker?` / `title`（`\n` で改行・`**強調**` 可）/ `subtitle?` | なし | 字間が締まるキッカー、1文字ずつ弾むタイトル |
| `section` | 章扉。`number?` / `title` / `subtitle?` | なし | 章番号が「ドン」と落ち、背景に巨大な番号が流れる |
| `compare` | `leftTitle` / `rightTitle` / `left[]` / `right[]` — 各項目は `{ id, icon?, title, body?, tone? }`（`tone: "warning"` で赤） | 各項目の `id` | 左右から滑り込み、中央に VS |
| `flow` | `steps[]` — `{ id, icon?, title, body? }`（2つ以上） | 各stepの `id` と、矢印 `arrow-1`〜`arrow-N-1`（自動付与） | カードが弾み、矢印が線を引くように伸びて点が流れる |
| `inputOutput` | `input` / `transform { id, label }` / `output` | `input.id`・`transform.id`・`output.id` と矢印 `arrow-1`, `arrow-2` | 変換ボックスが脈打つ |
| `bullets` | `items[]` — `{ id, icon?, title, body? }` | 各項目の `id` | 左から滑り込む |
| `stats` | `items[]` — `{ id, value, label, body? }`（2〜4枚） | 各項目の `id` | 数字がカウントアップ（`"3倍"` `"6,100"` `"98.5%"` など） |
| `table` | `headers[]`（`{ label, tone? }`）+ `rows[]` — `{ id, label, note?, cells: [{ text, tone? }] }` + `source?`。`tone` は `good` / `bad` / `normal` | 各行の `id` | ヘッダーが降り、行が滑り込む |
| `bars` | `items[]` — `{ id, label, value, display?, tone? }` + `caption?` | 各項目の `id` / `caption` | バーが伸び、数値がカウントアップ |
| `checklist` | `items[]` — `{ id, text, note? }` | 各項目の `id` | カードの後にチェックが「ポン」と付く |
| `axes` | `xAxis { label }` / `yAxis { label }` / `hint?` | `axes` / `hint` | 軸が線を引くように描かれる |
| `statement` | 一文を大きく見せるキメ画面。`text`（`**強調**` にマーカー・`\n` 改行）/ `sub?` / `icon?` | `text` / `sub` | 1文字ずつ弾み、マーカーが引かれる |
| `ranking` | `items[]` — `{ id, rank?, icon?, title, body? }`（2〜5個。1位から順に書く） | 各項目の `id` | reveal なしなら下位から出現。1位は王冠と光の帯 |
| `image` | `src`（`public/` からの相対パス or https URL）/ `caption?` / `fit?`（`cover` / `contain`） | `image` / `caption` | 画像がゆっくりズーム＆パン |
| `outro` | `title?`（既定「ご視聴ありがとうございました」）/ `message?` / `subscribe?`（既定 true）/ `endScreen?`（既定 true） | なし | 登録ボタンのクリック演出。`endScreen` で YouTube 終了画面用の枠を表示 |

- シーンには `chapter`（左下の章タグ、例: `"chapter": "02 仕組み"`）と `badge`（右上のバッジ、例: `"badge": "おすすめ"`）を付けられます。
- `icon` に指定できるキーは約85種（`check` `search` `shield-check` `target` `chart-bar` `trophy` `sparkles` `brain` `bell` など）。一覧は `src/components/IconBox.tsx` のレジストリを参照。未登録キーはプレースホルダー表示になります。
- 存在しない要素IDを `reveal` / `focus` に書くと、`npm run audio` とプレビュー時に警告が出ます。
- `outro` は YouTube の終了画面（最大20秒）に使えるよう、セリフを2つ以上入れて5秒以上にするのがおすすめです。

### 動画全体の設定（meta）

| キー | 既定値 | 説明 |
|---|---|---|
| `title` | （title シーンのタイトル） | 動画タイトル。概要欄ファイルとサムネイルの既定値に使う |
| `theme` | `clean` | `clean`（落ち着いた青×紺）/ `pop`（クリーム地・太枠・黄色マーカー・縁取り字幕）/ `dark`（濃紺地・テック系） |
| `transition` | `slide` | シーン切り替え: `slide` / `slideUp` / `wipe` / `zoom` / `circle` / `fade` / `none`（シーンごとに `transition` で上書き可） |
| `animation` | `auto` | 要素の出現: `auto`（レイアウトごとのおすすめ）/ `fadeUp` / `pop` / `slideLeft` / `slideRight` / `zoom` / `blur` / `flip` / `none`（シーンごとに `animation` で上書き可） |
| `camera` | `subtle` | シーン中のゆっくりズーム。`none` で止める |
| `animatedBackground` | `true` | 背景の模様・図形を漂わせる |
| `progressBar` | `true` | 画面下端の進行バー（章の区切り付き） |
| `subtitle` | `{ enabled: true, style: "auto" }` | `style`: `box`（帯）/ `outline`（縁取り文字）/ `auto`（テーマ既定）。YouTube の字幕機能だけ使うなら `enabled: false` |
| `sfx` | `{ enabled: true, volume: 0.5, reveal: true, transition: true }` | 効果音。`reveal` = 出現時の pop、`transition` = 切り替え時の whoosh |
| `bgm` | なし | `{ src: "bgm/track.mp3", volume: 0.18, duckVolume: 0.07 }`。`public/` に置いた音源をループ再生し、ナレーション中は `duckVolume` まで下げる。前後は自動フェード |
| `avatar` | カワウソ (同梱) | 右下で喋るキャラクター。**省略時は同梱のカワウソ（`public/avatar/`）が出る**。`false` で非表示。自前の画像なら `{ "type": "image", "open": "avatar/open.png", "half": "avatar/half.png", "closed": "avatar/closed.png" }`（口を開けた/半開き/閉じた画像。`half` は省略可）。`{ "type": "builtin" }` で画像なしの丸顔キャラ。`name` で名札、`size` で大きさ（既定 250） |
| `subscribePopup` | なし | `{ sceneId: "sec2", text?: "チャンネル登録" }`。指定シーンの冒頭に約4秒、登録ボタンのクリック演出を右上に出す |
| `thumbnail` | なし | `{ text: "大きな文字\n**強調**", sub?, badge?, image? }`。`npm run thumbnail` の文言（省略時は title シーンから作る） |

> BGM・画像を使う場合は、利用規約で動画への使用が許可された素材を使ってください。効果音は `scripts/lib/sfx.ts` でプログラム合成したもので、外部素材は使っていません（`npm run sfx` で再生成）。

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
npm run script -- --theme pop "…"                                # テーマも同時に指定
npm run audio && npm run build:youtube                           # いつもの流れへ
```

| 環境変数 | 既定値 | 説明 |
|---|---|---|
| `OPENAI_API_KEY` | （必須） | APIキー |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI互換エンドポイント（Ollama なら `http://localhost:11434/v1`） |
| `SCRIPT_MODEL` | `gpt-4o-mini` | モデル名（JSON mode 対応のものを推奨） |

- 生成結果は `public/script.json` に**上書き**されます。ただし既存の `meta` の見た目の設定（テーマ・BGM・アバターなど）は引き継ぎ、タイトル・サムネイル文言・登録ポップアップの位置だけ LLM の提案で差し替えます
- スキーマ検証・要素IDの整合性チェックを通らない場合は、エラー内容を渡して1回だけ自動リトライします
- 生成される台本は YouTube 向けの構成（title → section で章立て → statement / ranking などで山場 → outro）になるよう指示しています
- URL指定はHTMLの本文テキストを抽出して使います。JavaScriptで描画されるページやログインが必要なページは取得できないため、本文をコピーしてプロンプトとして渡してください
- 生成後は台本を確認・手直ししてから `npm run audio` を実行してください

## タイミングの仕組み

1. `scripts/generate-audio.ts` が各セリフを VOICEVOX (`/audio_query` → `/synthesis`) で WAV 化し、`public/audio/{sceneId}_{index}.wav` に保存（`**強調**` は除いて読み上げ）
2. WAV ヘッダから実寸秒を取得し、フレーム数に丸めた上で `public/timeline.json` に各セリフの開始フレーム・長さを書き出し。同時に1フレームごとの音量を0〜9の数字列（`levels`）にして保存（キャラクターの口パク用）
3. Remotion 側（`src/Root.tsx` の `calculateMetadata`）が `timeline.json` の `totalFrames` から総尺を自動算出
4. 各セリフの `startFrame` で、`reveal` 指定要素の出現（バネの動き）・`focus` の強調・字幕の切替・効果音を駆動。音声は `<Sequence>` で同じ `startFrame` に配置
5. シーン切り替えはシーン境界を中心に前後 0.3秒ずつ重なって再生（セリフ前後の余白の中に収まるので、音声とはずれない）

間隔などの定数は `shared/timing.ts` に一元化されています（変更後は `npm run audio` の再実行が必要）:

| 定数 | 値 |
|---|---|
| `GAP_BETWEEN_LINES_SEC` | 0.3秒（セリフ間の間） |
| `SCENE_LEAD_SEC` | 0.6秒（シーン開始→最初のセリフ） |
| `SCENE_TAIL_SEC` | 0.8秒（最後のセリフ→シーン終了） |
| `TRANSITION_FRAMES` | 18フレーム（シーン切り替えの長さ。半分は LEAD / TAIL 以下にする） |

出現アニメーションのバネの硬さは `src/animation/presets.ts` の `SPRINGS`、トランジションの見た目は `src/animation/transitions.ts` で変更できます。

## 長尺（最大10分）を狙う

- 目安: 10分 ≒ ナレーション約3,000字 ≒ **25〜30シーン / 80〜90セリフ**
- 長尺では `section`（章扉）と `chapter` タグで章構成を作ると視聴者が迷わない
- 総尺が10分を超えると `npm run audio` が警告を出します（目安超過。ブロックはしない）
- 素材集: `public/script.json`（約9分のフルデモ — pop テーマ・キャラクター・登録ポップアップ・statement・outro 入り）と `templates/sample-claude-code-7scenes.json`（7シーンのコンパクト版・旧形式）。シーン単位でコピーして組み合わせて使えます

## デザインの変更

配色・カードの枠や影・字幕の既定スタイルは `src/themes/index.ts` の `THEMES`（clean / pop / dark）に集約しています。新しいテーマを足すときは `THEMES` にエントリを追加し、`src/schemas.ts` の `themeNameSchema` に名前を足します。

## トラブルシューティング

- **`npm run audio` で「VOICEVOX Engine に接続できません」** — エンジンが起動していません。上記のコマンドで起動するか、`npm run audio:mock` でタイミングのみ確認してください。
- **`docker: invalid IP address: '127.0.0.1.`** — `-p` の値をシングルクォートで囲んだ古いコマンドを使っているのが原因です（Windows の cmd.exe はクォートを剥がしません）。README上部の引用符なしのコマンドを使ってください。
- **「timeline.json に … 対応するエントリがありません」** — 台本を編集した後に `npm run audio` を実行していない状態です。再実行してください。
- **レンダリングが遅い/落ちる** — `remotion.config.ts` で同時実行数をメモリから自動算出しています。手動で変える場合は `npm run render -- --concurrency=4` のように指定できます。
- **音声がずれる** — `npm run audio` をやり直してください。タイムラインは常に音声の実寸から再計算されます。
- **キャラクターを別の画像にしたい** — 背景が透明な PNG を `public/avatar/` に置き、`meta.avatar` でファイル名を指定します。口を開けた画像と閉じた画像の2枚（＋任意で半開き）が必要です。
- **キャラクターの口が動かない／一定のリズムで動く** — 古い `timeline.json` です。`npm run audio` を再実行すると音声の音量から口パクが作られます（`audio:mock` では擬似的なリズム）。
- **`[script.json] … 要素ID "…" はシーン "…" にありません`** — `reveal` / `focus` の綴りの間違いです。メッセージに使えるIDの一覧が出ます。
- **動きが多すぎる** — `meta.animation: "fadeUp"`・`meta.transition: "fade"`・`meta.camera: "none"`・`meta.animatedBackground: false` で落ち着いた演出になります。

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

- 手動実行では `theme`（`keep` / `clean` / `pop` / `dark`）も選べます（台本生成時のみ。API からは `client_payload.theme`）

**実行の流れ**: VOICEVOX Engine を service コンテナで起動 → `npm ci` → (台本生成) → `npm run audio` → `npm run render` → `npm run thumbnail` / `npm run youtube` → `video.mp4`・`thumbnail.png`・`youtube/`（概要欄の目次・字幕）をアーティファクトに保存（30日）→ 台本生成時は `script.json` / `timeline.json` もリポジトリにコミットして戻します。

**費用**: 公開リポジトリなら無料（プライベートは無料枠2,000分/月）。10分動画1本で約20〜40分のランタイムを見込んでください。

## Genspark 側との連携

- Genspark のサンドボックスは使い捨てのため、**VOICEVOX・レンダリングのような常駐/重い処理をGenspark側に置くことはできません**。実行本体は GitHub Actions に置くのが正解です
- Genspark側で担えるのは「題材（プロンプト/URL/資料）→ `script.json` の生成 → リポジトリへの反映 → Actionsの起動」まで。手元での運用なら: Gensparkで台本を作ってもらい `npm run script` と同じ形式で受け取る → リポジトリにpush → Actionsが自動で動画化
- 上記の `repository_dispatch` 起動をGensparkのカスタムワークフローのステップに組み込めば、「プロンプトを投げたら動画ができてGitHubに上がる」フローになります（GitHub側の PAT 発行が必要）

## 構成

```
├── public/
│   ├── script.json      # 台本（差し替え対象）
│   ├── timeline.json    # 生成物: フレーム計算の結果 + 口パク用の音量
│   ├── audio/           # 生成物: セリフごとの WAV
│   ├── sfx/             # 効果音 (pop / whoosh / ding / click。npm run sfx で再生成)
│   ├── avatar/          # キャラクター画像 (口: open / half / closed)
│   └── fonts/           # Noto Sans JP (可変フォント)
├── scripts/
│   ├── generate-audio.ts    # 音声生成 + タイムライン作成
│   ├── generate-script.ts   # プロンプト/URL → 台本自動生成 (LLM)
│   ├── generate-youtube.ts  # 概要欄の目次・字幕ファイル
│   ├── generate-sfx.ts      # 効果音の合成
│   └── lib/ (voicevox / llm / fetch-page / wav / estimate / levels / sfx / youtube)
├── shared/              # 音声側とRemotion側の共通処理 (timing.ts / markup.ts)
├── templates/           # 台本サンプル（素材集）
├── docs/manual.html     # 手順書 (画面例つき。ブラウザで開く)
└── src/
    ├── Root.tsx / Slideshow.tsx / Thumbnail.tsx / data.ts / schemas.ts / elements.ts / audio-events.ts / fonts.ts
    ├── themes/          # テーマ (clean / pop / dark)
    ├── animation/       # バネの設定・出現プリセット・トランジション
    ├── context/         # シーンごとの reveal / focus のタイミング
    ├── components/      # Reveal / KineticText / CountUp / DrawArrow / SubtitleLayer / AudioLayer /
    │                    # Avatar / SubscribeButton / SubscribePopup / ProgressBar / SceneBackground / Camera ...
    └── layouts/         # 15種のレイアウト (index.tsx が layout 名 → コンポーネントの対応表)
```
