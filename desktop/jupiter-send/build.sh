#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
: "${FFMPEG_BINARY:?Set FFMPEG_BINARY to an arm64 FFmpeg with avfoundation, SRT and VideoToolbox support}"
APP="dist/Jupiter Send.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" build
xcrun swiftc -swift-version 5 -O -module-cache-path build/module-cache -target arm64-apple-macosx15.0 Sources/*.swift -o "$APP/Contents/MacOS/JupiterSend" -framework SwiftUI -framework AVFoundation -framework Security
mkdir -p build/Jupiter.iconset
for size in 16 32 128 256 512; do
  sips -z "$size" "$size" ../../public/jupiter-share-icon.png --out "build/Jupiter.iconset/icon_${size}x${size}.png" >/dev/null
  double=$((size * 2))
  sips -z "$double" "$double" ../../public/jupiter-share-icon.png --out "build/Jupiter.iconset/icon_${size}x${size}@2x.png" >/dev/null
done
python3 - "$APP/Contents/Resources/Jupiter.icns" <<'PYICON'
import pathlib, struct, sys
chunks = []
for kind, name in [(b'icp4', 'icon_16x16.png'), (b'icp5', 'icon_32x32.png'), (b'icp6', 'icon_32x32@2x.png'), (b'ic07', 'icon_128x128.png'), (b'ic08', 'icon_256x256.png'), (b'ic09', 'icon_512x512.png'), (b'ic10', 'icon_512x512@2x.png')]:
    data = pathlib.Path('build/Jupiter.iconset', name).read_bytes()
    chunks.append(kind + struct.pack('>I', len(data) + 8) + data)
body = b''.join(chunks)
pathlib.Path(sys.argv[1]).write_bytes(b'icns' + struct.pack('>I', len(body) + 8) + body)
PYICON
cp "$FFMPEG_BINARY" "$APP/Contents/Resources/ffmpeg"
chmod +x "$APP/Contents/Resources/ffmpeg"
cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>
<key>CFBundleIconFile</key><string>Jupiter</string><key>CFBundleName</key><string>Jupiter Send</string><key>CFBundleDisplayName</key><string>Jupiter Send</string><key>CFBundleIdentifier</key><string>events.jupiter.send</string><key>CFBundleExecutable</key><string>JupiterSend</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleShortVersionString</key><string>0.1.0</string><key>CFBundleVersion</key><string>1</string><key>LSMinimumSystemVersion</key><string>15.0</string><key>NSCameraUsageDescription</key><string>Jupiter Send uses the selected capture device for local preview and your live Jupiter Io program.</string><key>NSMicrophoneUsageDescription</key><string>Jupiter Send uses the selected audio device for local metering and your live Jupiter Io program.</string><key>NSHighResolutionCapable</key><true/>
</dict></plist>
PLIST
codesign --force --sign - "$APP/Contents/Resources/ffmpeg"
codesign --force --sign - "$APP"
echo "Built $APP"
