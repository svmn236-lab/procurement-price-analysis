@echo off
chcp 65001 >nul
:: 檢查是否擁有系統管理員權限
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [成功] 已取得系統管理員權限，準備安裝環境...
) else (
    echo [提示] 需要系統管理員權限來安裝環境變數。正在請求權限...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ========================================================
echo        開始安裝 NVM (Node Version Manager)
echo ========================================================
echo.
echo 正在透過 winget 下載並安裝 nvm-windows...
winget install CoreyButler.NVMforWindows --accept-package-agreements --accept-source-agreements --silent

if %errorLevel% neq 0 (
    echo.
    echo [錯誤] winget 安裝失敗，可能是網路問題或權限不足。
    pause
    exit /b
)

echo.
echo ========================================================
echo [成功] NVM 安裝完成！
echo ========================================================
echo.
echo ⚠️ 接下來的步驟非常重要，請務必仔細閱讀 ⚠️
echo.
echo 因為 Windows 的限制，您目前的 VS Code 或終端機還沒有抓到新安裝的路徑。
echo.
echo 請您：
echo 1. 完全關閉這個黑色視窗
echo 2. 徹底關閉您的 VS Code (不是只關閉終端機，是整個軟體關掉重開)
echo 3. 重新打開 VS Code，打開終端機 (Terminal)
echo 4. 依序輸入以下指令：
echo.
echo    nvm install 20
echo    nvm use 20
echo    npm install
echo    npm run dev
echo.
echo ========================================================
pause
