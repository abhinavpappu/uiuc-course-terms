// https://github.com/EMH333/esbuild-svelte
// https://github.com/EMH333/esbuild-svelte/blob/main/example/buildscript.js
const fs = require("fs-extra");
const esbuild = require('esbuild');
const sveltePreprocess = require('svelte-preprocess');
const esbuildSvelte = require('esbuild-svelte');

const srcDirectory = './visualization';
const outDirectory = './dist';

esbuild.build({
  entryPoints: [`${srcDirectory}/index.ts`],
  bundle: true,
  watch: process.argv.includes('--watch'),
  outdir: outDirectory,
  plugins: [
    esbuildSvelte({ preprocess: sveltePreprocess() })
  ],
})
.then(() => fs.copy(`${srcDirectory}/index.html`, `${outDirectory}/index.html`))
.then(() => fs.copy('./data', `${outDirectory}/data`))
.catch((err) => {
  console.error(err);
  process.exit(1);
});

