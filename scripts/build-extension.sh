#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
dist_dir="$project_dir/dist"
extension_dir="$dist_dir/chrome-extension"
zip_file="$dist_dir/spelling-b-chrome-extension-1.5.0-RC1.zip"

rm -rf "$extension_dir"
mkdir -p "$extension_dir/icons" "$extension_dir/hand-guides"

cp "$project_dir/chrome/manifest.json" "$extension_dir/manifest.json"
cp "$project_dir/chrome/background.js" "$extension_dir/background.js"

for asset in \
  app.css runtime.js import-data.js practice.js settings.js test.js metrics.js \
  phonics.js phonics-lessons.json open-source-phonics-120-lessons.pdf PHONICS-LICENSE.txt \
  high-frequency.js high-frequency-words.json HIGH-FREQUENCY-LICENSE.txt \
  typing.js; do
  cp "$project_dir/static/$asset" "$extension_dir/$asset"
done

cp "$project_dir/static/hand-guides/"*.png "$extension_dir/hand-guides/"

for page in index settings test progress high-frequency phonics typing; do
  sed \
    -e 's|href="/settings"|href="settings.html"|g' \
    -e 's|href="/progress"|href="progress.html"|g' \
    -e 's|href="/high-frequency"|href="high-frequency.html"|g' \
    -e 's|href="/phonics"|href="phonics.html"|g' \
    -e 's|href="/typing"|href="typing.html"|g' \
    -e 's|href="/test"|href="test.html"|g' \
    -e 's|href="/static/|href="|g' \
    -e 's|href="/"|href="index.html"|g' \
    -e 's|src="/static/|src="|g' \
    -e '/{{range.*Config.Lists/d' \
    -e '/window.SPELLING_CONFIG/d' \
    "$project_dir/templates/$page.html" > "$extension_dir/$page.html"
done

go run "$project_dir/scripts/make-extension-icons.go" "$extension_dir/icons"

rm -f "$zip_file"
(
  cd "$extension_dir"
  zip -q -r "$zip_file" .
)
(
  cd "$dist_dir"
  sha256sum "$(basename "$zip_file")" > spelling-b-chrome-extension.sha256
)

echo "Unpacked extension: $extension_dir"
echo "Web Store ZIP:      $zip_file"
