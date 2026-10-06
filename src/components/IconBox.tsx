import React from 'react';
import {
  BookOpen,
  BookOpenCheck,
  Braces,
  Bug,
  ChartBar,
  Check,
  CircleCheck,
  CircleDot,
  Clapperboard,
  Clock,
  Code,
  Compass,
  Database,
  Download,
  FileText,
  Film,
  Flag,
  Gauge,
  Globe,
  GraduationCap,
  Layers,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  Mic,
  NotebookPen,
  PiggyBank,
  Play,
  RefreshCw,
  Rocket,
  Scale,
  Scissors,
  Search,
  Server,
  Settings,
  ShieldCheck,
  SquareCheckBig,
  Table2,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Upload,
  Users,
  Wallet,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { COLORS } from '../theme';

/** script.json の icon フィールドに指定できるキー → lucide の線アイコン */
const REGISTRY: Record<string, LucideIcon> = {
  'file-text': FileText,
  mic: Mic,
  clock: Clock,
  clapperboard: Clapperboard,
  'alert-triangle': TriangleAlert,
  'refresh-cw': RefreshCw,
  'check-circle': CircleCheck,
  braces: Braces,
  film: Film,
  'book-open': BookOpen,
  'book-check': BookOpenCheck,
  'graduation-cap': GraduationCap,
  settings: Settings,
  play: Play,
  download: Download,
  upload: Upload,
  list: ListChecks,
  lightbulb: Lightbulb,
  check: Check,
  search: Search,
  'shield-check': ShieldCheck,
  zap: Zap,
  target: Target,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  gauge: Gauge,
  globe: Globe,
  database: Database,
  code: Code,
  users: Users,
  timer: Timer,
  wallet: Wallet,
  scale: Scale,
  rocket: Rocket,
  bug: Bug,
  server: Server,
  table: Table2,
  'chart-bar': ChartBar,
  'notebook-pen': NotebookPen,
  messages: MessagesSquare,
  layers: Layers,
  workflow: Workflow,
  compass: Compass,
  flag: Flag,
  'piggy-bank': PiggyBank,
  scissors: Scissors,
  'square-check': SquareCheckBig,
};

/**
 * lucide系の線アイコンを淡い背景の四角に入れたもの。
 * tone: "warning" で控えめな赤に変わる。
 */
export const IconBox: React.FC<{
  name?: string;
  size?: number;
  tone?: 'accent' | 'warning';
}> = ({ name, size = 60, tone = 'accent' }) => {
  const Icon = (name !== undefined && REGISTRY[name]) || CircleDot;
  const color = tone === 'warning' ? COLORS.warning : COLORS.accent;
  const backgroundColor = tone === 'warning' ? COLORS.warningSoft : COLORS.accentSoft;

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.75} color={color} />
    </div>
  );
};
