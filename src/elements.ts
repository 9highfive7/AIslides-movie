import type { ScriptConfig, Scene } from './schemas';
import { isShapeName, resolveColor } from './three/catalog';

/** scene3d の矢印のID。flow は物と物の間 (N-1本)、cycle は輪を一周 (N本) */
export const scene3dArrowIds = (content: Extract<Scene, { layout: 'scene3d' }>['content']): string[] => {
  const n = content.objects.length;
  const count = content.arrangement === 'flow' ? n - 1 : content.arrangement === 'cycle' && n >= 2 ? n : 0;
  return Array.from({ length: count }, (_, i) => `arrow-${i + 1}`);
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
    case 'scene3d':
      return [...scene.content.objects.map((obj) => obj.id), ...scene3dArrowIds(scene.content), 'caption'];
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

    if (scene.layout === 'scene3d') {
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
