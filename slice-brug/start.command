#!/bin/bash
# Start de slice-brug op een Mac. Dubbelklik dit bestand.
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Eenmalig de onderdelen ophalen..."
  npm install || { echo "Er ging iets mis. Staat Node.js geinstalleerd? Zie LEESMIJ.md"; read -r; exit 1; }
fi
node brug.mjs
