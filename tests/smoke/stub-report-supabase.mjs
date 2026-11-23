// Klient i simuluar; nuk provon politikat reale RLS të bazës.
export function createClient(url, key, options) {
  const auth = options?.global?.headers?.Authorization;
  globalThis.__reportClientCalls.push({ url, key, auth });
  return {
    from(table) {
      let rows = table === "companies" ? [{ id: 1, name: "Compania de test" }] : [];
      const query = {
        select: () => query,
        eq: (k, v) => { rows = rows.filter((row) => row[k] === v); return query; },
        order: () => query,
        then: (resolve, reject) => Promise.resolve(auth === "Bearer test-user"
          ? { data: rows, error: null }
          : { data: null, error: { message: "neautorizuar" } }).then(resolve, reject),
      };
      return query;
    },
  };
}
