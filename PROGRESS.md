# 作業の進み具合（引き継ぎ用）

最終更新: 2026-10-19

図解ムービー スタジオ（テーマ → AI の台本 → VOICEVOX のナレーション → Remotion の MP4）の、YouTube 向けの品質改善とショート（縦 9:16）対応の記録です。使い方の詳細は [README.md](README.md) にあります。

## いまの状態

- ブランチは `main`。ここまでの作業はすべて GitHub（origin/main）に push 済み
- 型チェック `npm run typecheck` は通る
- 未追跡の `AIslides-movie/` は古いリポジトリの写しで、作業の対象外（コミットしない）

| コミット | 内容 |
|---|---|
| `c4e0032` | 横の動画を YouTube 向けに仕上げる（書き出しの設定・音量 -14 LUFS・絵のなじませ・粒子と周辺減光・文字の大きさ・台本の言い回し・投稿用ファイル・BGM の選択） |
| `616beef` | 縦 9:16 の YouTube ショートを作れるようにする |
| （この記録と同じコミット） | Claude につながらないときに原因を表示する・README にウイルス対策ソフトの対処を追記・この PROGRESS.md |

## できること

### 横の動画（16:9）の仕上げ — `c4e0032`

- 書き出しは YouTube の推奨（H.264 / yuv420p / BT.709 / AAC 320kbps、CRF 16）。書き出し後に音量を -14 LUFS にそろえる（`scripts/lib/finish.ts`、`npm run finish`）
- AI の絵: 切り抜いた物のふちの白いにじみを取り、背景の色になじませる。画面全体に薄い粒子と周辺減光（`meta.finish`、`src/components/FilmFinish.tsx`）
- 台本 AI に決まり文句を避けさせ、文末・文の長さに緩急を付けさせる
- 投稿用ファイル（`youtube/`）: 概要欄（目次・出典・VOICEVOX のクレジット）・タグ・投稿シート・字幕 SRT・metadata.json。スタジオに「YouTube に貼る」コピーボタンと BGM の選択（`public/bgm/`）

### 縦 9:16 ショート — `616beef`

- スタジオの形式ボタン「横 16:9 / 縦 9:16 ショート」。ショートの長さは 30 / 45 / 60 / 90 / 180 秒
- 台本に `meta.format: "vertical"`。Remotion の `Shorts`（1080×1920）で描き、カバーは `ShortsCover`。CLI は `npm run render:shorts` / `npm run cover:shorts`
- 割り付けは `src/stage.tsx` の `SHORTS`。ショートの UI に隠れる上 12%・下 20%・右 15% を避けて見出し・字幕・図解を置く。キャラクター・進行バー・登録のポップアップは出さない
- 2D の図解は安全な範囲で 1.4 倍に拡大し、flow / compare / inputOutput / stats は縦に積む
- 3D の場面（scene3d）のうち、組み立て（parts）は縦の画面のまま描き直す（`StagePortrait`・`src/three/portrait.ts` の `planPortrait`）。注釈の箱は物の上下に並べ（指す点が物の上半分なら上・下半分なら下）、残った範囲いっぱいに物が写るようカメラを寄せる。数字カードは範囲の右上。文字は 1.35 倍
- 作り込んだ場面（preset）と並べる形（objects）は、これまでどおり 16:9 の絵を幅いっぱいの帯にして置き（`StageBand`）、帯の上下にも 3D を描き足す（`canvasFrame`）。注釈・名札の文字は 1.6 倍
- layered は縦の画面で物の位置を読み、背景を 9:16 で生成する（横の絵とは別のファイル）
- 台本 AI（`WriterOptions.vertical` / `targetSec`）: 1セリフ目で結論を言い切り、title / section / outro を使わない短い構成。上限は3分（`SHORTS_MAX_SEC`）
- 投稿用ファイル: タイトル候補の末尾・ハッシュタグとタグの先頭に `#Shorts`。目次（チャプター）は書かない。投稿シートはショート用（1分超え・3分超えの注意つき）

## 確かめたこと

- **横は変わっていない**: コミット前のコードと今のコードで、見本の台本6本（`templates/` と当時の `public/script.json`）の横の静止画とサムネイルを画素ごとに比べた。差は数ピクセルの描画のばらつきだけ（同じコードを2回書き出しても出る大きさ）
- **縦の 3D の組み立て（parts）を描き直したあとも横は変わっていない**（2026-10-19）: HEAD のコードと今のコードで、見本の台本7本と `20261019-337fcb` の台本の横の静止画とサムネイル（124組）を画素ごとに比べ、どれも色の差は 1 以下だった（`audio:mock` の仮の尺で、各場面の真ん中と終わり）
- **縦の 3D の組み立て**: `sample-zukai-3d` を縦にした台本（3場面・寄り・数字カードあり）と `20261019-337fcb` の 17〜29 秒の静止画で、物が帯のときより大きく写り、注釈の線が物を横切らないことを確かめた
- **縦の静止画**: 見本の台本と、全レイアウトを使った試験用の台本を、紙（paper）と pop の見た目で確かめた
- **スタジオから通しで作成**
  - 台本の読み込み: 1080×1920・47 秒（`studio-data/projects/20261019-9b2f5f`）
  - Claude の台本: 「なぜ飛行機の窓は角が丸いのか」、図解・約45秒 → 1080×1920・61 秒・6場面（`studio-data/projects/20261019-337fcb`）。台本はショートの決まりどおり（フックから始まり、title / section / outro なし、ハッシュタグの先頭が Shorts）
  - どちらも VOICEVOX が起動していなかったので、無音の仮音声

## スタジオの起動（この PC の注意）

- API キー（`ANTHROPIC_API_KEY`・`GEMINI_API_KEY`）は Windows のユーザー環境変数に入っている。新しい窓で起動すれば読み込まれる
- **Norton のウイルス対策が HTTPS を検査している**ため、Node が Anthropic の証明書を信頼できず「Claude につながりませんでした: … UNABLE_TO_VERIFY_LEAF_SIGNATURE」になることがある。起動前に Norton の証明書ファイルを指定する:

  ```powershell
  $env:NODE_EXTRA_CA_CERTS = 'C:\ProgramData\Norton\Antivirus\wscert.pem'
  npm run studio
  ```

  ふつうの PowerShell の窓では最初から入っていることが多いが、Claude アプリのターミナルの欄では入っていなかった
- 設定を .ps1 に書くときは英数字だけにする（Windows PowerShell 5.1 は BOM なしの UTF-8 を Shift_JIS として読むので、日本語のコメントが次の行を飲み込む）
- 2026-10-19 時点では、スタジオ（4300）は Claude アプリのターミナルの欄「スタジオ (4300)」で動いている

## 次にやること・残っている問題

- **ショートの 3D のうち、並べる形（objects）と作り込んだ場面（preset）はまだ帯のまま**で小さい。組み立て（parts）と同じように縦の画面で組み直すなら、`src/layouts/Scene3DLayout.tsx`（`cameraPose`・`projectToScreen` が 1920×1080 前提）と `src/three/presets.tsx`（カメラ・注釈の位置を場面ごとに決めている）。横の描画は変えないこと
- 縦の組み立て（parts）で寄る（`camera.zoomTo`）と、寄った先のまわりの物が上の注釈の箱の下に入ることがある（箱は不透明なので文字は読める）
- 静止画を続けて書き出すと、Remotion がときどき止まる（変更と関係のない 2D の場面でも起きた。同じフレームを書き直すと通る）。`scripts/_stills.ts` で多く書き出すときは4枚ずつに分け、止まったら書き直す
- **AIイラスト（layered）のショートは、画像生成 AI での通しが未確認**: 9:16 の背景と、縦の配置で台本 AI が物を置けるかを1本作って確かめる
- **VOICEVOX の実音声で未確認**: 仮音声の尺は概算。実際の声で作ると尺が変わる（45 秒指定が仮音声で 61 秒になった）
- ショートでも、compare の左右2枚ずつ・checklist の4項目などは字幕にかかる。台本 AI には項目を絞るよう指示済みだが、手で書いた台本では注意
- `npm run script`（CLI の台本生成）にはショート用のオプションがない（スタジオからは作れる）
- `public/script.json` と `public/timeline.json` は別の動画どうしの組み合わせになっている（作業前からそうだった。`npm run audio` で作り直せば合う）
- 試験で作った動画（`20261019-9b2f5f`「自販機の冷温の秘密（ショート試験）」）がスタジオの一覧に残っている。不要なら `studio-data/projects/` から消す

## 作業するときの注意

- 作業ツリーは CRLF（`git config core.autocrlf true`）
- スタジオが生成中のあいだは `public/script.json` などを一時的に書き換えるので、`npm run audio` などを同時に動かさない
- 横の動画の見た目を変えないよう、縦向けの変更は `useVertical()` / `useStage()` で分ける。確かめるときは、横の静止画を変更の前後で画素比較する
