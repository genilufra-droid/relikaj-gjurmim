#!/usr/bin/env bash
# Ekzekuton testet e logjikës dhe testin e renderimit të ekraneve.
set -e
ESB=./node_modules/.bin/esbuild
ALIAS=(
  --alias:react-native=./tests/smoke/stub-rn.js
  --alias:@expo/vector-icons=./tests/smoke/stub-icons.js
  --alias:expo-location=./tests/smoke/stub-native.js
  --alias:expo-av=./tests/smoke/stub-native.js
  --alias:expo-file-system=./tests/smoke/stub-native.js
  --alias:expo-sharing=./tests/smoke/stub-native.js
  --alias:expo-print=./tests/smoke/stub-native.js
  --alias:expo-image-picker=./tests/smoke/stub-native.js
  --alias:expo-document-picker=./tests/smoke/stub-native.js
  --alias:expo-speech-recognition=./tests/smoke/stub-native.js
  --alias:expo-linking=./tests/smoke/stub-native.js
  --alias:expo=./tests/smoke/stub-native.js
  --alias:@react-native-async-storage/async-storage=./tests/smoke/stub-storage.js
  --alias:react-native-url-polyfill/auto=./tests/smoke/stub-polyfill.js
  --alias:@supabase/supabase-js=./tests/smoke/stub-supabase-client.js
)
for f in auth_test voice_test import_test print_test; do
  "$ESB" "tests/$f.js" --bundle --platform=node --format=esm --loader:.js=jsx --outfile="tests/.$f.mjs" --log-level=error
  node "tests/.$f.mjs"
  rm -f "tests/.$f.mjs"
done
"$ESB" tests/smoke/render_test.js --bundle --platform=node --format=esm --loader:.js=jsx \
  --outfile=tests/smoke/render.out.mjs "${ALIAS[@]}" --external:react --external:react-test-renderer --log-level=error
node tests/smoke/render.out.mjs
rm -f tests/smoke/render.out.mjs
