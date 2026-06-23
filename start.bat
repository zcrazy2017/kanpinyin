@echo off
chcp 65001 >nul
title 看拼音写词语 · 后端服务

echo ============================================
echo  看拼音写词语 · 后端服务启动中...
echo ============================================
echo.

:: 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Python，请先安装 Python 3。
    echo         https://www.python.org/downloads/
    pause
    exit /b 1
)

:: 安装依赖
echo [1/3] 检查并安装依赖...
pip install flask flask-cors pypinyin jieba -q

:: 启动后端
echo [2/3] 启动拼音后端服务（端口 5001）...
start /B python server\app.py

:: 等待后端就绪
echo [3/3] 等待后端就绪...
timeout /t 2 /nobreak >nul

:: 打开前台页面
echo [3/3] 打开浏览器...
start "" "index.html"
if errorlevel 1 (
    echo 已尝试打开浏览器，如未自动打开请手动打开 index.html
)

echo.
echo ============================================
echo  服务已启动！
echo  前端页面：index.html（已自动打开）
echo  拼音 API：http://localhost:5001/api/pinyin?char=好
echo.
echo  关闭此窗口即可停止服务。
echo ============================================
echo.

:: 保持窗口打开
pause
