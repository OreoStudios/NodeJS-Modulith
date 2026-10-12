'use strict';
class Container {
  #providers = new Map();
  #instances = new Map();
  #resolving = new Set();
  provide(token, factory, options = {}) {
    if (typeof token !== 'string' || !token || typeof factory !== 'function') throw TypeError('Invalid provider');
    if (this.#providers.has(token)) throw Error('Duplicate provider: ' + token);
    this.#providers.set(token, { factory, singleton: options.singleton !== false });
    return this;
  }
  resolve(token) {
    if (!this.#providers.has(token)) throw Error('Unknown provider: ' + token);
    if (this.#instances.has(token)) return this.#instances.get(token);
    if (this.#resolving.has(token)) throw Error('Provider cycle: ' + token);
    this.#resolving.add(token);
    try {
      const def = this.#providers.get(token);
      const value = def.factory(Object.freeze({ resolve: dependency => this.resolve(dependency) }));
      if (value && typeof value.then === 'function') throw Error('Use synchronous factories for Container');
      if (def.singleton) this.#instances.set(token, value);
      return value;
    } finally { this.#resolving.delete(token); }
  }
  reset() { this.#instances.clear(); }
}
module.exports = { Container };
