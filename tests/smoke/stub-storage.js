const mem = new Map();
export const getItem = async (k) => (mem.has(k) ? mem.get(k) : null);
export const setItem = async (k, v) => { mem.set(k, v); };
export const removeItem = async (k) => { mem.delete(k); };
export const multiGet = async (ks) => ks.map((k) => [k, mem.get(k) ?? null]);
export const multiSet = async (pairs) => { pairs.forEach(([k, v]) => mem.set(k, v)); };
export const multiRemove = async (ks) => { ks.forEach((k) => mem.delete(k)); };
export const clear = async () => mem.clear();
export default { getItem, setItem, removeItem, multiGet, multiSet, multiRemove, clear };
