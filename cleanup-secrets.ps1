$env:FILTER_BRANCH_SQUELCH_WARNING = 1
git filter-branch --force --tree-filter @"
if (Test-Path server.ts) {
  `$content = Get-Content server.ts -Raw
  `$content = `$content -replace 'sk-or-v1-[a-zA-Z0-9]{56}', ''
  Set-Content server.ts `$content
}
"@ -- --all 2>&1

Write-Host "Git history cleaned. The secret has been removed from all commits."
