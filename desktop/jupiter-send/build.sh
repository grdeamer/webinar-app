#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
: "${FFMPEG_BINARY:?Set FFMPEG_BINARY to an arm64 FFmpeg with avfoundation, SRT and VideoToolbox support}"
APP="dist/Jupiter Send.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" build
xcrun swiftc -swift-version 5 -O -module-cache-path build/module-cache -target arm64-apple-macosx15.0 Sources/*.swift -o "$APP/Contents/MacOS/JupiterSend" -framework SwiftUI -framework AVFoundation -framework Security
cp "$FFMPEG_BINARY" "$APP/Contents/Resources/ffmpeg"
chmod +x "$APP/Contents/Resources/ffmpeg"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>
<key>CFBundleName</key><string>Jupiter Send</string><key>CFBundleDisplayName</key><string>Jupiter Send</string><key>CFBundleIdentifier</key><string>events.jupiter.send</string><key>CFBundleExecutable</key><string>JupiterSend</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleShortVersionString</key><string>0.1.0</string><key>CFBundleVersion</key><string>1</string><key>LSMinimumSystemVersion</key><string>15.0</string><key>NSCameraUsageDescription</key><string>Jupiter Send uses the selected capture device for local preview and your live Jupiter Io program.</string><key>NSMicrophoneUsageDescription</key><string>Jupiter Send uses the selected audio device for local metering and your live Jupiter Io program.</string><key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
codesign --force --sign - "$APP/Contents/Resources/ffmpeg"
codesign --force --sign - "$APP"
echo "Built $APP"
