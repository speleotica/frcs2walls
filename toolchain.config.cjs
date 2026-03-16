module.exports = {
  cjsBabelEnv: { targets: { node: 16 } },
  esmBabelEnv: { targets: { node: 16 } },
  // outputCjs: false, // disables CJS output (default: true)
  outputEsm: false, // disables ESM output (default: true)
  buildIgnore: ['src/**/*.spec.ts'],
  hasTypeScriptSources: true,
  // esWrapper: true, // outputs ES module wrappers for CJS modules (default: false)
  // sourceMaps: false, // default is true (outputs .map files, also accepts 'inline' or 'both')
  // scripts: {
  //   pretest: 'docker compose up -d',
  //   jsExample: {
  //     description: 'example of running a JS script',
  //     run: async (args = []) => console.log('TEST', ...args),
  //   },
  // }
}
