#!/bin/sh
# Starts a static server, runs unit + browser tests, stops the server.
cd "$(dirname "$0")/.." && node test/core.test.js | tail -1 || exit 1
python3 -m http.server 8123 >/dev/null 2>&1 & S=$!; sleep 1
node test/browser.test.js http://127.0.0.1:8123/ "${1:-/tmp}"; R=$?
node test/pdf.test.js http://127.0.0.1:8123/ || R=1
kill $S; exit $R
