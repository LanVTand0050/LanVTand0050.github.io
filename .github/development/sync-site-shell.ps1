$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Get-SiteHeader([string]$currentSection) {
  $toolCurrent = if ($currentSection -eq "tools") { ' aria-current="page"' } else { "" }
  $articleCurrent = if ($currentSection -eq "articles") { ' aria-current="page"' } else { "" }
  $privacyCurrent = if ($currentSection -eq "privacy") { ' aria-current="page"' } else { "" }

  return @"
  <a class="skip-link" href="#main-content">跳到主要內容</a>

  <header class="site-header">
    <nav class="site-nav site-shell" aria-label="主要導覽">
      <a class="site-brand" href="/">LanVTand0050 理財筆記</a>
      <div class="site-links">
        <a href="/fire-calculators/"$toolCurrent>財務工具</a>
        <a href="/articles/"$articleCurrent>文章</a>
        <a href="/privacy.html"$privacyCurrent>隱私權</a>
      </div>
    </nav>
  </header>
"@
}

function Get-SiteFooter {
  return @"
  <footer class="site-footer">
    <div class="site-shell footer-row">
      <p>© 2026 LanVTand0050 理財筆記</p>
      <nav class="footer-links" aria-label="頁尾導覽">
        <a href="/">首頁</a>
        <a href="/fire-calculators/">財務工具</a>
        <a href="/articles/">文章</a>
        <a href="/privacy.html">隱私權政策</a>
      </nav>
    </div>
  </footer>
"@
}

function Get-Section([string]$relativePath) {
  if ($relativePath -eq "privacy.html") { return "privacy" }
  if ($relativePath -like "articles\*") { return "articles" }
  if ($relativePath -like "fire-calculators\*") { return "tools" }
  return "home"
}

$htmlFiles = Get-ChildItem -Path $root -Recurse -Filter "*.html" -File

foreach ($file in $htmlFiles) {
  $relativePath = $file.FullName.Substring($root.Length + 1)
  $section = Get-Section $relativePath
  $header = Get-SiteHeader $section
  $footer = Get-SiteFooter
  $html = [System.IO.File]::ReadAllText($file.FullName)
  $isToolPage = $relativePath -like "fire-calculators\tools\*\index.html"
  $siteHeaderPattern = '(?s)\s*<a class="skip-link".*?</header>'
  $siteFooterPattern = '(?s)\s*<footer class="site-footer">.*?</footer>'

  if ($isToolPage) {
    if ($html -notmatch '/assets/css/content\.css') {
      $html = $html -replace '(\s*<link rel="stylesheet" href="\.\./\.\./style\.css\?v=[^"]+" />)', "`r`n  <link rel=`"stylesheet`" href=`"/assets/css/content.css?v=20260621-1`" />`$1`r`n  <link rel=`"stylesheet`" href=`"../../site-shell.css?v=20260622-1`" />"
    }

    if ($html -match '<header class="site-header">') {
      $html = [regex]::Replace($html, $siteHeaderPattern, ("`r`n" + $header.TrimEnd()), 1)
    }
    else {
      $html = $html -replace '<body>\s*', ("<body>`r`n" + $header + "`r`n")
    }

    if ($html -match '<main(?![^>]*\sid=)') {
      $html = $html -replace '<main(?![^>]*\sid=)([^>]*)>', '<main id="main-content"$1>'
    }

    $oldFooterPattern = '(?s)\s*<footer>\s*<p>\s*(.*?)\s*</p>.*?</footer>'
    $oldFooterMatch = [regex]::Match($html, $oldFooterPattern)
    if ($oldFooterMatch.Success) {
      $disclaimer = [regex]::Replace($oldFooterMatch.Groups[1].Value, '\s+', ' ').Trim()
      $replacement = "`r`n`r`n    <p class=`"tool-page-disclaimer`">$disclaimer</p>"
      $html = [regex]::Replace($html, $oldFooterPattern, $replacement, 1)
    }

    if ($html -match '<footer class="site-footer">') {
      $html = [regex]::Replace($html, $siteFooterPattern, ("`r`n" + $footer.TrimEnd()), 1)
    }
    else {
      $html = $html -replace '</body>', ($footer + "`r`n</body>")
    }
  }
  else {
    if ($html -match $siteHeaderPattern) {
      $html = [regex]::Replace($html, $siteHeaderPattern, ("`r`n" + $header.TrimEnd()), 1)
    }

    if ($html -match $siteFooterPattern) {
      $html = [regex]::Replace($html, $siteFooterPattern, ("`r`n`r`n" + $footer.TrimEnd()), 1)
    }
  }

  $html = [regex]::Replace($html, '(\r?\n)+\z', "`r`n")
  [System.IO.File]::WriteAllText($file.FullName, $html, $utf8)
  Write-Output "Synced $relativePath"
}

