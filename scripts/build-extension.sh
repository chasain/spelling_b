#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
dist_dir="$project_dir/dist"
extension_dir="$dist_dir/chrome-extension"
zip_file="$dist_dir/spelling-b-chrome-extension.zip"

rm -rf "$extension_dir"
mkdir -p "$extension_dir/icons"

cp "$project_dir/chrome/manifest.json" "$extension_dir/manifest.json"
cp "$project_dir/chrome/background.js" "$extension_dir/background.js"
cp "$project_dir/static/app.css" "$extension_dir/app.css"
cp "$project_dir/static/runtime.js" "$extension_dir/runtime.js"
cp "$project_dir/static/practice.js" "$extension_dir/practice.js"
cp "$project_dir/static/settings.js" "$extension_dir/settings.js"
cp "$project_dir/static/test.js" "$extension_dir/test.js"
cp "$project_dir/static/metrics.js" "$extension_dir/metrics.js"

for page in index settings test progress; do
  sed     -e 's|href="/settings"|href="settings.html"|g'     -e 's|href="/progress"|href="progress.html"|g'     -e 's|href="/test"|href="test.html"|g'     -e 's|href="/"|href="index.html"|g'     -e 's|href="/static/|href="|g'     -e 's|src="/static/|src="|g'     -e '/{{range.*Config.Lists/d'     -e '/window.SPELLING_CONFIG/d'     "$project_dir/templates/$page.html" > "$extension_dir/$page.html"
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
