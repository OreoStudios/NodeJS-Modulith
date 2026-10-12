'use strict';
function scopeRepository(repo, scope) {
  if (!repo || typeof repo.get !== 'function' || typeof repo.list !== 'function') throw TypeError('Repository required');
  if (!scope || typeof scope !== 'object' || Array.isArray(scope) || !Object.keys(scope).length) throw Error('Nonempty scope required');
  const scoped = filters => {
    if (filters != null && (typeof filters !== 'object' || Array.isArray(filters))) throw TypeError('Filters must be an object');
    for (const [key,value] of Object.entries(filters || {})) {
      if (Object.hasOwn(scope,key) && !Object.is(scope[key],value)) throw Error('Attempted scope override');
    }
    return {...(filters||{}), ...scope};
  };
  return Object.freeze({
    get(filters={}) { return repo.get(scoped(filters)); },
    list(filters={},options={}) { return repo.list(scoped(filters),options); },
    create(data) {
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw TypeError('Record required');
      return repo.create(scoped(data));
    },
    update(filters,changes) {
      if (Object.keys(changes || {}).some(key=>Object.hasOwn(scope,key))) throw Error('Scope fields cannot be updated');
      return repo.update(scoped(filters),changes);
    },
    delete(filters) { return repo.delete(scoped(filters)); }
  });
}
module.exports = { scopeRepository };
