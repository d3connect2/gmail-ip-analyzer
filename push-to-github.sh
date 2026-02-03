#!/bin/bash
# Push gmail-ip-analyzer to GitHub. Usage: ./push-to-github.sh YOUR_GITHUB_USERNAME
# Create the repo first at https://github.com/new (name: gmail-ip-analyzer)
set -e
USER="${1:?Usage: $0 YOUR_GITHUB_USERNAME}"
cd "$(dirname "$0")"
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$USER/gmail-ip-analyzer.git"
git push -u origin main
echo "Done. Repo: https://github.com/$USER/gmail-ip-analyzer"
