param(
    [Parameter(Mandatory = $false)]
    [string]$TargetPath = "d:\224Solutions\vista-flows\src"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $TargetPath)) {
    throw "Le chemin cible n'existe pas: $TargetPath"
}

function Replace-TokenPrefix {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Content,
        [Parameter(Mandatory = $true)]
        [string]$Token,
        [Parameter(Mandatory = $true)]
        [string]$Replacement
    )

    $pattern = "(?<![A-Za-z0-9-])$([regex]::Escape($Token))(?<suffix>-\d{1,3})?(?<opacity>/\d{1,3})?(?![A-Za-z0-9-])"
    return [regex]::Replace(
        $Content,
        $pattern,
        {
            param($m)
            "$Replacement$($m.Groups['suffix'].Value)$($m.Groups['opacity'].Value)"
        }
    )
}

$extensions = @(
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".css", ".scss", ".sass", ".less",
    ".html", ".md", ".mdx", ".json", ".txt"
)

$files = Get-ChildItem -Path $TargetPath -Recurse -File |
    Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() }

$modifiedFiles = New-Object System.Collections.Generic.List[string]

foreach ($file in $files) {
    $original = Get-Content -LiteralPath $file.FullName -Raw
    $updated = $original

    # Exact mappings for bg-green special cases.
    $updated = [regex]::Replace(
        $updated,
        "(?<![A-Za-z0-9-])bg-green-50(?![A-Za-z0-9-])",
        "bg-gradient-to-br from-primary-blue-50 to-primary-orange-50"
    )

    $updated = [regex]::Replace(
        $updated,
        "(?<![A-Za-z0-9-])bg-green-(100|200)(?<opacity>/\d{1,3})?(?![A-Za-z0-9-])",
        {
            param($m)
            "bg-primary-orange-100$($m.Groups['opacity'].Value)"
        }
    )

    $updated = [regex]::Replace(
        $updated,
        "(?<![A-Za-z0-9-])bg-green-500(?![A-Za-z0-9-])",
        "bg-gradient-to-br from-primary-blue-500 to-primary-orange-500"
    )

    $updated = [regex]::Replace(
        $updated,
        "(?<![A-Za-z0-9-])bg-green-600(?<opacity>/\d{1,3})?(?![A-Za-z0-9-])",
        {
            param($m)
            "bg-primary-orange-600$($m.Groups['opacity'].Value)"
        }
    )

    # Prefix mappings with optional shade and opacity preservation.
    $updated = Replace-TokenPrefix -Content $updated -Token "from-green" -Replacement "from-primary-blue"
    $updated = Replace-TokenPrefix -Content $updated -Token "to-green" -Replacement "to-primary-orange"
    $updated = Replace-TokenPrefix -Content $updated -Token "from-emerald" -Replacement "from-primary-blue"
    $updated = Replace-TokenPrefix -Content $updated -Token "to-emerald" -Replacement "to-primary-orange"
    $updated = Replace-TokenPrefix -Content $updated -Token "to-teal" -Replacement "to-primary-orange"
    $updated = Replace-TokenPrefix -Content $updated -Token "from-cyan" -Replacement "from-primary-blue"
    $updated = Replace-TokenPrefix -Content $updated -Token "text-green" -Replacement "text-primary-orange"
    $updated = Replace-TokenPrefix -Content $updated -Token "text-emerald" -Replacement "text-primary-blue"
    $updated = Replace-TokenPrefix -Content $updated -Token "border-green" -Replacement "border-primary-orange"

    if ($updated -ne $original) {
        [System.IO.File]::WriteAllText($file.FullName, $updated, [System.Text.UTF8Encoding]::new($false))
        $modifiedFiles.Add($file.FullName) | Out-Null
    }
}

$commandUsed = "./scripts/replace-tailwind-colors.ps1 -TargetPath '$TargetPath'"
$summaryLines = @(
    "Command used: $commandUsed"
    "Files modified: $($modifiedFiles.Count)"
)

$summaryPath = Join-Path -Path (Split-Path -Parent $PSCommandPath) -ChildPath "replace-tailwind-colors.last-run.txt"
[System.IO.File]::WriteAllLines($summaryPath, $summaryLines, [System.Text.UTF8Encoding]::new($false))

Write-Output $summaryLines