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
          }),
        )
        .min(2),
    }),
  }),
  z.object({
    ...sceneBaseSchema,
    layout: z.literal('section'),
    content: z.object({
      number: z.string().optional(),
      title: z.string(),
      subtitle: z.string().optional(),
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

export const themeNameSchema = z.enum(['clean', 'pop', 'dark']);

export const metaSchema = z.object({
  /** 動画タイトル (サムネイル・概要欄の既定値に使う) */
  title: z.string().optional(),
  /** 配色テーマ */
  theme: themeNameSchema.default('clean'),
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
  /** 右下で喋るキャラクター。口の動きは音声の音量から自動生成 */
  avatar: z
    .object({
      type: z.enum(['builtin', 'image']).default('builtin'),
      /** type: image のとき。口を開けた画像 / 閉じた画像 (public/ からの相対パス) */
      open: z.string().optional(),
      closed: z.string().optional(),
      name: z.string().optional(),
      size: z.number().default(210),
    })
    .optional(),
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
export type TimelineLineFromScript = z.infer<typeof narrationLineSchema>;

export type Timeline = z.infer<typeof timelineSchema>;
export type TimelineScene = Timeline['scenes'][number];
export type TimelineLine = TimelineScene['lines'][number];
