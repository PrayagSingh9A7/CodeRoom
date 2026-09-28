Write-Host "CodeRoom setup" -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { Write-Host "Docker Desktop is required." -ForegroundColor Red; exit 1 }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host "Node.js 22+ is required." -ForegroundColor Red; exit 1 }
Copy-Item .env.example .env -ErrorAction SilentlyContinue
Docker compose up -d
npm install
npm run db:push
Write-Host "Setup complete. Run: npm run dev" -ForegroundColor Green
