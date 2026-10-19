// Usage: npx tsx stills.ts <outDir> <prefix> <Comp:frame,frame,...> [<Comp:frames> ...]
// Renders stills of the current public/script.json + timeline.json with one bundle.
import path from 'node:path';
import fs from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const [outDir, prefix, ...specs] = process.argv.slice(2);
// STILLS_ROOT: render another checkout's src (e.g. a worktree of HEAD) with this checkout's node_modules
const root = process.env.STILLS_ROOT ?? process.cwd();

const main = async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public') });
  for (const spec of specs) {
    const [id, list] = spec.split(':');
    const composition = await selectComposition({ serveUrl, id, inputProps: {} });
    for (const f of list.split(',').map(Number)) {
      const output = path.join(outDir, `${prefix}-${id}-${f}.png`);
      await renderStill({ serveUrl, composition, frame: f, output, inputProps: {}, chromiumOptions: { gl: 'angle' } });
      console.log('wrote', output);
    }
  }
};
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
