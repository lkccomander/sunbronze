$baseUrl = "http://127.0.0.1:8000"

function Invoke-ApiCheck {
    param(
        [string]$Name,
        [string]$Url
    )

    Write-Host ""
    Write-Host "=== $Name ==="
    Write-Host $Url

    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get

        if ($Name -eq "Health") {
            Write-Host "status:" $response.status
            Write-Host "database:" $response.database
            Write-Host "app:" $response.app
            Write-Host "environment:" $response.environment
            return
        }

        if ($response -is [System.Array]) {
            Write-Host "items returned:" $response.Count
            $response | Select-Object -First 3 | ConvertTo-Json -Depth 4
            return
        }

        $response | ConvertTo-Json -Depth 4
    }
    catch {
        Write-Host "request failed:" $_.Exception.Message -ForegroundColor Red
    }
}

Invoke-ApiCheck -Name "Health" -Url "$baseUrl/api/health"
Invoke-ApiCheck -Name "Services" -Url "$baseUrl/api/services?limit=5"
Invoke-ApiCheck -Name "Barbers" -Url "$baseUrl/api/barbers?limit=5"
Invoke-ApiCheck -Name "Resources" -Url "$baseUrl/api/resources?limit=5"
Invoke-ApiCheck -Name "Customers" -Url "$baseUrl/api/customers?limit=5"
Invoke-ApiCheck -Name "Locations" -Url "$baseUrl/api/locations?limit=5"
