$port = 8080
$rootDir = $PSScriptRoot
if (-not $rootDir) { $rootDir = (Get-Location).Path }

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".txt"  = "text/plain; charset=utf-8"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$($port)/")
$listener.Prefixes.Add("http://127.0.0.1:$($port)/")

try {
    $listener.Start()
    Write-Host "AppCalorias local server running at:"
    Write-Host "  -> http://localhost:$($port)"
    Write-Host "  -> http://127.0.0.1:$($port)"
} catch {
    Write-Host "Failed to start listener on port $($port): $($_.Exception.Message)"
    exit 1
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        $response.Headers.Add("Access-Control-Allow-Headers", "*")
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.Close()
            continue
        }

        $rawUrl = $request.Url.AbsolutePath
        $decodedUrl = [System.Uri]::UnescapeDataString($rawUrl).TrimStart('/')

        if ([string]::IsNullOrWhiteSpace($decodedUrl)) {
            $response.StatusCode = 302
            $response.Headers.Add("Location", "/frontend/index.html")
            $response.Close()
            continue
        } else {
            $normalizedRelative = $decodedUrl.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $filePath = [System.IO.Path]::GetFullPath((Join-Path $rootDir $normalizedRelative))
        }

        # Prevent directory traversal
        if (-not $filePath.StartsWith($rootDir, [System.StringComparison]::OrdinalIgnoreCase)) {
            $response.StatusCode = 403
            $bytes = [System.Text.Encoding]::UTF8.GetBytes("403 Forbidden")
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
            $response.Close()
            continue
        }

        if (Test-Path $filePath -PathType Container) {
            $response.StatusCode = 302
            $response.Headers.Add("Location", "/$($decodedUrl.TrimEnd('/'))/index.html")
            $response.Close()
            continue
        }

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $response.ContentType = $contentType

            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $fileBytes.Length
            $response.StatusCode = 200

            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            }
        } else {
            $response.StatusCode = 404
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $($decodedUrl)")
            $response.ContentType = "text/plain; charset=utf-8"
            if ($request.HttpMethod -ne "HEAD") {
                $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
            }
        }
        $response.Close()
    } catch {
        # Continue loop on individual connection exceptions
    }
}
