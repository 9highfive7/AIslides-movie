import {
  isBuildScene3D,
  isPresetScene3D,
  type LayeredContent,
  type ScriptConfig,
  type Scene,
  type Scene3DBuildContent,
  type Scene3DObjectsContent,
} from './schemas';
import { isBuildShape, isShapeName, resolveBuildColor, resolveColor } from './three/catalog';

/** scene3d の矢印のID。flow は物と物の間 (N-1本)、cycle は輪を一周 (N本) */
export const scene3dArrowIds = (content: Scene3DObjectsContent): string[] => {
  const n = content.objects.length;
  const count = content.arrangement === 'flow' ? n - 1 : content.arrangement === 'cycle' && n >= 2 ? n : 0;
  return Array.from({ length: count }, (_, i) => `arrow-${i + 1}`);
};

/** 3D の場面ごとに、reveal で動かせる物のID */
export const SCENE3D_ELEMENT_IDS = {
  // open: 箱が開く / zoom: チップへ寄る / label: 注釈
  phoneChip: ['open', 'zoom', 'label'],
  // machine: 自販機が出る / many: 引いて大量の自販機を見せる
  vendingCount: ['machine', 'many'],
  // cold / heat: 冷たさと熱の玉が飛んでくる
  vendingHotCold: ['machine', 'cold', 'heat'],
  // open: 扉が開いて中が見える / flow: 管の中を熱が流れ始める
  vendingCutaway: ['open', 'flow'],
  // left: 冷蔵庫 (熱を捨てる) / right: 自販機 (熱を回す)
  heatReuse: ['left', 'right'],
  // machine / bolt: 稲妻 / house: 家 / months: カレンダーがめくれる
  vendingEnergy: ['machine', 'bolt', 'house', 'months'],
} as const;

/** 組み立て形式の要素ID: 部品・流れ・注釈・title・stat、寄る先があれば zoom */
const buildElementIds = (content: Scene3DBuildContent): string[] => [
  ...content.parts.map((part) => part.id),
  ...content.flows.map((flow) => flow.id),
  ...content.callouts.map((c) => c.id),
  'title',
  'stat',
  ...(content.camera.zoomTo ? ['zoom'] : []),
];

/** 組み立て形式の整合性 (形・色・注釈と寄る先の参照・IDの重複) */
const lintBuild = (content: Scene3DBuildContent, at: string): string[] => {
  const issues: string[] = [];
  content.parts.forEach((part, pi) => {
    if (!isBuildShape(part.shape)) {
      issues.push(
        `${at}.parts.${pi}.shape: 形 "${part.shape}" はありません (基本形・作り込んだ物・3D オブジェクトのキーは src/three/catalog.ts を参照)`,
      );
    }
    if (part.color !== undefined && resolveBuildColor(part.color) === undefined) {
      issues.push(`${at}.parts.${pi}.color: 色 "${part.color}" は使えません (色名か #RRGGBB)`);
    }
    if (part.size && part.size.some((v) => v <= 0)) {
      issues.push(`${at}.parts.${pi}.size: 大きさは 0 より大きくしてください`);
    }
  });
  content.flows.forEach((flow, fi) => {
    if (flow.color !== undefined && resolveBuildColor(flow.color) === undefined) {
      issues.push(`${at}.flows.${fi}.color: 色 "${flow.color}" は使えません (色名か #RRGGBB)`);
    }
  });
  const targets = new Set([...content.parts.map((p) => p.id), ...content.flows.map((f) => f.id)]);
  content.callouts.forEach((c, ci) => {
    if (!targets.has(c.target)) {
      issues.push(`${at}.callouts.${ci}.target: "${c.target}" という部品・流れはありません`);
    }
  });
  const zoomTo = content.camera.zoomTo;
  if (zoomTo !== undefined && !content.parts.some((p) => p.id === zoomTo)) {
    issues.push(`${at}.camera.zoomTo: "${zoomTo}" という部品はありません`);
  }
  const ids = buildElementIds(content);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length > 0) {
    issues.push(`${at}: 要素ID が重複しています (${[...new Set(dup)].join(', ')})。title / stat / zoom も部品の id には使えません`);
  }
  return issues;
};

/** layered の要素ID: 物・注釈・title・stat */
const layeredElementIds = (content: LayeredContent): string[] => [
  ...content.objects.map((obj) => obj.id),
  ...content.callouts.map((c) => c.id),
  'title',
  'stat',
];

/** layered の整合性 (注釈の参照先・IDの重複) */
const lintLayered = (content: LayeredContent, at: string): string[] => {
  const issues: string[] = [];
  const objectIds = new Set(content.objects.map((obj) => obj.id));
  content.callouts.forEach((c, ci) => {
    if (!objectIds.has(c.target)) {
      issues.push(`${at}.callouts.${ci}.target: "${c.target}" という物はありません`);
    }
  });
  const ids = layeredElementIds(content);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length > 0) {
    issues.push(`${at}: 要素ID が重複しています (${[...new Set(dup)].join(', ')})。title / stat も物の id には使えません`);
  }
  return issues;
};

/**
 * シーン内で reveal / focus に指定できる要素IDの一覧。
 * レイアウトの描画側と同じ規則 (矢印の自動ID など) をここに集約する。
 */
export const elementIds = (scene: Scene): string[] => {
  switch (scene.layout) {
    case 'title':
    case 'section':
    case 'outro':
      return [];
    case 'compare':
      return [...scene.content.left, ...scene.content.right].map((item) => item.id);
    case 'flow':
      return [
        ...scene.content.steps.map((step) => step.id),
        ...scene.content.steps.slice(1).map((_, i) => `arrow-${i + 1}`),
      ];
    case 'inputOutput':
      return [
        scene.content.input.id,
        scene.content.transform.id,
        scene.content.output.id,
        'arrow-1',
        'arrow-2',
      ];
    case 'bullets':
    case 'stats':
    case 'checklist':
    case 'ranking':
      return scene.content.items.map((item) => item.id);
    case 'bars':
      return [...scene.content.items.map((item) => item.id), 'caption'];
    case 'table':
      return scene.content.rows.map((row) => row.id);
    case 'axes':
      return ['axes', 'hint'];
    case 'statement':
      return ['text', 'sub'];
    case 'image':
      return ['image', 'caption'];
    case 'share':
      return [...scene.content.segments.map((seg) => seg.id), 'source'];
    case 'scene3d':
      if (isPresetScene3D(scene.content)) {
        return [...SCENE3D_ELEMENT_IDS[scene.content.preset], 'title', 'stat', ...scene.content.callouts.map((c) => c.id)];
      }
      if (isBuildScene3D(scene.content)) {
        return buildElementIds(scene.content);
      }
      return [...scene.content.objects.map((obj) => obj.id), ...scene3dArrowIds(scene.content), 'caption'];
    case 'layered':
      return layeredElementIds(scene.content);
  }
};

/**
 * スキーマでは表現しきれない整合性チェック。問題があれば日本語のメッセージを返す。
 * (存在しない要素IDの reveal、シーンIDの重複、subscribePopup の参照先など)
 */
export const lintScript = (script: ScriptConfig): string[] => {
  const issues: string[] = [];
  const seen = new Set<string>();

  script.scenes.forEach((scene, si) => {
    if (seen.has(scene.id)) {
      issues.push(`scenes.${si}.id: シーンID "${scene.id}" が重複しています`);
    }
    seen.add(scene.id);
    if (!/^[A-Za-z0-9_-]+$/.test(scene.id)) {
      issues.push(`scenes.${si}.id: シーンIDは英数字・ハイフン・アンダースコアのみ使えます ("${scene.id}")`);
    }

    if (scene.layout === 'layered') {
      issues.push(...lintLayered(scene.content, `scenes.${si}.content`));
    }
    if (scene.layout === 'scene3d' && isBuildScene3D(scene.content)) {
      issues.push(...lintBuild(scene.content, `scenes.${si}.content`));
    }
    if (scene.layout === 'scene3d' && !isPresetScene3D(scene.content) && !isBuildScene3D(scene.content)) {
      scene.content.objects.forEach((obj, oi) => {
        if (!isShapeName(obj.shape)) {
          issues.push(
            `scenes.${si}.content.objects.${oi}.shape: 形 "${obj.shape}" はありません (src/three/catalog.ts の SHAPES のキーを使ってください)`,
          );
        }
        if (obj.color !== undefined && resolveColor(obj.color) === undefined) {
          issues.push(`scenes.${si}.content.objects.${oi}.color: 色 "${obj.color}" は使えません (色名か #RRGGBB)`);
        }
      });
      if (scene.content.arrangement !== 'row' && scene.content.objects.length < 2) {
        issues.push(`scenes.${si}.content.arrangement: ${scene.content.arrangement} には物が2つ以上必要です`);
      }
    }
    if (scene.layout === 'title' || scene.layout === 'section') {
      (scene.content.objects ?? []).forEach((shape, oi) => {
        if (!isShapeName(shape)) {
          issues.push(`scenes.${si}.content.objects.${oi}: 形 "${shape}" はありません (src/three/catalog.ts の SHAPES のキーを使ってください)`);
        }
      });
    }

    const ids = new Set(elementIds(scene));
    scene.lines.forEach((line, li) => {
      for (const key of ['reveal', 'focus'] as const) {
        for (const id of line[key]) {
          if (!ids.has(id)) {
            const hint = ids.size > 0 ? `使えるID: ${[...ids].join(', ')}` : 'このレイアウトには指定できる要素がありません';
            issues.push(`scenes.${si}.lines.${li}.${key}: 要素ID "${id}" はシーン "${scene.id}" にありません (${hint})`);
          }
        }
      }
    });
  });

  const popup = script.meta.subscribePopup;
  if (popup && !script.scenes.some((scene) => scene.id === popup.sceneId)) {
    issues.push(`meta.subscribePopup.sceneId: シーン "${popup.sceneId}" がありません`);
  }
  return issues;
};
