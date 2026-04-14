import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dts } from 'rollup-plugin-dts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
const input = packageJson.source;
const external = Object.keys(packageJson.peerDependencies);

const { warn, ...consoleWithoutWarn } = console;
const drop_console = Object.keys(consoleWithoutWarn);

function generateOutputName(isEsmModule, isMinified) {
  return `./dist/index${isMinified ? '.min' : ''}.${isEsmModule ? 'js' : 'cjs'}`;
}

function createJsConfig(format) {
  const isEsmModule = format === 'esm';
  const ecma = isEsmModule ? 2015 : 5;

  /** @type {import('rollup').MergedRollupOptions} */
  const config = {
    input,
    output: [
      {
        file: generateOutputName(isEsmModule),
        format,
        sourcemap: false,
        globals: { react: 'React' },
        exports: 'named',
      },
      {
        file: generateOutputName(isEsmModule, true),
        format,
        sourcemap: false,
        globals: { react: 'React' },
        exports: 'named',
        plugins: [
          terser({
            compress: {
              drop_console,
              ecma,
              passes: 2,
              toplevel: true,
              module: isEsmModule,
              unsafe: true,
              unsafe_arrows: isEsmModule,
              unsafe_proto: true,
              unsafe_regexp: true,
            },
            mangle: { module: isEsmModule },
            module: isEsmModule,
            format: { comments: false, ecma },
            toplevel: true,
          }),
        ],
      },
    ],
    plugins: [
      typescript({
        module: isEsmModule ? 'ESNext' : 'ES6',
        target: isEsmModule ? 'ESNext' : 'ES6',
        compilerOptions: { sourceMap: false },
      }),
    ],
    external,
  };

  return config;
}

/** @type {import('rollup').MergedRollupOptions} */
const dtsConfig = {
  input: 'dist/types/index.d.ts',
  output: [{ file: 'dist/index.d.ts', format: 'esm' }],
  plugins: [dts()],
};

const formats = ['cjs', 'esm'];

export default formats.map(createJsConfig).concat(dtsConfig);
