import type { ScriptConfig, Scene } from './schemas';

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
      return [
        ...SCENE3D_ELEMENT_IDS[scene.content.preset],
        'title',
        'stat',
        ...scene.content.callouts.map((c) => c.id),
      ];
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
