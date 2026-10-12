'use strict';
class Modulith {
  #definitions = new Map();
  #instances = new Map();
  #started = [];
  register(definition) {
    if (!definition || !/^[a-z][a-z0-9-]*$/.test(definition.name)) throw Error('Invalid module name');
    if (this.#definitions.has(definition.name)) throw Error('Duplicate module: ' + definition.name);
    if (typeof definition.factory !== 'function') throw Error('Module factory required');
    const dependencies = definition.dependencies || [];
    if (!Array.isArray(dependencies) || dependencies.some(d => typeof d !== 'string')) throw Error('Invalid dependencies');
    this.#definitions.set(definition.name, { ...definition, dependencies: [...dependencies] });
    return this;
  }
  order() {
    const result = [], visiting = new Set(), visited = new Set();
    const visit = name => {
      if (!this.#definitions.has(name)) throw Error('Missing module: ' + name);
      if (visiting.has(name)) throw Error('Circular module dependency: ' + name);
      if (visited.has(name)) return;
      visiting.add(name);
      for (const dependency of this.#definitions.get(name).dependencies) visit(dependency);
      visiting.delete(name); visited.add(name); result.push(name);
    };
    for (const name of this.#definitions.keys()) visit(name);
    return result;
  }
  async start(context = {}) {
    if (this.#started.length) throw Error('Already started');
    try {
      for (const name of this.order()) {
        const def = this.#definitions.get(name);
        const deps = Object.fromEntries(def.dependencies.map(dep => [dep, this.#instances.get(dep)]));
        const instance = await def.factory(Object.freeze(deps), context);
        if (instance === null || typeof instance !== 'object') throw Error('Module must expose an object: ' + name);
        if (typeof instance.start === 'function') await instance.start();
        this.#instances.set(name, Object.freeze(instance));
        this.#started.push(name);
      }
    } catch (error) { await this.stop(); throw error; }
    return this;
  }
  get(name) {
    if (!this.#instances.has(name)) throw Error('Module unavailable: ' + name);
    return this.#instances.get(name);
  }
  async stop() {
    for (const name of [...this.#started].reverse()) {
      try { await this.#instances.get(name)?.stop?.(); } finally { this.#instances.delete(name); }
    }
    this.#started = [];
  }
}
module.exports = { Modulith };
