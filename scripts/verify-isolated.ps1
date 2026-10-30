param([string[]]$BrowserTests = @())
$ErrorActionPreference = 'Stop'
$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$tempRoot = [System.IO.Path]::GetFullPath((Join-Path $sourceRoot '.local-data'))
$checkRoot = Join-Path $tempRoot ('werewolf-validation-' + [guid]::NewGuid().ToString('N'))
$moduleLink = Join-Path $checkRoot 'node_modules'
$npmExe = (Get-Command npm.cmd -ErrorAction Stop).Source
$nodeModules = Join-Path $sourceRoot 'node_modules'
$reportRoot = Join-Path $sourceRoot 'test-results\isolated'
$previousLocation = Get-Location

function Run-Check([string[]]$Arguments) {
    & $npmExe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Validation failed: npm $($Arguments -join ' ')" }
}

try {
    New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
    New-Item -ItemType Directory -Path $checkRoot | Out-Null
    # Explicit source allowlist: no credentials, local rooms, Git or build output.
    $items = @('app','assets','components','docs','engine','lib','rules','public','schemas','scripts','supabase','tests','package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts','eslint.config.mjs','postcss.config.mjs','playwright.config.ts','vitest.config.ts')
    foreach ($item in $items) { Copy-Item -LiteralPath (Join-Path $sourceRoot $item) -Destination $checkRoot -Recurse -Force }
    $isolatedConfig = Join-Path $checkRoot 'next.config.ts'
    $configText = [System.IO.File]::ReadAllText($isolatedConfig).Replace('poweredByHeader: false,','outputFileTracingRoot: process.cwd(), poweredByHeader: false,')
    [System.IO.File]::WriteAllText($isolatedConfig,$configText)
    New-Item -ItemType Junction -Path $moduleLink -Target $nodeModules | Out-Null
    Set-Location -LiteralPath $checkRoot
    $env:NEXT_PUBLIC_AVATAR_DEBUG = '1'
    $env:NEXT_PUBLIC_SUPABASE_URL = ''
    $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = ''
    $env:SUPABASE_SERVICE_ROLE_KEY = ''
    if ($BrowserTests.Count -eq 0) {
        Run-Check -Arguments @('run','check')
    } else {
        foreach ($task in @('lint','typecheck','test','build')) { Run-Check -Arguments @('run',$task) }
        Run-Check -Arguments (@('run','test:e2e','--') + $BrowserTests)
    }
    Write-Output 'PASS: isolated validation completed; the development server was left running.'
} finally {
    Set-Location -LiteralPath $previousLocation
    if (Test-Path -LiteralPath $checkRoot) {
        New-Item -ItemType Directory -Path $reportRoot -Force | Out-Null
        foreach ($item in @('test-results','playwright-report')) {
            $artifact = Join-Path $checkRoot $item
            if (Test-Path -LiteralPath $artifact) { Copy-Item -LiteralPath $artifact -Destination $reportRoot -Recurse -Force }
        }
        $audit = Join-Path $checkRoot 'docs\UX_AUDIT.after.json'
        if (Test-Path -LiteralPath $audit) { Copy-Item -LiteralPath $audit -Destination (Join-Path $sourceRoot 'docs\UX_AUDIT.after.json') -Force }
        # Unlink the dependency junction without ever traversing its contents.
        if (Test-Path -LiteralPath $moduleLink) {
            $link = Get-Item -LiteralPath $moduleLink
            if (-not ($link.Attributes -band [System.IO.FileAttributes]::ReparsePoint)) { throw 'Refusing cleanup: expected a dependency junction.' }
            if ([System.IO.Path]::GetFullPath($link.Target[0]) -ne $nodeModules) { throw 'Refusing cleanup: unexpected dependency target.' }
            [System.IO.Directory]::Delete($moduleLink)
        }
        $resolved = [System.IO.Path]::GetFullPath($checkRoot)
        if (-not $resolved.StartsWith($tempRoot,[System.StringComparison]::OrdinalIgnoreCase) -or (Split-Path $resolved -Leaf) -notmatch '^werewolf-validation-[a-f0-9]{32}$') { throw 'Refusing cleanup: unexpected validation path.' }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
