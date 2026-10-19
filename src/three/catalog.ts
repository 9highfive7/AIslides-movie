/**
 * 台本の shape に書ける 3D オブジェクトの一覧 (キー → 日本語の説明・既定色)。
 * three.js に依存しないので、台本生成 (scripts/) や整合性チェックからも読める。
 * 形そのものは src/three/models.tsx に、同じキーで定義する。
 */
export const SHAPES = {
  // 基本の形
  cube: { ja: 'はこ・ブロック', color: '#4DABF7' },
  ball: { ja: 'ボール・球', color: '#FF6B6B' },
  cylinder: { ja: 'つつ・円柱', color: '#51CF66' },
  cone: { ja: 'コーン・円すい', color: '#FF922B' },
  pyramid: { ja: 'ピラミッド・四角すい', color: '#FCC419' },
  ring: { ja: 'わっか・ドーナツ', color: '#F783AC' },
  star: { ja: 'ほし・すごい', color: '#FCC419' },
  heart: { ja: 'ハート・すき・こころ', color: '#FF6B81' },
  'arrow-up': { ja: '上むき矢印・ふえる', color: '#40C057' },
  'arrow-down': { ja: '下むき矢印・へる', color: '#FA5252' },
  question: { ja: 'はてな・なぜ？', color: '#845EF7' },
  check: { ja: 'チェック・せいかい', color: '#40C057' },
  cross: { ja: 'バツ・まちがい', color: '#FA5252' },
  // しぜん
  sun: { ja: 'たいよう・ひかり・あつい', color: '#FFD43B' },
  moon: { ja: 'つき・よる', color: '#FFE066' },
  earth: { ja: 'ちきゅう・せかい', color: '#339AF0' },
  cloud: { ja: 'くも・クラウド', color: '#FFFFFF' },
  drop: { ja: 'しずく・水・あめ', color: '#4DABF7' },
  fire: { ja: 'ほのお・ねつ', color: '#FF922B' },
  tree: { ja: 'き・しぜん', color: '#51CF66' },
  flower: { ja: 'はな', color: '#F783AC' },
  sprout: { ja: 'め・ふたば・そだつ', color: '#69DB7C' },
  mountain: { ja: 'やま', color: '#8CE99A' },
  fish: { ja: 'さかな・いきもの', color: '#FF922B' },
  // ひと・なかま
  person: { ja: 'ひと・わたし・ユーザー', color: '#4DABF7' },
  robot: { ja: 'ロボット・AI', color: '#A5D8FF' },
  // もの
  house: { ja: 'いえ', color: '#FF8787' },
  building: { ja: 'ビル・会社・まち', color: '#91A7FF' },
  car: { ja: 'くるま・はこぶ', color: '#FF6B6B' },
  rocket: { ja: 'ロケット・はやい・スタート', color: '#F1F3F5' },
  book: { ja: 'ほん・まなぶ', color: '#5C7CFA' },
  lightbulb: { ja: 'でんきゅう・ひらめき', color: '#FFE066' },
  coin: { ja: 'コイン・おかね', color: '#FCC419' },
  gift: { ja: 'プレゼント・ごほうび', color: '#FF6B81' },
  apple: { ja: 'りんご・たべもの', color: '#FA5252' },
  cake: { ja: 'ケーキ・おやつ・わける', color: '#FFDEEB' },
  battery: { ja: 'でんち・エネルギー', color: '#51CF66' },
  phone: { ja: 'スマホ', color: '#343A40' },
  computer: { ja: 'パソコン', color: '#ADB5BD' },
  chip: { ja: 'チップ・コンピューターの頭脳', color: '#495057' },
  server: { ja: 'サーバー・データのくら', color: '#748FFC' },
  letter: { ja: 'てがみ・メッセージ', color: '#FFF3BF' },
  speech: { ja: 'ふきだし・おしゃべり', color: '#FFFFFF' },
  clock: { ja: 'とけい・じかん', color: '#FFFFFF' },
  magnifier: { ja: 'むしめがね・しらべる', color: '#845EF7' },
  trophy: { ja: 'トロフィー・1ばん', color: '#FCC419' },
  lock: { ja: 'かぎ・あんぜん', color: '#FCC419' },
  magnet: { ja: 'じしゃく・ひきつける', color: '#FA5252' },
} as const satisfies Record<string, { ja: string; color: string }>;

export type ShapeName = keyof typeof SHAPES;

export const SHAPE_NAMES = Object.keys(SHAPES) as ShapeName[];

export const isShapeName = (name: string): name is ShapeName => Object.prototype.hasOwnProperty.call(SHAPES, name);

/** 台本の color に書ける色名 (子ども向けのはっきりした色) */
export const COLOR_NAMES: Record<string, string> = {
  red: '#FA5252',
  orange: '#FF922B',
  yellow: '#FCC419',
  green: '#40C057',
  lime: '#94D82D',
  blue: '#339AF0',
  sky: '#74C0FC',
  navy: '#364FC7',
  purple: '#845EF7',
  pink: '#F783AC',
  brown: '#A0522D',
  gray: '#ADB5BD',
  white: '#F8F9FA',
  black: '#343A40',
  gold: '#FAB005',
};

/** 色名・#RRGGBB を three.js に渡せる色に。解釈できなければ undefined */
export const resolveColor = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  const named = COLOR_NAMES[value.toLowerCase()];
  if (named) {
    return named;
  }
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value) ? value : undefined;
};

/** タイトル・章扉・エンディングで、台本に objects がないときに浮かべる形 */
export const DEFAULT_FLOATING: Record<'title' | 'section' | 'outro', ShapeName[]> = {
  title: ['star', 'ball', 'cube', 'ring', 'heart', 'cone'],
  section: ['cube', 'star', 'ball', 'ring'],
  outro: ['heart', 'star', 'gift', 'ball'],
};

/**
 * scene3d の「組み立て (parts)」形式で使う形。自販機の場面と同じ「ベタ塗り + 黒い輪郭線」で描く。
 * 基本形は size [幅, 高さ, 奥行き] にそのまま伸び縮みし、作り込んだ物は高さに合わせて縦横比を保って拡大・縮小する。
 */
export const BUILD_BASIC_SHAPES = {
  box: '箱',
  plate: '板 (薄い箱)',
  cylinder: '円柱 (size は [直径, 高さ, 直径])',
  sphere: '球',
  hemisphere: '半球 (ドーム)',
  cone: '円すい',
  pyramid: '四角すい',
  roof: '三角屋根 (三角柱)',
  ring: 'わっか (正面を向く)',
  arrow: '平たい矢印 (+x 向き。turn で向きを変える)',
} as const;

/** 作り込んだ物 (src/three/objects.tsx)。size は [幅, 高さ, 奥行き] の既定値 (m) */
export const BUILD_PROPS = {
  vendingMachine: { ja: '自販機', size: [1.8, 3.2, 1.4] },
  vendingMachineOpen: { ja: '扉が開き中の管が見える自販機', size: [1.8, 3.2, 1.4] },
  fridge: { ja: '冷蔵庫', size: [1.2, 2.3, 0.95] },
  house: { ja: '家', size: [2.4, 2.6, 1.8] },
  bolt: { ja: '稲妻 (電気)', size: [1.04, 2, 0.22] },
} as const satisfies Record<string, { ja: string; size: readonly [number, number, number] }>;

export type BuildBasicShape = keyof typeof BUILD_BASIC_SHAPES;
export type BuildProp = keyof typeof BUILD_PROPS;

export const isBuildBasicShape = (name: string): name is BuildBasicShape =>
  Object.prototype.hasOwnProperty.call(BUILD_BASIC_SHAPES, name);
export const isBuildProp = (name: string): name is BuildProp => Object.prototype.hasOwnProperty.call(BUILD_PROPS, name);
/** parts の shape に書けるか (基本形・作り込んだ物・3D オブジェクトのキー) */
export const isBuildShape = (name: string): boolean => isBuildBasicShape(name) || isBuildProp(name) || isShapeName(name);

/** 組み立て形式の色名 (paper テーマの紺・朱・墨に合う、落ち着いた色) */
export const BUILD_COLORS: Record<string, string> = {
  navy: '#3F5F86',
  'navy-dark': '#2F4A6B',
  'navy-light': '#5B7DA6',
  sky: '#9DB8D6',
  cold: '#C9D7E8',
  red: '#C63A2B',
  orange: '#E2763A',
  hot: '#F0C8BC',
  gold: '#E8C35A',
  green: '#6E9A6A',
  brown: '#B98A4A',
  purple: '#7A5C8E',
  paper: '#F2ECDF',
  beige: '#DCD3BF',
  metal: '#B8BEC6',
  gray: '#8C857A',
  white: '#FFFFFF',
  black: '#3A3630',
  ink: '#24211C',
};

/** 組み立て形式の色名・#RRGGBB を解釈する。解釈できなければ undefined */
export const resolveBuildColor = (value: string | undefined): string | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return BUILD_COLORS[value.toLowerCase()] ?? (/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value) ? value : undefined);
};
