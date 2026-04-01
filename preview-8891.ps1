#Requires -Version 5.1
# UTF-8 BOM above: required for Windows PowerShell 5.x to parse this file when path contains non-ASCII.
# Static HTTP server for this folder. Tries ports PortMin..PortMax if busy.
param(
  [int]$PortMin = 8891,
  [int]$PortMax = 8910,
  [switch]$NoBrowser
)

$Root = $PSScriptRoot
$rootFull = [System.IO.Path]::GetFullPath($Root)
$sep = [char][System.IO.Path]::DirectorySeparatorChar

function Test-UnderRoot([string]$candidate) {
  $c = [System.IO.Path]::GetFullPath($candidate)
  if ($c.Equals($rootFull, [StringComparison]::OrdinalIgnoreCase)) { return $true }
  $prefix = $rootFull.TrimEnd($sep) + $sep
  return $c.StartsWith($prefix, [StringComparison]::OrdinalIgnoreCase)
}

function Get-Mime([string]$ext) {
  switch ($ext.ToLowerInvariant()) {
    '.html' { return 'text/html; charset=utf-8' }
    '.js' { return 'application/javascript; charset=utf-8' }
    '.css' { return 'text/css; charset=utf-8' }
    '.json' { return 'application/json; charset=utf-8' }
    '.woff' { return 'font/woff' }
    '.woff2' { return 'font/woff2' }
    '.ttf' { return 'font/ttf' }
    '.otf' { return 'font/otf' }
    '.gif' { return 'image/gif' }
    '.png' { return 'image/png' }
    '.jpg' { return 'image/jpeg' }
    '.jpeg' { return 'image/jpeg' }
    '.svg' { return 'image/svg+xml' }
    '.ico' { return 'image/x-icon' }
    '.map' { return 'application/json' }
    '.webm' { return 'video/webm' }
    '.mp4' { return 'video/mp4' }
    default { return 'application/octet-stream' }
  }
}

$Listener = $null
$Port = 0
for ($p = $PortMin; $p -le $PortMax; $p++) {
  $L = [System.Net.HttpListener]::new()
  $null = $L.Prefixes.Add("http://127.0.0.1:$p/")
  try {
    $L.Start()
    $Listener = $L
    $Port = $p
    break
  } catch {
    $L.Close()
  }
}

if ($null -eq $Listener) {
  Write-Host "Could not bind port range ${PortMin}-${PortMax} (in use or need URL reservation)."
  Write-Host "Try: close other preview windows, or in Admin PowerShell:"
  Write-Host ('  netsh http add urlacl url=http://127.0.0.1:{0}/ user={1}' -f $PortMin, $env:USERNAME)
  exit 1
}

$url = 'http://127.0.0.1:{0}/' -f $Port
Write-Host "Serving: $Root"
Write-Host "Open:    $url"
Write-Host 'Press Ctrl+C to stop.'
Write-Host ''

if (-not $NoBrowser) {
  Start-Sleep -Seconds 1
  try { Start-Process $url } catch { }
}

try {
  while ($Listener.IsListening) {
    $ctx = $Listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $localPath = $req.Url.LocalPath
      if ($localPath -eq '/' -or $localPath -eq '') {
        $localPath = '/index.html'
      }
      $rel = $localPath.TrimStart('/').Replace('/', $sep)
      $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($Root, $rel))

      if (-not (Test-UnderRoot $filePath)) {
        $res.StatusCode = 403
        $b = [System.Text.Encoding]::UTF8.GetBytes('403')
        $res.ContentLength64 = $b.Length
        $res.OutputStream.Write($b, 0, $b.Length)
        continue
      }

      if (Test-Path -LiteralPath $filePath -PathType Leaf) {
        try {
          $bytes = [System.IO.File]::ReadAllBytes($filePath)
          $ext = [System.IO.Path]::GetExtension($filePath)
          $res.ContentType = Get-Mime $ext
          $res.ContentLength64 = $bytes.Length
          $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } catch {
          $res.StatusCode = 500
          $msg = [System.Text.Encoding]::UTF8.GetBytes('500')
          $res.ContentLength64 = $msg.Length
          $res.OutputStream.Write($msg, 0, $msg.Length)
        }
      } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
        $res.ContentLength64 = $msg.Length
        $res.OutputStream.Write($msg, 0, $msg.Length)
      }
    } finally {
      $res.Close()
    }
  }
} finally {
  $Listener.Stop()
  $Listener.Close()
}
