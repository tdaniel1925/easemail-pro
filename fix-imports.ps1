# Fix all Supabase imports (PowerShell 2.0 compatible)
Get-ChildItem -Recurse -Path "app/api" -Filter "*.ts" | ForEach-Object {
    $content = Get-Content $_.FullName
    $joined = $content -join "`n"
    if ($joined -match 'createServerSupabaseClient') {
        Write-Host "Fixing: $($_.FullName)"
        $content = $content -replace 'createServerSupabaseClient', 'createClient'
        $content | Set-Content $_.FullName -Force
    }
}

Write-Host "`nDone!"
