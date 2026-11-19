import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
});

// Hap të tjera: emri i përdoruesit pa email bëhet emri@login.relikaj.al
export const toEmail = (u) => (u.includes("@") ? u.trim().toLowerCase() : `${u.trim().toLowerCase()}@login.relikaj.al`);
