import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores:['node_modules/**','dist/**','dist-electron/**','release/**','public/content/**','test-results/**','playwright-report/**','.qa/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {languageOptions:{globals:{process:'readonly',console:'readonly',Buffer:'readonly',setTimeout:'readonly',URL:'readonly',module:'readonly'}}},
  {files:['tools/**/*.mjs'],languageOptions:{globals:{fetch:'readonly',AbortSignal:'readonly'}}},
  {files:['src/editor/**/*.tsx'],plugins:{'react-hooks':hooks},rules:{'react-hooks/rules-of-hooks':'error'}},
  {files:['src/engine/**/*.ts'],rules:{
    'no-restricted-globals':['error','window','document','performance','requestAnimationFrame','Date'],
    'no-restricted-properties':['error',{object:'Math',property:'random',message:'Engine must be deterministic.'}],
    'no-restricted-imports':['error',{patterns:['node:*','electron','pixi.js','react','react-dom']}],
  }},
);
