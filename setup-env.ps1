Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  開始配置 Node.js 20 開發環境 (使用 nvm) " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 檢查是否已有 winget
$wingetExists = Get-Command winget -ErrorAction SilentlyContinue

if ($wingetExists) {
    Write-Host "[1/3] 正在使用 winget 安裝 NVM for Windows..." -ForegroundColor Yellow
    # 安裝 NVM for Windows
    winget install CoreyButler.NVMforWindows --accept-package-agreements --accept-source-agreements --silent
    Write-Host "[成功] NVM for Windows 安裝完成！" -ForegroundColor Green
} else {
    Write-Host "[錯誤] 您的系統中未安裝 winget，請手動前往 https://github.com/coreybutler/nvm-windows/releases 下載 nvm-setup.exe" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  環境變數需要重新載入！" -ForegroundColor Red
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "由於 Windows 的限制，新安裝的環境變數無法立刻在目前的終端機生效。"
Write-Host "請依照以下步驟完成後續設定：" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 完全關閉並重新啟動 VS Code (或您目前的終端機視窗)。"
Write-Host "2. 重新打開終端機，依序輸入以下指令："
Write-Host "   nvm install 20" -ForegroundColor Green
Write-Host "   nvm use 20" -ForegroundColor Green
Write-Host "   npm install" -ForegroundColor Green
Write-Host "   npm run dev" -ForegroundColor Green
Write-Host ""
Write-Host "若過程中遇到權限問題，請嘗試以「系統管理員身分」執行終端機。"
