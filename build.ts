import { build } from 'esbuild';

async function buildAction() {
  try {
    // TypeScriptをトランスパイルしてバンドル
    await build({
      entryPoints: ['./src/index.ts'],
      bundle: true,
      minify: true,
      sourcemap: false,
      platform: 'node',
      target: 'node20',
      format: 'cjs',
      outfile: 'dist/index.cjs',
      external: ['@actions/core', '@actions/github'], // GitHub Actionsのモジュールは外部化
      banner: {
        js: '// @ts-nocheck\n/* eslint-disable */',
      },
      define: {
        'process.env.NODE_ENV': '"production"',
      },
      logLevel: 'info',
    });

    // eslint-disable-next-line no-console
    console.log('✅ Build completed successfully');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// TypeScript declaration files generation
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

async function generateTypes() {
  try {
    await execAsync('tsc --emitDeclarationOnly');
    // eslint-disable-next-line no-console
    console.log('✅ Type declarations generated');
  } catch (error) {
    console.error('❌ Type generation failed:', error);
    // 型生成の失敗はビルドを止めない
  }
}

// Run build
(async () => {
  await buildAction();
  await generateTypes();
})();
