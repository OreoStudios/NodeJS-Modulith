'use strict';
class EventBus {
  #handlers = new Map();
  subscribe(type, handler) {
    if (typeof type !== 'string' || !type || typeof handler !== 'function') throw TypeError('Invalid subscription');
    const handlers = this.#handlers.get(type) || new Set();
    handlers.add(handler); this.#handlers.set(type, handlers);
    return () => { handlers.delete(handler); if (!handlers.size) this.#handlers.delete(type); };
  }
  async publish(type, payload) {
    if (typeof type !== 'string' || !type) throw TypeError('Invalid event type');
    const handlers = [...(this.#handlers.get(type) || [])];
    const results = await Promise.allSettled(handlers.map(fn => Promise.resolve().then(() => fn(payload))));
    const failures = results.filter(x => x.status === 'rejected').map(x => x.reason);
    if (failures.length) throw new AggregateError(failures, 'Event handler failures: ' + type);
    return handlers.length;
  }
  clear() { this.#handlers.clear(); }
}
module.exports = { EventBus };
