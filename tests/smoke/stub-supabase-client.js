// Klient Supabase i rremë: kthen gjithmonë listë bosh (ose të dhëna të dhëna), pa rrjet.
const empty = { data: [], error: null, count: 0 };
let rowsFor = () => [];
let rpcFor = () => empty;
let rpcCalls = [];
export const setRows = (fn) => { rowsFor = fn; };
export const setRpc = (fn) => { rpcFor = fn; rpcCalls = []; };
export const getRpcCalls = () => rpcCalls.slice();

const builder = (table) => {
  const q = {
    select: () => q, eq: () => q, neq: () => q, gt: () => q, gte: () => q, lt: () => q, lte: () => q,
    like: () => q, ilike: () => q, is: () => q, in: () => q, not: () => q, or: () => q,
    order: () => q, limit: () => q, range: () => q, single: () => q, maybeSingle: () => q,
    insert: () => q, update: () => q, upsert: () => q, delete: () => q, match: () => q,
    then: (res, rej) => Promise.resolve({ ...empty, data: rowsFor(table) }).then(res, rej),
    catch: (rej) => Promise.resolve(empty).catch(rej),
    finally: (f) => Promise.resolve(empty).finally(f),
  };
  return q;
};

export const createClient = () => ({
  from: (t) => builder(t),
  rpc: (name, args) => { rpcCalls.push({ name, args }); return Promise.resolve(rpcFor(name, args)); },
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  removeChannel: () => {},
  storage: { from: () => ({ upload: async () => ({}), getPublicUrl: () => ({ data: { publicUrl: "" } }), createSignedUrl: async () => ({ data: { signedUrl: "" } }) }) },
  auth: {
    getUser: async () => ({ data: { user: { id: "u1", email: "admin@bio.al" } }, error: null }),
    getSession: async () => ({ data: { session: { access_token: "t", user: { id: "u1", email: "admin@bio.al" } } }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signInWithPassword: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    updateUser: async () => ({ error: null }),
    resetPasswordForEmail: async () => ({ error: null }),
    signInWithOtp: async () => ({ error: null }),
    verifyOtp: async () => ({ error: null }),
    setSession: async () => ({ error: null }),
    exchangeCodeForSession: async () => ({ error: null }),
  },
});
export default { createClient, setRows };
