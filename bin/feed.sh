#! /bin/bash

for req in ads-schema/generated/reports/*.request.json; do
  node fetch/fetch-sp-campaign-report.js "$req"

  table="$(basename "$req" .request.json)"
  bin="$(ls -1t ./data/raw/run-*/**/*.bin 2>/dev/null | head -n 1)"

  node fetch/ingest-report.js --table "$table" --bin "$bin"
done
