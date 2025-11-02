@echo off
REM Simple Windows batch script for video compression
REM Requires ffmpeg to be installed and in PATH

setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Usage: compress_video.bat input_video.mp4 [output_video.mp4]
    echo.
    echo Example: compress_video.bat lecture.mp4
    echo          compress_video.bat lecture.mp4 compressed_lecture.mp4
    echo.
    pause
    exit /b 1
)

set INPUT=%~1
set OUTPUT=%~2

REM Check if input file exists
if not exist "%INPUT%" (
    echo Error: File not found: %INPUT%
    pause
    exit /b 1
)

REM Set output filename if not provided
if "%OUTPUT%"=="" (
    set OUTPUT=%~n1_compressed%~x1
)

echo ============================================================
echo Video Compression - High Quality Mode
echo ============================================================
echo Input:  %INPUT%
echo Output: %OUTPUT%
echo.
echo Compressing video with high quality settings...
echo This may take a few minutes depending on video size.
echo ============================================================
echo.

REM Run ffmpeg with high-quality settings
ffmpeg -i "%INPUT%" -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart -y "%OUTPUT%"

if errorlevel 1 (
    echo.
    echo ============================================================
    echo ERROR: Compression failed
    echo ============================================================
    echo Please ensure ffmpeg is installed:
    echo Download from: https://ffmpeg.org/download.html
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo Compression Complete!
echo ============================================================
echo Output saved to: %OUTPUT%
echo.

REM Show file sizes
for %%A in ("%INPUT%") do set INPUT_SIZE=%%~zA
for %%A in ("%OUTPUT%") do set OUTPUT_SIZE=%%~zA

set /a INPUT_MB=%INPUT_SIZE% / 1048576
set /a OUTPUT_MB=%OUTPUT_SIZE% / 1048576

echo Original size: %INPUT_MB% MB
echo Compressed size: %OUTPUT_MB% MB
echo.

if %OUTPUT_MB% LEQ 100 (
    echo Status: File is within Cloudinary free plan limit ^(100MB^)
) else (
    echo WARNING: File exceeds 100MB Cloudinary limit
    echo Consider compressing again with medium quality:
    echo ffmpeg -i "%INPUT%" -c:v libx264 -crf 28 -c:a aac -b:a 128k "%OUTPUT%"
)

echo.
pause
