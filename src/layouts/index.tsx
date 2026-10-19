import React from 'react';
import type { Scene } from '../schemas';
import { TitleLayout } from './TitleLayout';
import { SectionLayout } from './SectionLayout';
import { OutroLayout } from './OutroLayout';
import { CompareLayout } from './CompareLayout';
import { FlowLayout } from './FlowLayout';
import { InputOutputLayout } from './InputOutputLayout';
import { BulletsLayout } from './BulletsLayout';
import { StatsLayout } from './StatsLayout';
import { TableLayout } from './TableLayout';
import { BarsLayout } from './BarsLayout';
import { ChecklistLayout } from './ChecklistLayout';
import { AxesLayout } from './AxesLayout';
import { StatementLayout } from './StatementLayout';
import { ImageLayout } from './ImageLayout';
import { RankingLayout } from './RankingLayout';
import { ShareLayout } from './ShareLayout';
import { Scene3DLayout } from './Scene3DLayout';
import { LayeredLayout } from './LayeredLayout';
import { StageBand, useVertical } from '../stage';

/** レイアウト種別 → 描画コンポーネント */
export const SceneLayoutView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const hasHeading = Boolean(scene.heading || scene.label);
  const vertical = useVertical();
  switch (scene.layout) {
    case 'title':
      return <TitleLayout content={scene.content} />;
    case 'section':
      return <SectionLayout content={scene.content} />;
    case 'outro':
      return <OutroLayout content={scene.content} />;
    case 'compare':
      return <CompareLayout content={scene.content} />;
    case 'flow':
      return <FlowLayout content={scene.content} />;
    case 'inputOutput':
      return <InputOutputLayout content={scene.content} />;
    case 'bullets':
      return <BulletsLayout content={scene.content} />;
    case 'stats':
      return <StatsLayout content={scene.content} />;
    case 'table':
      return <TableLayout content={scene.content} />;
    case 'bars':
      return <BarsLayout content={scene.content} />;
    case 'checklist':
      return <ChecklistLayout content={scene.content} />;
    case 'axes':
      return <AxesLayout content={scene.content} />;
    case 'statement':
      return <StatementLayout content={scene.content} hasHeading={hasHeading} />;
    case 'image':
      return <ImageLayout content={scene.content} hasHeading={hasHeading} />;
    case 'ranking':
      return <RankingLayout content={scene.content} />;
    case 'share':
      return <ShareLayout content={scene.content} hasHeading={hasHeading} />;
    case 'scene3d':
      // 縦の動画では、16:9 で組んだ 3D の場面を画面の幅いっぱいの帯にして置く (上下にも 3D を描き足す)
      return vertical ? (
        <StageBand>
          <Scene3DLayout content={scene.content} />
        </StageBand>
      ) : (
        <Scene3DLayout content={scene.content} />
      );
    case 'layered':
      return <LayeredLayout content={scene.content} />;
  }
};
