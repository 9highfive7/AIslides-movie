import { z } from 'zod';

/**
 * public/script.json と public/timeline.json のスキーマ。
 * 型はここから z.infer で導出するので、台本の形式はこのファイルが唯一の基準。
 * 追加項目はすべて省略可能 (既定値あり) なので、旧形式の台本もそのまま動く。
 */

/** 要素の出現アニメーション。auto はレイアウトごとのおすすめを使う */
export const revealPresetSchema = z.enum([
  'auto',
  'fadeUp',
  'pop',
  'slideLeft',
  'slideRight',
  'zoom',
  'blur',
  'flip',
  /** 以下は立体的な出現 (style: "3d" で auto を使うと自動でこちらになる) */
  'rise3d',
  'drop3d',
  'swing3d',
  'flip3d',
  'none',
]);

/** シーン切り替え。指定したシーンに「入ってくるとき」の演出 */
export const transitionSchema = z.enum([
  'slide',
  'slideUp',
  'wipe',
  'zoom',
  'circle',
  'fade',
  'none',
]);

export const sfxNameSchema = z.enum(['pop', 'whoosh', 'ding', 'click', 'none']);

export const narrationLineSchema = z.object({
  /** 字幕に表示するテキスト。**強調** でハイライトできる */
  text: z.string(),
  /** 読み上げ用テキスト (省略時は text からマークアップを除いたもの)。読みを直したいときに使う */
  speech: z.string().optional(),
  /** このセリフの開始時に出現させる要素ID */
  reveal: z.array(z.string()).default([]),
  /** このセリフの間だけ強調する要素ID (他の要素は薄くなる) */
  focus: z.array(z.string()).default([]),
  /** セリフ開始時に鳴らす効果音 (省略時: reveal があれば pop) */
  sfx: sfxNameSchema.optional(),
});

const sceneBaseSchema = {
  id: z.string().min(1),
  heading: z.string().optional(),
  label: z.string().optional(),
  /** 左下に表示する章タグ (例: "02 仕組み") */
  chapter: z.string().optional(),
  /** 右上に表示するバッジ (例: "おすすめ") */
  badge: z.string().optional(),
  /** このシーンに入るときのトランジション (省略時: meta.transition) */
  transition: transitionSchema.optional(),
  /** このシーンの要素の出現アニメーション (省略時: meta.animation) */
  animation: revealPresetSchema.optional(),
  lines: z.array(narrationLineSchema).min(1),
};

/** lucide-react のアイコンキー (例: "file-text")。未登録キーはプレースホルダーになる */
const iconSchema = z.string();

const ioBoxSchema = z.object({
  id: z.string(),
  icon: iconSchema.optional(),
  title: z.string(),
  body: z.string().optional(),
});

/**
 * 3D オブジェクト (src/three/catalog.ts の形キー)。未登録キーは「?」の箱になる。
 * count で同じ物を並べて数を見せ、size で大きさの違いを見せる。
 */
const object3dSchema = z.object({
  id: z.string(),
  /** 形のキー (例: "apple" "sun" "cube")。一覧は src/three/catalog.ts */
  shape: z.string(),
  /** 物の下に出る名札 */
  label: z.string().optional(),
  /** 色名 ("red" "blue" など) または #RRGGBB。省略時は形ごとの既定色 */
  color: z.string().optional(),
  /** 同じ物をいくつ並べるか (数を見せる) */
  count: z.number().int().min(1).max(12).default(1),
  /** 大きさの倍率 (大小の比較に使う) */
  size: z.number().min(0.3).max(2.5).default(1),
});

/** タイトル・章扉のまわりに浮かべる 3D オブジェクトの形キー (style: "3d" のとき) */
const floatingObjectsSchema = z.array(z.string()).max(6).optional();

/** scene3d: 3D オブジェクトを舞台に並べる */
const scene3dObjectsSchema = z.object({
  /**
   * 並べ方。row: 横に並べる / flow: 矢印でつなぐ (arrow-1, arrow-2, ...) /
   * cycle: 輪にして矢印で一周させる (arrow-1 〜 arrow-N)
   */
  arrangement: z.enum(['row', 'flow', 'cycle']).default('row'),
  objects: z.array(object3dSchema).min(1).max(6),
  caption: z.string().optional(),
});

/** scene3d: 作り込んだ 3D の場面 (スマホのチップ・自販機など) を preset で選ぶ */
const scene3dPresetSchema = z.object({
  /**
   * 3D の場面の種類 (three.js で描画)。要素IDは src/elements.ts の SCENE3D_ELEMENT_IDS を参照。
   *   phoneChip:      スマホの箱が開き、基板の上のチップへカメラが寄っていく
   *   vendingCount:   自販機が1台 → 引くと同じ自販機がずらっと並んでいる (台数の多さ)
   *   vendingHotCold: 自販機の左右に「冷たさ」と「熱」の玉が飛んでくる
   *   vendingCutaway: 自販機の扉が開き、冷媒の管の中を「熱」が運ばれていく (ヒートポンプ)
   *   heatReuse:      冷蔵庫は熱を外へ捨てる / 自販機は温める側へ回す (比較)
   *   vendingEnergy:  自販機 → 稲妻 → 家。カレンダーがめくれて「何か月分」かを見せる
   */
  preset: z.enum(['phoneChip', 'vendingCount', 'vendingHotCold', 'vendingCutaway', 'heatReuse', 'vendingEnergy']),
  /** 画面上部中央の明朝の一文 (reveal "title"。**強調** は朱色) */
  title: z.string().optional(),
  /** 引き出し線で指す注釈 (phoneChip 用。reveal "label" で出る) */
  label: z.object({ title: z.string(), sub: z.string().optional() }).optional(),
  /** 数字カード (reveal "stat" で出る) */
  stat: z
    .object({
      kicker: z.string().optional(),
      value: z.string(),
      note: z.string().optional(),
    })
    .optional(),
  /**
   * 3D の物を引き出し線で指す注釈。場面ごとに決まった位置 (スロット) に順番に入る。
   * 例: vendingCutaway は 吸熱 / 圧縮 / 放熱 / 膨張 の4か所
   */
  callouts: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        sub: z.string().optional(),
        /** accent: 紺 / warning: 朱 / muted: 灰 / normal: 墨 */
        tone: z.enum(['normal', 'accent', 'warning', 'muted']).default('normal'),
      }),
    )
    .max(4)
    .default([]),
});

/** 3D の座標 [x, y, z] (m)。x は右・y は上・z は手前が正 */
const vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

/** scene3d (組み立て): 部品1つ */
const buildPartSchema = z.object({
  id: z.string(),
  /** 形。基本形 (box / cylinder ...)・作り込んだ物 (vendingMachine ...)・3D オブジェクトのキー (src/three/catalog.ts) */
  shape: z.string(),
  /** 大きさ [幅, 高さ, 奥行き] (m)。作り込んだ物・3D オブジェクトは高さだけ使い、縦横比を保つ */
  size: vec3Schema.optional(),
  /** 足もと (底面の中心) の位置。y = 0 が床 */
  at: vec3Schema.default([0, 0, 0]),
  /** 向き (度。y 軸まわり、正で左回り) */
  turn: z.number().default(0),
  /** 傾き (度。z 軸まわり。円柱を寝かせて管にするなど) */
  tilt: z.number().default(0),
  /** 色名 (BUILD_COLORS) か #RRGGBB */
  color: z.string().optional(),
  /** 正面 (薄い板なら上面) に書く文字 */
  text: z.string().optional(),
  /** 上に浮かぶ名札 */
  label: z.string().optional(),
  /** 半透明にする (中を見せる外箱) */
  ghost: z.boolean().default(false),
  /** 出方。pop: 弾んで出る / drop: 上から落ちる / grow: 下から伸びる / fade: ふわっと出る */
  enter: z.enum(['pop', 'drop', 'grow', 'fade']).default('pop'),
  /** 出たあとの動き。spin: 回る / bob: 浮かぶ / pulse: 脈打つ */
  motion: z.enum(['none', 'spin', 'bob', 'pulse']).default('none'),
  /** 同じ物を並べる (数の多さ)。columns 列で奥へ並べ、gap は物の中心どうしの間隔 (m) */
  repeat: z
    .object({
      count: z.number().int().min(2).max(60),
      columns: z.number().int().min(1).max(12).optional(),
      gap: z.number().min(0.1).max(20).optional(),
    })
    .optional(),
});

/** scene3d (組み立て): 管と、その中を流れる玉 (熱・冷たさ・粒) か矢印 */
const buildFlowSchema = z.object({
  id: z.string(),
  /** 通る点 (2〜16点。直線でつなぐ) */
  path: z.array(vec3Schema).min(2).max(16),
  /** heat: 熱の玉 / cold: 冷たさの玉 / dots: 色の粒 / arrow: 矢印だけ */
  kind: z.enum(['heat', 'cold', 'dots', 'arrow']).default('dots'),
  color: z.string().optional(),
  /** 管を描く (false なら玉だけが流れる) */
  pipe: z.boolean().default(true),
  /** 最後の点から最初の点へ戻って一周する */
  loop: z.boolean().default(false),
  /** 流れる速さの倍率 */
  speed: z.number().min(0.2).max(4).default(1),
});

/**
 * scene3d: 部品を組み立てて作る 3D の図解 (自販機の場面と同じ絵本風の見た目)。
 * 題材ごとに three.js を書かなくても、基本形の組み合わせ・流れ・注釈で作り込んだ場面を作れる。
 */
const scene3dBuildSchema = z.object({
  /** 画面上部中央の明朝の一文 (reveal "title"。**強調** は朱色) */
  title: z.string().optional(),
  parts: z.array(buildPartSchema).min(1).max(30),
  flows: z.array(buildFlowSchema).max(6).default([]),
  /** 部品か流れを引き出し線で指す注釈 (箱の位置は自動で決まる) */
  callouts: z
    .array(
      z.object({
        id: z.string(),
        /** 指す部品か流れの id */
        target: z.string(),
        title: z.string(),
        sub: z.string().optional(),
        tone: z.enum(['normal', 'accent', 'warning', 'muted']).default('normal'),
      }),
    )
    .max(4)
    .default([]),
  /** 数字カード (reveal "stat" で出る) */
  stat: z
    .object({
      kicker: z.string().optional(),
      value: z.string(),
      note: z.string().optional(),
    })
    .optional(),
  /** カメラ。全体が収まる距離は自動で決まる。zoomTo があれば reveal "zoom" でその部品へ寄る */
  camera: z
    .object({
      view: z.enum(['front', 'left', 'right', 'top', 'low']).default('right'),
      zoomTo: z.string().optional(),
    })
    .default({ view: 'right' }),
});

const compareItemSchema = z.object({
  id: z.string(),
  icon: iconSchema.optional(),
  title: z.string(),
  body: z.string().optional(),
  tone: z.enum(['normal', 'warning']).default('normal'),
});

const sceneSchema = z.discriminatedUnion('layout', [
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('title'),
    content: z.object({
      kicker: z.string().optional(),
      title: z.string(),
      subtitle: z.string().optional(),
      objects: floatingObjectsSchema,
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('compare'),
    content: z.object({
      leftTitle: z.string(),
      rightTitle: z.string(),
      left: z.array(compareItemSchema),
      right: z.array(compareItemSchema),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('flow'),
    content: z.object({
      steps: z
        .array(
          z.object({
            id: z.string(),
            icon: iconSchema.optional(),
            title: z.string(),
            body: z.string().optional(),
          }),
        )
        .min(2),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('inputOutput'),
    content: z.object({
      input: ioBoxSchema,
      transform: z.object({
        id: z.string(),
        label: z.string(),
      }),
      output: ioBoxSchema,
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('bullets'),
    content: z.object({
      items: z
        .array(
          z.object({
            id: z.string(),
            icon: iconSchema.optional(),
            title: z.string(),
            body: z.string().optional(),
          }),
        )
        .min(1),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('stats'),
    content: z.object({
      items: z
        .array(
          z.object({
            id: z.string(),
            value: z.string(),
            label: z.string(),
            body: z.string().optional(),
            /** 数字の上の小見出し (例: "1つ目") */
            kicker: z.string().optional(),
            /** カード下端の出典・注記 (例: "ASMLの公表価格を円に換算") */
            note: z.string().optional(),
            /** warning: 朱色で目立たせる (paper テーマでは枠も朱色になる) */
            tone: z.enum(['normal', 'warning']).default('normal'),
            /** カード右下に付ける丸い印 (例: "日本") */
            stamp: z.string().optional(),
          }),
        )
        .min(2),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('share'),
    content: z.object({
      /** グラフの上に出す題 (例: "世界の半導体シェア（1988年）") */
      title: z.string().optional(),
      /** 1本の帯を区切って割合を見せる。value の合計で幅を割る */
      segments: z
        .array(
          z.object({
            id: z.string(),
            /** 帯の中に大きく出す値 (例: "約5割") */
            display: z.string(),
            /** 値の下の小さな説明 (例: "日本製") */
            label: z.string().optional(),
            value: z.number().positive(),
            tone: z.enum(['warning', 'accent', 'muted']).default('accent'),
          }),
        )
        .min(1)
        .max(5),
      /** 帯の下の出典・注記 */
      source: z.string().optional(),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('section'),
    content: z.object({
      number: z.string().optional(),
      title: z.string(),
      subtitle: z.string().optional(),
      objects: floatingObjectsSchema,
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('table'),
    content: z.object({
      headers: z
        .array(
          z.object({
            label: z.string(),
            tone: z.enum(['normal', 'accent']).default('normal'),
          }),
        )
        .min(2)
        .max(3),
      rows: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            note: z.string().optional(),
            cells: z
              .array(
                z.object({
                  text: z.string(),
                  tone: z.enum(['normal', 'good', 'bad']).default('normal'),
                }),
              )
              .min(1),
          }),
        )
        .min(2),
      source: z.string().optional(),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('bars'),
    content: z.object({
      caption: z.string().optional(),
      /** 棒の全幅にあたる値 (例: 割合なら 100)。省略時は items の最大値 */
      max: z.number().positive().optional(),
      items: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            value: z.number(),
            display: z.string().optional(),
            tone: z.enum(['accent', 'warning']).default('accent'),
          }),
        )
        .min(2),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('checklist'),
    content: z.object({
      items: z
        .array(
          z.object({
            id: z.string(),
            text: z.string(),
            note: z.string().optional(),
          }),
        )
        .min(2),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('axes'),
    content: z.object({
      xAxis: z.object({ label: z.string() }),
      yAxis: z.object({ label: z.string() }),
      hint: z.string().optional(),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('statement'),
    content: z.object({
      /** 大きく見せる一文。**強調** でマーカーが引かれる。改行は \n */
      text: z.string(),
      sub: z.string().optional(),
      icon: iconSchema.optional(),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('image'),
    content: z.object({
      /** public/ からの相対パス (例: "images/photo.jpg") または https:// のURL */
      src: z.string(),
      caption: z.string().optional(),
      fit: z.enum(['cover', 'contain']).default('cover'),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('ranking'),
    content: z.object({
      items: z
        .array(
          z.object({
            id: z.string(),
            /** 表示する順位 (省略時は配列の順で 1, 2, 3, ...) */
            rank: z.number().int().positive().optional(),
            icon: iconSchema.optional(),
            title: z.string(),
            body: z.string().optional(),
          }),
        )
        .min(2)
        .max(5),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('scene3d'),
    /**
     * objects で物を並べる形 (scene3dObjectsSchema)・preset で作り込んだ場面を選ぶ形 (scene3dPresetSchema)・
     * parts で部品を組み立てる形 (scene3dBuildSchema) のどれか
     */
    content: z.union([scene3dObjectsSchema, scene3dPresetSchema, scene3dBuildSchema]),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('outro'),
    content: z.object({
      title: z.string().default('ご視聴ありがとうございました'),
      message: z.string().optional(),
      /** 登録ボタンのクリック演出 */
      subscribe: z.boolean().default(true),
      /** YouTube の終了画面 (関連動画) を置く枠を表示する */
      endScreen: z.boolean().default(true),
    }),
  }),
]);

export const themeNameSchema = z.enum(['kids', 'clean', 'pop', 'dark', 'paper']);

/** 同梱のカワウソ画像 (578×720) で、顔を丸く切り出す位置 (画像の幅を 1 とした割合) */
const OTTER_FACE = { x: 0.47, y: 0.29, size: 0.74 };

export const metaSchema = z.object({
  /** 動画タイトル (サムネイル・概要欄の既定値に使う) */
  title: z.string().optional(),
  /** 配色テーマ */
  theme: themeNameSchema.default('kids'),
  /**
   * 見た目の方式。3d: カードに厚み・立体的な出現・3D のカメラ・背景の床と浮かぶ図形・
   * タイトルや章扉に 3D オブジェクト (scene3d レイアウトは常に 3D) / flat: 従来の平面デザイン。
   * editorial なテーマ (paper) は常に flat で描く
   */
  style: z.enum(['3d', 'flat']).default('3d'),
  /**
   * 画面左上の柱 (editorial なテーマ = paper で表示)。例: label "図解 No.01" / title "半導体の回路を焼く機械"。
   * シーンに chapter があれば title の代わりにそれを出す
   */
  header: z
    .object({
      label: z.string().optional(),
      title: z.string().optional(),
    })
    .optional(),
  /** 既定のシーントランジション */
  transition: transitionSchema.default('slide'),
  /** 既定の出現アニメーション */
  animation: revealPresetSchema.default('auto'),
  /** シーン中にゆっくりズームする「カメラの動き」 */
  camera: z.enum(['subtle', 'none']).default('subtle'),
  /** 背景の模様をゆっくり動かす */
  animatedBackground: z.boolean().default(true),
  /** 画面下端の進行バー (章の区切り付き) */
  progressBar: z.boolean().default(true),
  subtitle: z
    .object({
      enabled: z.boolean().default(true),
      /** box: 濃い帯 / outline: YouTube でよく見る縁取り文字 / auto: テーマ既定 */
      style: z.enum(['auto', 'box', 'outline']).default('auto'),
    })
    .prefault({}),
  sfx: z
    .object({
      enabled: z.boolean().default(true),
      volume: z.number().min(0).max(1).default(0.5),
      /** 要素の出現時に pop を鳴らす */
      reveal: z.boolean().default(true),
      /** シーン切り替え時に whoosh を鳴らす */
      transition: z.boolean().default(true),
    })
    .prefault({}),
  /** BGM (public/ からの相対パス)。ナレーション中は自動で音量を下げる */
  bgm: z
    .object({
      src: z.string(),
      volume: z.number().min(0).max(1).default(0.18),
      duckVolume: z.number().min(0).max(1).default(0.07),
    })
    .optional(),
  /**
   * 右下で喋るキャラクター。動くのは口だけで、口の形は音声の音量から自動生成。
   * 省略時は同梱のカワウソ (public/avatar/) の顔を丸い枠で表示する。false で非表示
   */
  avatar: z
    .union([
      z.literal(false),
      z.object({
        type: z.enum(['builtin', 'image']).default('image'),
        /** type: image のとき。口を開けた / 半開き (省略可) / 閉じた画像 (public/ からの相対パス) */
        open: z.string().default('avatar/open.png'),
        half: z.string().optional(),
        closed: z.string().default('avatar/closed.png'),
        name: z.string().optional(),
        /** 大きさ [px]。顔の丸い枠では直径 (既定 220)、全身・builtin では高さ (既定 250) */
        size: z.number().optional(),
        /** face: 顔だけを丸い枠で見せる / full: 画像の全体 (全身) を見せる */
        framing: z.enum(['face', 'full']).default('face'),
        /**
         * framing: face のときに切り出す顔の位置。画像の幅を 1 とした割合で、丸の中心 (x, y) と直径 (size)。
         * 既定は同梱のカワウソの顔。自前の画像では顔の位置に合わせて指定する
         */
        face: z
          .object({
            x: z.number(),
            y: z.number(),
            size: z.number().positive(),
          })
          .default(OTTER_FACE),
      }),
    ])
    .default({
      type: 'image',
      open: 'avatar/open.png',
      half: 'avatar/half.png',
      closed: 'avatar/closed.png',
      framing: 'face',
      face: OTTER_FACE,
    }),
  /** チャンネル登録を促すポップアップを出すシーンID (シーン開始時に約4秒表示) */
  subscribePopup: z
    .object({
      sceneId: z.string(),
      text: z.string().default('チャンネル登録'),
    })
    .optional(),
  /** サムネイル (npm run thumbnail) の文言。省略時は最初の title シーンを使う */
  thumbnail: z
    .object({
      text: z.string(),
      sub: z.string().optional(),
      badge: z.string().optional(),
      /** 背景画像 (public/ からの相対パス) */
      image: z.string().optional(),
    })
    .optional(),
});

export const scriptSchema = z.object({
  meta: metaSchema.prefault({}),
  scenes: z.array(sceneSchema).min(1),
});

export const timelineSchema = z.object({
  fps: z.number().int(),
  totalFrames: z.number().int().positive(),
  scenes: z.array(
    z.object({
      id: z.string(),
      startFrame: z.number().int().nonnegative(),
      durationFrames: z.number().int().positive(),
      lines: z.array(
        z.object({
          index: z.number().int().nonnegative(),
          text: z.string(),
          reveal: z.array(z.string()),
          focus: z.array(z.string()).default([]),
          sfx: sfxNameSchema.optional(),
          startFrame: z.number().int().nonnegative(),
          durationFrames: z.number().int().positive(),
          audioFile: z.string(),
          /** 1フレームごとの音量 (0〜9 の数字列)。アバターの口パクに使う */
          levels: z.string().default(''),
          mock: z.boolean(),
        }),
      ),
    }),
  ),
});

export type ScriptConfig = z.infer<typeof scriptSchema>;
export type ScriptInput = z.input<typeof scriptSchema>;
export type Meta = ScriptConfig['meta'];
export type Scene = ScriptConfig['scenes'][number];
export type SceneLayout = Scene['layout'];
export type RevealPreset = z.infer<typeof revealPresetSchema>;
export type TransitionType = z.infer<typeof transitionSchema>;
export type SfxName = z.infer<typeof sfxNameSchema>;
export type ThemeName = z.infer<typeof themeNameSchema>;
export type Scene3DObjectsContent = z.infer<typeof scene3dObjectsSchema>;
export type Scene3DPresetContent = z.infer<typeof scene3dPresetSchema>;
export type Scene3DBuildContent = z.infer<typeof scene3dBuildSchema>;
export type Scene3DContent = Scene3DObjectsContent | Scene3DPresetContent | Scene3DBuildContent;

/** scene3d の content が preset で場面を選ぶ形か */
export const isPresetScene3D = (content: Scene3DContent): content is Scene3DPresetContent => 'preset' in content;

/** scene3d の content が parts で部品を組み立てる形か */
export const isBuildScene3D = (content: Scene3DContent): content is Scene3DBuildContent => 'parts' in content;

/** scene3d の content が objects を舞台に並べる形か */
export const isObjectsScene3D = (content: Scene3DContent): content is Scene3DObjectsContent => 'objects' in content;
export type TimelineLineFromScript = z.infer<typeof narrationLineSchema>;

export type Timeline = z.infer<typeof timelineSchema>;
export type TimelineScene = Timeline['scenes'][number];
export type TimelineLine = TimelineScene['lines'][number];
