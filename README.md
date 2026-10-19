# narration-slides — 台本から自動生成する YouTube 向け解説動画

`script.json`（台本）を差し替えるだけで、**音声・字幕・アニメーション・効果音のタイミングが自動で決まる**解説動画の生成パイプラインです。VOICEVOX Engine でナレーションを合成し、Remotion で 1920×1080 / 30fps の MP4 にレンダリングします。サムネイル画像と、概要欄に貼れるチャプター・字幕ファイルも同時に作れます。

**既定は「3D アニメ × 子どもにもわかる解説」**

- **3D オブジェクトで見せる**: 新レイアウト `scene3d` で、りんご・たいよう・くも・しずく・ロケット・ロボットなど約50種の 3D オブジェクトを舞台に並べて説明する（three.js。アニメ調の陰影と輪郭線）。物は上から落ちてきて弾み、`count` で「3こ」と数を見せ、`size` で大きさをくらべ、矢印でつないだり（`flow`）輪にして一周させたり（`cycle`）できる。説明中の物はぴょんぴょん跳ねて足もとが光る
- **画面ぜんたいが立体に**（`meta.style: "3d"`・既定）: カメラが横から回り込んで少し傾いたまま揺れ、カードは積み木のような厚みを持ち、飛び出す絵本のように起き上がって出現する。背景は奥へ続く床と回る積み木。タイトル・章扉・エンディングのまわりには 3D オブジェクトが浮かぶ（サムネイルにも）
- **子ども向けの配色**（`meta.theme: "kids"`・既定）: 空色 × はっきりした色 × 太い縁取り
- **子どもにもわかる台本を自動生成**（`npm run script`・既定 `--audience kids`）: 小学3年生がわかる言葉・話しかける口調・身近なたとえで書き、説明の半分以上を 3D オブジェクトで見せる台本を LLM が作る
- 従来の平面デザインは `meta.style: "flat"`、大人向けの台本は `--audience general` で使えます

**YouTube 向けの演出（すべて台本から自動）**

- **動く画面**: 要素はバネの動きで弾むように出現（ポップ・スライド・ズームなど8種）。見出しは1文字ずつ出現し、背景の模様と図形はゆっくり漂い、シーン中はカメラがゆっくりズームし続ける
- **シーン切り替え**: スライド・ワイプ・ズーム・円形などのトランジション（前後のシーンが重なって切り替わる）
- **図解のアニメーション**: 矢印が線を引くように伸びてデータの点が流れる／数字がカウントアップ／棒グラフが伸びる／チェックが「ポン」と付く／ランキング1位に王冠と光
- **強調**: セリフに `focus` を書くと、説明中の要素が拡大＋枠で強調され、他は薄くなる。`**強調**` で字幕の語句に色が付き、大文字のキメ画面ではマーカーが引かれる
- **字幕**: YouTube でおなじみの縁取り文字、または帯付き字幕
- **音**: 効果音（出現の「ポン」・切り替えの「シュッ」・強調の「チーン」）を自動配置。BGM はナレーション中だけ自動で音量を下げる
- **キャラクター**: 右下の丸い枠に、喋るカワウソの顔だけを表示（体や顔は動かず、動くのは口だけ。口の形は音声の音量から自動生成。自前の画像にも差し替え可）。サムネイルには全身で登場
- **登録の導線**: 途中で出る「チャンネル登録」ポップアップ（カーソルがクリックする演出）と、終了画面の枠付きエンディング
- **進行バー**: 画面下端に再生位置と章の区切り
- **投稿用ファイル**: サムネイル（1280×720）、概要欄（説明・目次・出典・クレジット・ハッシュタグ）、タグ、タイトル候補、字幕ファイル（SRT）、投稿シート（YouTube Studio で選ぶ設定と投稿前の確認）
- **YouTube 向けの書き出し**: H.264 / yuv420p / BT.709 / AAC 320kbps・高めの画質（CRF 16）で書き出し、音量を YouTube の基準（-14 LUFS）にそろえる
- **AI っぽさを抑える仕上げ**: 切り抜いた絵のふちの白いにじみを取り、物を背景の色になじませ、画面全体に薄い粒子と周辺減光をかける。台本は決まり文句を避け、文末と文の長さに緩急を付けて書く

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

## 動画生成アプリ（図解ムービー スタジオ）

テーマを入れて「動画を生成」を押すだけで、台本 → ナレーション → 字幕 → 3D・図解 → MP4 まで作るローカルアプリです。

```bash
export ANTHROPIC_API_KEY=sk-ant-...   # 台本を書く AI (Claude)。Windows は set / $env: で設定
npm run studio                        # → http://localhost:4300 をブラウザで開く
```

- **① 動画のテーマ / ② 細かい設定**: 自由に書きます（尺・口調・見せ方・出典の付け方など）。見た目（図解（紙・明朝）/ 3D図解（自販機風）/ AIイラスト（重ね絵）/ キッズ（3D）/ ポップ / クリーン / ダーク）・尺・声はボタンで選べます。キッズを選ぶと、小学生にもわかる言葉で 3D オブジェクト中心の台本を書きます。3D図解を選ぶと、自販機の回のように題材の物そのものを 3D で作り込んだ場面（`scene3d` の組み立て形式・下記）を中心に、paper テーマの台本を書きます。AIイラストを選ぶと、画像生成 AI が描いた背景と物を重ねて動かす場面（`layered`・下記）を中心に、paper テーマの台本を書き、**絵も自動で作ります**
- **動画を生成**: 進捗バーで「台本とリサーチ → 素材の画像（AI） → ナレーション → 字幕のタイミング → 3D・図解の描画 → 書き出し」のどこまで進んだかと残り時間が見られます。場面の下絵は、できたものから先に表示されます
- **プレビュー**: 完成した動画をその場で再生。下の場面をクリックすると、その場面へ移動します
- **③ 修正の指示**: 場面を選んで指示を書くと、その場面だけを AI が直して作り直します（選ばなければ動画全体）。直すたびに版（v1, v2, …）が増え、右上で前の版に戻って見られます
- **④ 保存**: 動画（MP4）・サムネイル・投稿シート・YouTube 用の説明（目次・出典）・字幕ファイル・台本（JSON）。「YouTube に貼る」の「タイトル」「説明」「タグ」で、YouTube Studio の各欄に貼る文言をコピーできます
- **BGM**: `public/bgm/` に音楽ファイル（mp3 / m4a / wav / ogg）を置くと、「BGM」で選べます。ナレーションの間は自動で音量が下がります（利用規約で動画への使用が許可された音源を使ってください）
- **形式（横 16:9 / 縦 9:16 ショート）**: 「縦 9:16 ショート」を選ぶと、YouTube ショート（1080×1920）として作ります（下記「YouTube ショート（縦の動画）」）。尺は約30秒〜3分から選べます
- 作った動画は `studio-data/` に保存され、ヘッダーの「作った動画」から開き直せます
- 他の AI で書いた台本（JSON）は「台本（JSON）を読み込んで作る」から動画にできます（APIキーなしでも可）

**準備**

| 項目 | 内容 |
|---|---|
| 台本を書く AI | `ANTHROPIC_API_KEY`（Claude。既定モデル `claude-opus-5-5`、`CLAUDE_MODEL` で変更可）。`ant auth login` 済みならキーなしでも動きます。OpenAI 互換 API を使うときは `OPENAI_API_KEY`（`SCRIPT_PROVIDER=openai` で明示も可） |
| ナレーション | VOICEVOX Engine を起動しておく（下記）。起動していなければ無音の仮音声で作ります（画面に表示） |
| 絵を描く AI（AIイラストのとき） | `GEMINI_API_KEY`（Gemini。既定モデル `gemini-3.1-flash-lite-image`）。OpenAI で描くときだけ `IMAGE_PROVIDER=openai` と `OPENAI_API_KEY`（既定モデル `gpt-image-1.5`）。台本用に `OPENAI_API_KEY` があっても、画像は勝手に OpenAI になりません。モデルは `IMAGE_MODEL` で変更可。キーがなければ絵の場所に仮の枠を出して作ります（画面に表示） |
| 3D の描画 | Linux ではソフトウェア描画（`STUDIO_GL=swangle`）が既定。Mac / Windows は GPU を使います |

- ポートは `STUDIO_PORT`（既定 4300）。このPCからだけ開けます（127.0.0.1 で待ち受け）
- 生成は1本ずつ順番に処理します。3D の場面が多いと書き出しに数分〜十数分かかります
- 生成中は `public/script.json` などを一時的に書き換え、組み立てが終わると元に戻します。生成中に `npm run audio` などを同時に実行しないでください

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
npm run youtube     # → out/youtube/description.txt (説明+目次+出典) / tags.txt / upload.txt (投稿シート) / captions.srt / metadata.json
```

`npm run build:youtube` で 3〜4 をまとめて実行できます。

- `description.txt` の目次をそのまま概要欄に貼ると、YouTube のチャプターになります（章扉 `section` が区切り。0:00 から始まり各10秒以上・3つ以上になるよう自動調整）
- `captions.srt` は YouTube Studio →「字幕」→「ファイルをアップロード」で使えます（自動字幕より正確）
- `upload.txt` は YouTube Studio の入力欄の順に、タイトル候補・タグ・設定（子ども向けか・改変または合成されたコンテンツの申告など）と投稿前の確認をまとめたものです
- VOICEVOX の声を使った動画では、各キャラクターの利用規約で求められるクレジット（例: `VOICEVOX:ずんだもん`）を概要欄に自動で入れます
- `npm run render` は YouTube 向けの設定で書き出したあと、音量を -14 LUFS にそろえます（`npm run finish -- ファイル.mp4` で単独でも実行可。ffmpeg は Remotion 同梱のものを使います）

### YouTube ショート（縦の動画）

同じ台本の部品で、縦 1080×1920 の YouTube ショートも作れます。動画生成アプリでは「縦 9:16 ショート」を選ぶだけです。台本を手で書くときは `meta.format` を `"vertical"` にして、次のように書き出します。

```bash
npm run render:shorts   # → out/shorts.mp4 (Remotion の Shorts。音量も -14 LUFS にそろえる)
npm run cover:shorts    # → out/shorts-cover.png (ショートのカバー 1080×1920)
npm run youtube         # meta.format が vertical なら、#Shorts 付きのタイトル・説明 (目次なし) を作る
```

- **画面の割り付け**: ショートの画面は、上（タブ・検索）・下（タイトル・説明）・右（高評価・コメントのボタン）がアプリの UI で隠れます。見出し・字幕・図解はその内側に置きます（上 12%・下 20%・右 15% を空ける。値は `src/stage.tsx` の `SHORTS`）。右下のキャラクター・進行バー・登録のポップアップは出しません
- **図解**: カードやグラフは横の動画と同じ部品を、上から下へ積んで大きく表示します（flow・compare・inputOutput は縦に並べ替え）
- **3D の場面（scene3d）**: 16:9 で組んだ場面を画面の幅いっぱいの帯にして中央に置き、帯の上下にも 3D を描き足します。注釈・名札の文字は大きくします
- **AI の絵（layered）**: 背景は 9:16 で描きます（横の動画とは別の絵になります）。物の `x` は横幅、`y`・`height` は縦の高さに対する割合です
- **台本 AI**: 1セリフ目で結論を言い切るフックから始め、title / section / outro を使わない短い構成で書きます（尺は3分以内。3分を超えるとショートになりません）
- **投稿用ファイル**: タイトル候補の末尾とハッシュタグの先頭に `#Shorts` を付け、ショートにはないチャプター（目次）は書きません。`thumbnail.png` はショートのカバー（縦）です

台本を編集したら、**必ず `npm run audio` を再実行**してからプレビュー/レンダリングしてください（`timeline.json` が音声の実寸から再計算されます。未再生成の場合、Remotion 側で明確なエラーメッセージが出ます）。

## 台本の書き方（public/script.json）

```jsonc
{
  "meta": {                     // 動画全体の設定 (すべて省略可)
    "title": "動画タイトル",
    "theme": "kids",            // "kids" (既定) | "clean" | "pop" | "dark" | "paper"
    "style": "3d",              // "3d" (既定) | "flat"
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

旧形式（`meta` なし・`reveal` だけの台本）もそのまま使えます。その場合は kids テーマ＋3D スタイル＋各種アニメーションの既定値で描画されます（従来どおりの見た目にしたいときは `"meta": { "theme": "clean", "style": "flat" }`）。

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
| `title` | `kicker?` / `title`（`\n` で改行・`**強調**` 可）/ `subtitle?` / `objects?`（形キーの配列・6個まで） | なし | 字間が締まるキッカー、1文字ずつ弾むタイトル。3D スタイルでは `objects` の 3D オブジェクトがまわりに浮かぶ |
| `section` | 章扉。`number?` / `title` / `subtitle?` / `objects?`（4個まで） | なし | 章番号が「ドン」と落ち、背景に巨大な番号が流れる。3D スタイルでは 3D オブジェクトが浮かぶ |
| `scene3d`（objects） | 3D オブジェクトの舞台。`arrangement?`（`row` / `flow` / `cycle`）/ `objects[]` — `{ id, shape, label?, color?, count?, size? }`（1〜6個）/ `caption?` | 各 objects の `id`・矢印 `arrow-N`（`flow` は N-1 本、`cycle` は N 本）・`caption` | 物が落ちてきて弾む。数は1こずつ順に出る。focus で跳ねて足もとが光る（下の「3D オブジェクト」参照） |
| `compare` | `leftTitle` / `rightTitle` / `left[]` / `right[]` — 各項目は `{ id, icon?, title, body?, tone? }`（`tone: "warning"` で赤） | 各項目の `id` | 左右から滑り込み、中央に VS |
| `flow` | `steps[]` — `{ id, icon?, title, body? }`（2つ以上） | 各stepの `id` と、矢印 `arrow-1`〜`arrow-N-1`（自動付与） | カードが弾み、矢印が線を引くように伸びて点が流れる |
| `inputOutput` | `input` / `transform { id, label }` / `output` | `input.id`・`transform.id`・`output.id` と矢印 `arrow-1`, `arrow-2` | 変換ボックスが脈打つ |
| `bullets` | `items[]` — `{ id, icon?, title, body? }` | 各項目の `id` | 左から滑り込む |
| `stats` | `items[]` — `{ id, value, label, body?, kicker?, note?, tone?, stamp? }`（2〜4枚）。`kicker` は数字の上の小見出し（例 `"1つ目"`）、`note` はカード下端の出典、`tone: "warning"` で朱色、`stamp` は右下の丸印（例 `"日本"`） | 各項目の `id` | 数字がカウントアップ（`"3倍"` `"6,100"` `"98.5%"` など） |
| `table` | `headers[]`（`{ label, tone? }`）+ `rows[]` — `{ id, label, note?, cells: [{ text, tone? }] }` + `source?`。`tone` は `good` / `bad` / `normal` | 各行の `id` | ヘッダーが降り、行が滑り込む |
| `bars` | `items[]` — `{ id, label, value, display?, tone? }` + `caption?` + `max?`（棒の全幅にあたる値。割合なら `100`。省略時は最大値） | 各項目の `id` / `caption` | バーが伸び、数値がカウントアップ |
| `share` | 1本の帯を区切った割合のグラフ。`title?` / `segments[]` — `{ id, display, label?, value, tone? }`（`tone`: `warning` 朱 / `accent` 紺 / `muted` 灰）/ `source?` | 各区分の `id` / `source` | 空の枠が出て、区分が reveal で左から伸びる |
| `scene3d`（preset） | three.js で作り込んだ 3D の場面。`objects` の代わりに `preset` で場面を選ぶ（下の表）。共通: `title?`（上部中央の一文。`**強調**` は朱）/ `stat?`（`{ kicker?, value, note? }` 数字カード）/ `callouts?`（`[{ id, title, sub?, tone? }]` 物を指す注釈。場面ごとに決まった位置に順に入る。`tone`: `accent` 紺 / `warning` 朱 / `muted` 灰）/ `label?`（phoneChip 用） | 場面ごとの要素ID（下の表）＋ `title` / `stat` / 各 callout の `id` | 物の動きが reveal に合わせて始まる。注釈の線は物を追いかける |
| `checklist` | `items[]` — `{ id, text, note? }` | 各項目の `id` | カードの後にチェックが「ポン」と付く |
| `axes` | `xAxis { label }` / `yAxis { label }` / `hint?` | `axes` / `hint` | 軸が線を引くように描かれる |
| `statement` | 一文を大きく見せるキメ画面。`text`（`**強調**` にマーカー・`\n` 改行）/ `sub?` / `icon?` | `text` / `sub` | 1文字ずつ弾み、マーカーが引かれる |
| `ranking` | `items[]` — `{ id, rank?, icon?, title, body? }`（2〜5個。1位から順に書く） | 各項目の `id` | reveal なしなら下位から出現。1位は王冠と光の帯 |
| `image` | `src`（`public/` からの相対パス or https URL）/ `caption?` / `fit?`（`cover` / `contain`） | `image` / `caption` | 画像がゆっくりズーム＆パン |
| `layered` | 画像生成 AI で作った絵を重ねる場面。`background`（`{ src, blur? }`）/ `foreground?`（手前の飾り・背景透過）/ `objects[]` — `{ id, src, x, y, height, enter?, motion?, effect?, shadow? }`（物の画像・1〜6個）/ `title?` / `callouts?`（`[{ id, target, title, sub?, tone? }]`）/ `stat?` / `camera?`（`pan` / `zoom` / `none`）。詳しくは下の「画像を重ねる場面（layered）」 | 各 objects の `id`・各 callout の `id`・`title` / `stat` | 層ごとに違う速さで流れる（視差）。物は弾んで出て、focus で拡大して光る。湯気・冷気・光はコードで足す |
| `outro` | `title?`（既定「ご視聴ありがとうございました」）/ `message?` / `subscribe?`（既定 true）/ `endScreen?`（既定 true） | なし | 登録ボタンのクリック演出。`endScreen` で YouTube 終了画面用の枠を表示 |

**scene3d の場面（preset）**

| preset | 見せるもの | 要素ID | callouts の位置 |
|---|---|---|---|
| `phoneChip` | スマホの箱が開き、基板の上のチップへカメラが寄る | `open` / `label` / `zoom` | — |
| `vendingCount` | 自販機が1台 → カメラが引くと、同じ自販機がずらっと並んでいる（台数の多さ） | `machine` / `many` | — |
| `vendingHotCold` | 自販機の左右に「冷たさ」と「熱」の玉が飛んでくる | `machine` / `cold` / `heat` | 1: 冷たさの玉 / 2: 熱の玉 |
| `vendingCutaway` | 扉が開いて中が見え、冷媒の管の中を「熱」の玉が運ばれる（ヒートポンプ） | `open` / `flow` | 1: 吸熱 / 2: 圧縮機 / 3: 放熱 / 4: 膨張弁 |
| `heatReuse` | 左: 冷蔵庫は熱を外へ捨てる / 右: 自販機は熱を温める側へ回す | `left` / `right` | 1: 捨てる熱 / 2: 回す熱 |
| `vendingEnergy` | 自販機 → 稲妻 → 家。カレンダーの1〜3月がめくれて朱色になる | `machine` / `bolt` / `house` / `months` | 1: カレンダー |

物（自販機・熱の玉・冷蔵庫・家・稲妻・カレンダー）は `src/three/objects.tsx` と `src/three/parts.tsx`、場面の組み立てとカメラの動きは `src/three/presets.tsx` にあります。新しい場面は `presets.tsx` に1つ足し、`src/schemas.ts` の `preset` と `src/elements.ts` の `SCENE3D_ELEMENT_IDS` に名前を足します。サンプル: `templates/zukai-02-vending-machine.json`（5つの 3D 場面を使った自販機の話）。

- シーンには `chapter`（左下の章タグ、例: `"chapter": "02 仕組み"`）と `badge`（右上のバッジ、例: `"badge": "おすすめ"`）を付けられます。
- `icon` に指定できるキーは約120種（`check` `search` `shield-check` `target` `chart-bar` `trophy` `sparkles` `brain` `bell`、子ども向けの `leaf` `droplet` `sun` `fish` `apple` `house` `smile` など）。一覧は `src/components/IconBox.tsx` のレジストリを参照。未登録キーはプレースホルダー表示になります。
- 存在しない要素IDを `reveal` / `focus` に書くと、`npm run audio` とプレビュー時に警告が出ます。
- `outro` は YouTube の終了画面（最大20秒）に使えるよう、セリフを2つ以上入れて5秒以上にするのがおすすめです。

### 3D オブジェクト（scene3d）

言葉だけでは伝わりにくいことを、形のある物にして見せるレイアウトです。子ども向けの説明の主役になります。

```jsonc
{
  "id": "up",
  "layout": "scene3d",
  "heading": "水が空へのぼるまで",
  "content": {
    "arrangement": "flow",                                       // row: 横に並べる / flow: 矢印でつなぐ / cycle: 輪にして一周
    "objects": [
      { "id": "sea", "shape": "drop", "label": "海の水" },
      { "id": "sun", "shape": "sun", "label": "たいよう" },
      { "id": "steam", "shape": "arrow-up", "label": "水じょうき", "color": "sky" },
      { "id": "cloud", "shape": "cloud", "label": "くも" }
    ],
    "caption": "ひとこと (省略可)"
  },
  "lines": [
    { "text": "ここに、海の水があるよ。", "reveal": ["sea"], "focus": ["sea"] },
    { "text": "たいようの光であたためられると…", "reveal": ["arrow-1", "sun"], "focus": ["sun"] }
  ]
}
```

| objects のキー | 説明 |
|---|---|
| `shape` | 形のキー（下表）。未登録のキーは「はてな」の形になり、`npm run audio` で警告が出る |
| `label` | 物の下（`cycle` の奥側の物は上）に出る名札 |
| `color` | 色名（`red` `orange` `yellow` `green` `lime` `blue` `sky` `navy` `purple` `pink` `brown` `gray` `white` `black` `gold`）または `#RRGGBB`。省略時は形ごとの色 |
| `count` | 同じ物をいくつ並べるか（1〜12）。1こずつ順に出てくるので数えられる。奥の列はひな壇に乗る |
| `size` | 大きさの倍率（0.3〜2.5）。大小のくらべっこに使う |

**形のキー（48種）** — 一覧と日本語の説明は `src/three/catalog.ts`、形そのものは `src/three/models.tsx`

| 分類 | キー |
|---|---|
| 基本の形・記号 | `cube` `ball` `cylinder` `cone` `pyramid` `ring` `star` `heart` `arrow-up` `arrow-down` `question` `check` `cross` |
| しぜん | `sun` `moon` `earth` `cloud` `drop` `fire` `tree` `flower` `sprout` `mountain` `fish` |
| ひと | `person` `robot` |
| もの | `house` `building` `car` `rocket` `book` `lightbulb` `coin` `gift` `apple` `cake` `battery` `phone` `computer` `chip` `server` `letter` `speech` `clock` `magnifier` `trophy` `lock` `magnet` |

- 形の見た目は Remotion Studio（`npm run dev`）の左の一覧の `ShapeCatalog` で全48種を一覧できます（`npx remotion still ShapeCatalog out/shapes.png` で画像にも）
- 目に見えないものも、たとえで形にすると伝わります（データ → `letter`、お金 → `coin`、時間 → `clock`、ふえる → `arrow-up`、AI → `robot`）
- 形を足すときは `src/three/catalog.ts` の `SHAPES` にキーを追加し、`src/three/models.tsx` の `MODELS` に同じキーで形を定義します（床に置いて高さ約1.6・幅約1.8以内にそろえる）
- 素材集: `templates/sample-kids-3d.json`（「雨はどうしてふるの？」約3分。`row` / `flow` / `cycle`・`count`・`size` をすべて使った子ども向けのデモ）

### 画像を重ねる場面（layered）

Gemini や ChatGPT などの画像生成 AI で作った絵を、**背景・物・手前の層**に分けて重ね、層ごとに違う速さで動かすレイアウトです。絵の描き込みは AI に任せ、文字と動きはこれまでどおり台本から付けます。

```jsonc
{
  "id": "hot-cold",
  "layout": "layered",
  "content": {
    "camera": "pan",                                             // pan: 横へ流れる / zoom: ゆっくり寄る / none
    "background": { "src": "layered/vending/background.jpg" },   // 背景 (少しぼかして物を目立たせる。blur で調整)
    "foreground": { "src": "layered/vending/foreground.png" },   // 手前の飾り (省略可。背景透過の PNG)
    "objects": [
      { "id": "machine", "src": "layered/vending/machine.png", "x": 0.52, "y": 0.85, "height": 0.64, "enter": "fade", "effect": "glow" },
      { "id": "cold", "src": "layered/vending/can-cold.png", "x": 0.21, "y": 0.64, "height": 0.26, "motion": "float", "effect": "frost" },
      { "id": "hot", "src": "layered/vending/can-hot.png", "x": 0.79, "y": 0.64, "height": 0.26, "motion": "float", "effect": "steam" }
    ],
    "title": "同じ箱の中で、**冷やす**と**温める**",
    "callouts": [
      { "id": "cold-cap", "target": "cold", "title": "つめた〜い", "sub": "約5℃", "tone": "accent" }
    ]
  },
  "lines": [
    { "text": "しかもこの箱、**冷たい**飲み物と、", "reveal": ["cold", "cold-cap"], "focus": ["cold"] }
  ]
}
```

| objects のキー | 説明 |
|---|---|
| `src` | 物の画像。**背景が透明な PNG** にする（`public/` からの相対パス or https URL） |
| `prompt` | `src` の代わりに、画像生成 AI に描かせる絵の指示（下の「絵を画像生成 AI に自動で描かせる」）。`background` / `foreground` にも書ける |
| `x` / `y` | 物の中心の横位置 / 足もと（下端）の縦位置。画面の幅・高さを 1 とした割合（`x: 0.5` で中央、`y: 0.85` で下から15%の所に立つ） |
| `height` | 物の高さ（画面の高さを 1 とした割合）。幅は画像の縦横比から決まる |
| `enter` | 出方。`pop`（弾んで出る・既定）/ `drop`（上から落ちて弾む）/ `rise`（下からふわっと）/ `fade`（じわっと） |
| `motion` | 出たあとの動き。`none`（既定）/ `float`（ふわふわ浮かぶ）/ `sway`（ゆらゆら揺れる） |
| `effect` | コードで足す効果。`none`（既定）/ `steam`（湯気と温かい光）/ `frost`（冷気の粒と冷たい光）/ `glow`（後ろから照らす光と足もとの照り返し） |
| `shadow` | 足もとの影（既定 `true`。宙に浮かせる物は `false`） |

- 物は `reveal` で出て、`focus` で少し大きくなって光り、ほかの物は暗くなります。注釈（`callouts`）は `target` の物の位置から自動で置かれ、物と一緒に流れます
- `camera: "pan"` では背景はゆっくり・物はふつう・手前は速く横へ流れ、立体的に見えます。`zoom` は手前ほど大きく寄ります
- サンプル: `templates/sample-layered.json`（自販機の2場面・約30秒）。`public/layered/vending/` の絵は**仕組みを試すための仮の絵**（図形で描いたもの）なので、画像生成 AI で作った絵に差し替えて使ってください

**絵を画像生成 AI に自動で描かせる（`prompt`）**

`src` の代わりに `prompt`（何を描くかの指示）を書くと、`npm run images` が画像生成 AI で絵を作って `src` を書き込みます。動画生成アプリで「AIイラスト（重ね絵）」を選んだときは、台本を書く AI が `prompt` を書き、この処理も自動で行います。

```jsonc
"meta": { "imageStyle": "やわらかい陰影のアニメ調の立体イラスト、夕暮れのあたたかい光" },  // 全部の絵に共通の絵柄
...
"background": { "prompt": "日本の住宅街の夕暮れの通り。電柱と電線、遠くにマンションの灯り" },
"objects": [
  { "id": "cold", "prompt": "冷えた青い炭酸飲料の缶を少し傾けて。表面に細かい水滴", "x": 0.21, "y": 0.64, "height": 0.26 }
]
```

```bash
export GEMINI_API_KEY=...        # OpenAI で描くなら IMAGE_PROVIDER=openai と OPENAI_API_KEY=...
npm run images                   # → public/generated/ に絵を作り、script.json の src を書き込む
npm run audio && npm run render
```

- 物の絵は真っ白な無地の背景で描かせ、外周につながった白を消して透明にし、余白を詰めます（物の内側の白は残ります。真っ白な物は背景と区別しにくいので、色や影の付け方も `prompt` に書いてください）。背景は 1920×1080 に切りそろえます
- 絵には文字を入れないよう、決まりごと（文字・ロゴなし、人物なし など）を自動で足して頼みます
- 絵は `public/generated/` に、指示の内容から決まる名前で保存します。**同じ指示なら作り直さずに使い回す**ので、修正で1つの場面だけ直したときもほかの絵はそのまま。同じ物を別の場面に出すときは `prompt` を同じにすると、同じ絵になります。絵を作り直したいときは `prompt` を少し変えるか、`public/generated/` の該当ファイルを消します
- キーがない・作れなかった（安全性の判定で断られた など）絵は、`prompt` を書いた仮の枠で表示されます。`npm run images` の最後に、作れなかった絵とその理由が出ます
- 見本: `templates/sample-layered-ai.json`（`sample-layered.json` と同じ2場面を `prompt` で書いたもの）

**画像生成 AI で素材を作るコツ**（手で作るとき）

- **1枚に1つずつ**作ります（背景・物ごとに別の画像）。物は「背景は透明（または真っ白な無地）」と指定し、真っ白で出てきたら背景を消すツールで透明にします
- **絵に文字を入れない**ように指定します（崩れやすいため）。見出し・注釈・数字はこのレイアウトで重ねます
- 絵柄をそろえるため、同じ回の素材は同じ言い回し（例:「アニメ映画の背景美術風」「やわらかい陰影の立体イラスト」）を毎回入れ、できれば同じ会話の中で続けて作ります
- 背景は 16:9（1920×1080 以上）、物は高さ 700px 以上あると、寄っても粗くなりません
- 指示文の例
  - 背景: 「日本の住宅街の夕暮れ、電柱と電線、遠くに街の灯り、アニメ映画の背景美術風、人物なし、文字なし、16:9」
  - 物: 「日本の白い自動販売機を正面やや右から、やわらかい陰影の立体イラスト、背景は透明、文字やロゴなし」
  - 手前: 「画面の左下と右下にだけ、ぼけた植え込みの葉、ほかは透明、文字なし、16:9」
- 説明図として正しいかは必ず人の目で確かめてください（AI は仕組みの絵をもっともらしく間違えることがあります）。素材は各サービスの利用規約で動画への使用が許可されているものを使ってください

### 動画全体の設定（meta）

| キー | 既定値 | 説明 |
|---|---|---|
| `title` | （title シーンのタイトル） | 動画タイトル。概要欄ファイルとサムネイルの既定値に使う |
| `format` | `landscape` | 画面の向き。`landscape`: 横 1920×1080 / `vertical`: 縦 1080×1920 の YouTube ショート（`npm run render:shorts` で書き出す。上記「YouTube ショート（縦の動画）」） |
| `theme` | `kids` | `kids`（空色×はっきりした色×太い縁取り・子ども向け）/ `clean`（落ち着いた青×紺）/ `pop`（クリーム地・太枠・黄色マーカー・縁取り字幕）/ `dark`（濃紺地・テック系）/ `paper`（生成り色の紙・紺×朱×墨・明朝の見出し。図解ドキュメンタリー風。下記） |
| `style` | `3d` | `3d`: カードに厚み・立体的な出現（`animation: "auto"` のとき）・傾いて揺れるカメラ・奥へ続く床と回る積み木の背景・タイトル/章扉/エンディング/サムネイルに 3D オブジェクト / `flat`: 従来の平面デザイン。`scene3d` レイアウトはどちらでも 3D。`paper` テーマは常に `flat` で描く |
| `header` | なし | `{ label: "図解 No.01", title: "半導体の回路を焼く機械" }`。`paper` テーマで左上に出す柱。シーンに `chapter` があれば `title` の代わりにそれを出す |
| `imageStyle` | なし | `layered` の `prompt` で描かせる絵すべてに共通の絵柄（例: `"やわらかい陰影のアニメ調の立体イラスト、明るい色"`）。各 `prompt` の後ろに足して、動画全体の絵柄をそろえる |
| `transition` | `slide` | シーン切り替え: `slide` / `slideUp` / `wipe` / `zoom` / `circle` / `fade` / `none`（シーンごとに `transition` で上書き可） |
| `animation` | `auto` | 要素の出現: `auto`（レイアウトごとのおすすめ。`style: "3d"` では立体版に置き換わる）/ `fadeUp` / `pop` / `slideLeft` / `slideRight` / `zoom` / `blur` / `flip` / 立体の `rise3d`（飛び出す絵本のように起き上がる）/ `drop3d`（手前から飛んできて着地）/ `swing3d`（扉のように回り込む）/ `flip3d`（裏返る）/ `none`（シーンごとに `animation` で上書き可） |
| `camera` | `subtle` | シーン中のゆっくりズーム（3D スタイルでは回り込み・傾き・揺れも）。`none` で止める |
| `animatedBackground` | `true` | 背景の模様・図形（3D スタイルでは床と積み木）を動かす |
| `progressBar` | `true` | 画面下端の進行バー（章の区切り付き） |
| `finish` | テーマで決まる | 画面全体の仕上げ `{ grain, vignette }`。`grain`: フィルムのような細かい粒子（`paper` テーマで既定オン）/ `vignette`: 四隅を少し暗くする（既定オン）。重ねた絵や図解が「作りもの」に見えにくくなる |
| `subtitle` | `{ enabled: true, style: "auto" }` | `style`: `box`（帯）/ `outline`（縁取り文字）/ `auto`（テーマ既定）。YouTube の字幕機能だけ使うなら `enabled: false` |
| `sfx` | `{ enabled: true, volume: 0.5, reveal: true, transition: true }` | 効果音。`reveal` = 出現時の pop、`transition` = 切り替え時の whoosh |
| `bgm` | なし | `{ src: "bgm/track.mp3", volume: 0.18, duckVolume: 0.07 }`。`public/` に置いた音源をループ再生し、ナレーション中は `duckVolume` まで下げる。前後は自動フェード |
| `avatar` | カワウソ (同梱) | 右下で喋るキャラクター。**省略時は同梱のカワウソ（`public/avatar/`）の顔が丸い枠で出る**。動くのは口だけ。`false` で非表示。自前の画像なら `{ "type": "image", "open": "avatar/open.png", "half": "avatar/half.png", "closed": "avatar/closed.png" }`（口を開けた/半開き/閉じた画像。`half` は省略可）。`framing`: `face`（既定。顔だけを丸い枠で）/ `full`（画像の全体）。`face`: 丸く切り出す位置 `{ "x": 0.47, "y": 0.29, "size": 0.74 }`（画像の幅を 1 とした割合で、丸の中心と直径。既定は同梱のカワウソの顔）。`{ "type": "builtin" }` で画像なしの丸顔キャラ。`name` で名札、`size` で大きさ（既定: 丸い枠の直径 220 / 全身・builtin の高さ 250） |
| `subscribePopup` | なし | `{ sceneId: "sec2", text?: "チャンネル登録" }`。指定シーンの冒頭に約4秒、登録ボタンのクリック演出を右上に出す |
| `youtube` | なし | 投稿用の文言 `{ titles: [タイトル候補], summary: "概要欄の冒頭", tags: [タグ], hashtags: [ハッシュタグ], sources: [{ label: "出典", url? }] }`。台本を書く AI が一緒に書く。`npm run youtube` の概要欄・タグ・投稿シートに使う |
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

**既定は子ども向け**（`--audience kids`）です。小学3年生がわかる言葉・話しかける口調（「〜だよ」「〜かな？」）・身近なたとえで書き、内容のシーンの半分以上を `scene3d`（3D オブジェクト）で見せ、「問いかけ → こたえ → りゆう → おさらい」の順に構成します。配色は kids テーマになります。

```bash
export OPENAI_API_KEY="sk-..."
npm run script -- "雨はどうしてふるのかを解説して"                 # プロンプトから (子ども向け・3D)
npm run script -- --url https://example.com/article              # 記事URLから (子ども向けにかみくだく)
npm run script -- --audience general "Remotionの魅力を解説して"   # 大人向けの解説
npm run script -- --theme pop "…"                                # テーマも同時に指定 (keep = 既存の台本のまま)
npm run audio && npm run build:youtube                           # いつもの流れへ
```

| オプション | 既定値 | 説明 |
|---|---|---|
| `--audience` | `kids` | `kids`: 子ども向けのやさしい解説 + 3D オブジェクト中心 / `general`: 一般向け（です・ます調。`scene3d` は2〜3シーンに1回ほど） |
| `--theme` | `auto` | `auto`: kids なら kids テーマ・general なら既存の台本のテーマ / `keep`: 既存の台本のまま / テーマ名 |

| 環境変数 | 既定値 | 説明 |
|---|---|---|
| `OPENAI_API_KEY` | （必須） | APIキー |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI互換エンドポイント（Ollama なら `http://localhost:11434/v1`） |
| `SCRIPT_MODEL` | `gpt-4o-mini` | モデル名（JSON mode 対応のものを推奨） |

- 生成結果は `public/script.json` に**上書き**されます。ただし既存の `meta` の見た目の設定（BGM・アバター・`style` など）は引き継ぎ、タイトル・サムネイル文言・登録ポップアップの位置だけ LLM の提案で差し替えます（テーマは `--theme` の規則で決まる）
- スキーマ検証・要素IDの整合性チェック（存在しない 3D の形キーも含む）を通らない場合は、エラー内容を渡して1回だけ自動リトライします
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
- 素材集: `templates/sample-token-saving-18scenes.json`（約9分のフルデモ — pop テーマ・キャラクター・登録ポップアップ・statement・outro 入り）、`templates/sample-kids-3d.json`（子ども向け・3D オブジェクト中心の約3分のデモ）、`templates/zukai-02-vending-machine.json`（paper テーマ・3D の場面 (preset) を使った自販機の話）、`templates/sample-layered.json`（画像を重ねる場面 `layered` の試作・約30秒）と `templates/sample-claude-code-7scenes.json`（7シーンのコンパクト版・旧形式）。シーン単位でコピーして組み合わせて使えます

## 図解ドキュメンタリー風（paper テーマ + 3D）

`public/script.json` は、紙の質感・紺×朱×墨の3色・明朝の見出しで作る「図解」スタイルのサンプル（半導体の露光装置の話・8シーン）です。

- `meta.theme: "paper"` にすると、見出しは画面上部中央の明朝、左上に `meta.header` の柱、章扉（`section`）も紙の上に静かに出ます。`**強調**` はマーカーではなく朱色の文字になります
- 紙の図解なので、`meta.style` が `3d` でもカードの厚みや床・積み木の背景は付けず、平面で描きます
- 落ち着いた見せ方にするため、サンプルでは `transition: "fade"`・`avatar: false`・`progressBar: false`・出現音なしにしています
- `scene3d` レイアウトは three.js（`@remotion/three`）で描きます。作り込んだ 3D の場面は `preset` で選びます（上の「scene3d の場面（preset）」の表）
- preset にない題材は、`parts`（部品）を並べて**組み立てる**形で、同じ絵本風（ベタ塗り + 黒い輪郭線）の 3D 図解を作れます（下記）

### scene3d の組み立て形式（parts）

自販機の透視図のような作り込んだ場面を、three.js を書かずに台本だけで作る形です。動画生成アプリで「3D図解（自販機風）」を選ぶと、AI がこの形で題材の物を組み立てます。見本は `templates/sample-zukai-3d.json`（電子レンジのしくみ・3シーン）。

```jsonc
{
  "layout": "scene3d",
  "content": {
    "title": "電子レンジの中には**電波を出す装置**がある",
    "parts": [
      // 単位は m。at は部品の足もと (底面の中心)、y = 0 が床。x は右・z は手前が正
      { "id": "shell", "shape": "box", "size": [3.2, 1.9, 2.2], "at": [0, 0, 0], "color": "navy", "ghost": true },
      { "id": "cup", "shape": "cylinder", "size": [0.55, 0.6, 0.55], "at": [-0.45, 0.2, 0.1], "color": "red", "label": "コップ" },
      { "id": "magnetron", "shape": "box", "size": [0.6, 0.5, 0.6], "at": [1.2, 1.25, -0.4], "color": "gold", "text": "発振" }
    ],
    "flows": [{ "id": "waves", "path": [[0.9, 1.5, -0.4], [-0.45, 1.65, 0.1], [-0.45, 0.9, 0.1]], "kind": "dots", "pipe": false }],
    "callouts": [{ "id": "c-mag", "target": "magnetron", "title": "マグネトロン", "sub": "電波を出す装置", "tone": "accent" }],
    "camera": { "view": "right", "zoomTo": "cup" }
  }
}
```

| キー | 内容 |
|---|---|
| `parts[].shape` | 基本形 `box` / `plate` / `cylinder` / `sphere` / `hemisphere` / `cone` / `pyramid` / `roof` / `ring` / `arrow`、作り込んだ物 `vendingMachine` / `vendingMachineOpen` / `fridge` / `house` / `bolt`、または 3D オブジェクトのキー（`src/three/catalog.ts`） |
| `parts[].size` / `at` / `turn` / `tilt` | 大きさ `[幅, 高さ, 奥行き]`・足もとの位置・向き（度）・傾き（度） |
| `parts[].color` | `navy` / `navy-dark` / `navy-light` / `sky` / `cold` / `red` / `orange` / `hot` / `gold` / `green` / `brown` / `purple` / `paper` / `beige` / `metal` / `gray` / `white` / `black` / `ink` か `#RRGGBB` |
| `parts[].text` / `label` | 正面（薄い板は上面）に書く文字（box / plate / cylinder）/ 上に浮かぶ名札 |
| `parts[].ghost` | 半透明の外箱にして中の部品を見せる |
| `parts[].enter` / `motion` | 出方 `pop` / `drop` / `grow` / `fade`、出たあとの動き `none` / `spin` / `bob` / `pulse` |
| `parts[].repeat` | `{ "count": 18, "columns": 6, "gap": 1.0 }` で同じ物を奥へ並べる（数の多さ） |
| `flows[]` | 折れ線 `path` に沿った管と流れる玉。`kind`: `heat`（熱の玉）/ `cold`（冷たさの玉）/ `dots`（色の粒）/ `arrow`（伸びる矢印）。`pipe` / `loop` / `speed` |
| `callouts[]` | `target` の部品・流れを引き出し線で指す注釈（4つまで。箱の位置は自動） |
| `camera` | `view`: `front` / `left` / `right` / `top` / `low`。距離は全体が収まるよう自動。`zoomTo` を書くと reveal `"zoom"` でその部品へ寄る |

要素ID（reveal / focus に書けるもの）は、部品・流れ・注釈の各 `id` と `title` / `stat`（`zoomTo` があれば `zoom`）。reveal しない部品はシーン冒頭に順に出るので、説明の順に部品を reveal すると組み立てていくように見えます。
- 明朝体（Noto Serif JP）は `public/fonts/` に同梱しています（`OFL-NotoSerifJP.txt` がライセンス）

> 3D の場面は WebGL で描くため、GPU のない環境（Linux サーバーや CI）では `npm run render -- --gl=swangle` のようにソフトウェア描画を指定すると確実です。

元の YouTube 向けサンプル（約9分・pop テーマ）は `templates/sample-token-saving-18scenes.json` に移しました。使うときは `public/script.json` に上書きコピーしてください。

## デザインの変更

配色・カードの枠や影・字幕の既定スタイルは `src/themes/index.ts` の `THEMES`（kids / clean / pop / dark / paper）に集約しています。新しいテーマを足すときは `THEMES` にエントリを追加し、`src/schemas.ts` の `themeNameSchema` に名前を足します。3D スタイルのカードの厚みは `with3d`（`DEPTH_3D`）、厚みの色は各テーマの `colors.edge`、`scene3d` の舞台の色は `colors.stage` / `colors.stageEdge`、背景の積み木の色は `toys` です。テーマの `chrome: "editorial"` で見出し・章扉の流儀（paper 風）を、`fonts.display` で見出し・数字のフォントを切り替えます。

## トラブルシューティング

- **`npm run audio` で「VOICEVOX Engine に接続できません」** — エンジンが起動していません。上記のコマンドで起動するか、`npm run audio:mock` でタイミングのみ確認してください。
- **`docker: invalid IP address: '127.0.0.1.`** — `-p` の値をシングルクォートで囲んだ古いコマンドを使っているのが原因です（Windows の cmd.exe はクォートを剥がしません）。README上部の引用符なしのコマンドを使ってください。
- **「timeline.json に … 対応するエントリがありません」** — 台本を編集した後に `npm run audio` を実行していない状態です。再実行してください。
- **レンダリングが遅い/落ちる** — `remotion.config.ts` で同時実行数をメモリから自動算出しています。手動で変える場合は `npm run render -- --concurrency=4` のように指定できます。
- **音声がずれる** — `npm run audio` をやり直してください。タイムラインは常に音声の実寸から再計算されます。
- **キャラクターを別の画像にしたい** — 背景が透明な PNG を `public/avatar/` に置き、`meta.avatar` でファイル名を指定します。口を開けた画像と閉じた画像の2枚（＋任意で半開き）が必要です。口以外は同じ絵にしてください（切り替えても口しか動かないように）。顔だけを丸く見せる位置は `face`（画像の幅を 1 とした割合）で合わせ、全身を見せるなら `"framing": "full"` にします。
- **キャラクターの口が動かない／一定のリズムで動く** — 古い `timeline.json` です。`npm run audio` を再実行すると音声の音量から口パクが作られます（`audio:mock` では擬似的なリズム）。
- **`[script.json] … 要素ID "…" はシーン "…" にありません`** — `reveal` / `focus` の綴りの間違いです。メッセージに使えるIDの一覧が出ます。
- **動きが多すぎる** — `meta.animation: "fadeUp"`・`meta.transition: "fade"`・`meta.camera: "none"`・`meta.animatedBackground: false` で落ち着いた演出になります。立体的な演出をやめるときは `meta.style: "flat"`。
- **3D の描画が遅い** — GPU のない環境では、3D（`scene3d`・タイトル等に浮かぶオブジェクト）は1フレーム約0.2秒、それ以外は約0.1秒かかります（4コアの目安。3D の多い10分の動画で約40〜60分）。急ぐときは `meta.style: "flat"` にして `scene3d` を減らしてください。
- **スタジオで「Claude につながりませんでした: … UNABLE_TO_VERIFY_LEAF_SIGNATURE」** — ウイルス対策ソフト（Norton など）が HTTPS の通信を検査していて、Node がそのソフトの証明書を信頼していません。そのソフトの証明書ファイルを `NODE_EXTRA_CA_CERTS` に指定してから `npm run studio` を起動し直します（Norton の例: PowerShell で `$env:NODE_EXTRA_CA_CERTS = 'C:\ProgramData\Norton\Antivirus\wscert.pem'`）。設定をスクリプト（.ps1）に書くときは、Windows PowerShell 5.1 が BOM なしの UTF-8 を正しく読めないので、日本語のコメントを入れないか BOM 付きで保存してください
- **3D の部分が真っ白・真っ黒になる / WebGL のエラーが出る** — Chrome が WebGL を使えていません。`npm run render -- --gl=angle` または `--gl=swangle`（遅いが確実なソフトウェア描画）を試してください。

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

- 手動実行では `audience`（`kids`（既定）/ `general`）と `theme`（`auto`（既定）/ `keep` / `kids` / `clean` / `pop` / `dark` / `paper`）も選べます（台本生成時のみ。API からは `client_payload.audience` / `client_payload.theme`。省略時は kids / auto）

**実行の流れ**: VOICEVOX Engine を service コンテナで起動 → `npm ci` → (台本生成) → `npm run audio` → `npm run render` → `npm run thumbnail` / `npm run youtube` → `video.mp4`・`thumbnail.png`・`youtube/`（概要欄の目次・字幕）をアーティファクトに保存（30日）→ 台本生成時は `script.json` / `timeline.json` もリポジトリにコミットして戻します。

**費用**: 公開リポジトリなら無料（プライベートは無料枠2,000分/月）。10分動画1本で約30〜60分のランタイムを見込んでください（3D のシーンが多いほど長くなる。ジョブの上限は120分）。

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
│   ├── layered/         # layered の素材 (背景・物・手前の画像。vending/ はサンプル用の仮の絵)
│   ├── generated/       # 生成物: 画像生成 AI で作った絵 (npm run images / 動画生成アプリ)
│   └── fonts/           # Noto Sans JP / Noto Serif JP (可変フォント)
├── studio/              # 動画生成アプリ (npm run studio)。server.ts / pipeline.ts / store.ts / public/ (画面)
├── scripts/
│   ├── generate-audio.ts    # 音声生成 + タイムライン作成
│   ├── generate-script.ts   # プロンプト/URL → 台本自動生成 (LLM)
│   ├── generate-images.ts   # layered の prompt → 画像生成 AI で絵を作る
│   ├── generate-youtube.ts  # 概要欄の目次・字幕ファイル
│   ├── generate-sfx.ts      # 効果音の合成
│   └── lib/ (voicevox / llm / fetch-page / wav / estimate / levels / sfx / youtube / image-gen / images)
├── shared/              # 音声側とRemotion側の共通処理 (timing.ts / markup.ts)
├── templates/           # 台本サンプル（素材集。sample-kids-3d.json が子ども向け 3D のデモ）
├── docs/manual.html     # 手順書 (画面例つき。ブラウザで開く)
└── src/
    ├── Root.tsx / Slideshow.tsx / Thumbnail.tsx / data.ts / schemas.ts / elements.ts / audio-events.ts / fonts.ts
    ├── themes/          # テーマ (clean / pop / dark / paper)
    ├── three/           # 3D の場面 (three.js のモデルとカメラの動き)
    ├── animation/       # バネの設定・出現プリセット・トランジション
    ├── context/         # シーンごとの reveal / focus のタイミング
    ├── components/      # Reveal / KineticText / CountUp / DrawArrow / SubtitleLayer / AudioLayer /
    │                    # Avatar / SubscribeButton / SubscribePopup / ProgressBar / SceneBackground / Camera /
    │                    # FloatingToys (タイトル等に浮かぶ 3D オブジェクト) ...
    ├── three/           # 3D オブジェクト (catalog.ts: 形キーの一覧 / models.tsx: 形 / toon.tsx: アニメ調の材質と輪郭線 /
    │                    # stage.ts: scene3d の配置とカメラ)
    └── layouts/         # 16種のレイアウト (index.tsx が layout 名 → コンポーネントの対応表。Scene3DLayout が 3D の舞台)
```
