'use strict';
function moduleGraph(definitions) {
  const modules = [...definitions].map(def => ({ name: def.name, dependencies: [...(def.dependencies || [])] }));
  const names = new Set(modules.map(m => m.name));
  if (names.size !== modules.length) throw Error('Duplicate module');
  for (const m of modules) for (const d of m.dependencies) if (!names.has(d)) throw Error('Missing module: ' + d);
  const lines = ['graph TD'];
  for (const m of modules) {
    const quote = value => JSON.stringify(value);
    if (!m.dependencies.length) lines.push('  ' + quote(m.name));
    for (const dep of m.dependencies) lines.push('  ' + quote(m.name) + ' --> ' + quote(dep));
  }
  return lines.join('\n') + '\n';
}
module.exports = { moduleGraph };
