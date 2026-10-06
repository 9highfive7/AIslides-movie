import { z } from 'zod';

/**
 * public/script.json と public/timeline.json のスキーマ。
 * 型はここから z.infer で導出するので、台本の形式はこのファイルが唯一の基準。
 */

export const narrationLineSchema = z.object({
  text: z.string(),
  reveal: z.array(z.string()).default([]),
});

const sceneBaseSchema = {
  id: z.string().min(1),
  heading: z.string().optional(),
  label: z.string().optional(),
  /** 左下に表示する章タグ (例: "02 仕組み") */
  chapter: z.string().optional(),
  /** 右上に表示するバッジ (例: "おすすめ") */
  badge: z.string().optional(),
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
]);

export const scriptSchema = z.object({
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
          startFrame: z.number().int().nonnegative(),
          durationFrames: z.number().int().positive(),
          audioFile: z.string(),
          mock: z.boolean(),
        }),
      ),
    }),
  ),
});

export type ScriptConfig = z.infer<typeof scriptSchema>;
export type Scene = ScriptConfig['scenes'][number];
export type TimelineLineFromScript = z.infer<typeof narrationLineSchema>;

export type Timeline = z.infer<typeof timelineSchema>;
export type TimelineScene = Timeline['scenes'][number];
export type TimelineLine = TimelineScene['lines'][number];
