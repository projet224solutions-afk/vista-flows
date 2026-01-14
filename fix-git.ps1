#!/usr/bin/env pwsh
# Script pour réparer l'état git

Set-Location "d:\224Solutions\vista-flows"

# Supprimer les fichiers de rebase
$rebasePath = ".\.git\rebase-merge"
if (Test-Path $rebasePath) {
    Remove-Item $rebasePath -Recurse -Force -ErrorAction SilentlyContinue
}

# Supprimer les fichiers de merge/rebase
$filesToRemove = @(".\.git\REBASE_HEAD", ".\.git\AUTO_MERGE", ".\.git\MERGE_MSG")
foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        Remove-Item $file -Force -ErrorAction SilentlyContinue
    }
}

# Vérifier l'état
git status
