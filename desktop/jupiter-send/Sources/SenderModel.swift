import SwiftUI
import AVFoundation
import Security
struct CaptureDevice: Identifiable { let id: String; let name: String }
@MainActor final class SenderModel: ObservableObject {
    @Published var videos: [CaptureDevice] = []
    @Published var audios: [CaptureDevice] = []
    @Published var video = "0"
    @Published var audio = "0"
    @Published var deviceName = "Jupiter Send"
    @Published var connection = ""
    @Published var resolution = "1920x1080"
    @Published var bitrate = 6000
    @Published var fps = 30
    @Published var videoEncoder = "libx264"
    @Published var image: NSImage?
    @Published var frozen: NSImage?
    @Published var meter = -60.0
    @Published var state = "Ready"
    @Published var running = false
    @Published var sending = false
    @Published var notice = "Select your capture device and audio source. Preview stays on this Mac."
    private var process: Process?
    private var generation = UUID()
    var encoder: URL? { Bundle.main.url(forResource: "ffmpeg", withExtension: nil) }
    init() { connection = SecretStore.read(); refreshDevices() }
    func refreshDevices() {
        guard let encoder else { notice = "Bundled encoder missing."; return }
        let p = Process(), pipe = Pipe()
        p.executableURL = encoder; p.arguments = ["-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""]
        p.standardError = pipe; p.standardOutput = FileHandle.nullDevice
        DispatchQueue.global().async {
            do {
                try p.run()
                let text = String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
                p.waitUntilExit()
                var v: [CaptureDevice] = [], a: [CaptureDevice] = [], isAudio = false
                let pattern = try NSRegularExpression(pattern: "\\[(\\d+)\\] (.+)$")
                for line in text.components(separatedBy: .newlines) {
                    if line.contains("AVFoundation audio devices") { isAudio = true; continue }
                    if line.contains("AVFoundation video devices") { isAudio = false; continue }
                    let s = line as NSString
                    if let m = pattern.firstMatch(in: line, range: NSRange(location: 0, length: s.length)) {
                        let d = CaptureDevice(id: s.substring(with: m.range(at: 1)), name: s.substring(with: m.range(at: 2)))
                        if isAudio { a.append(d) } else if !d.name.hasPrefix("Capture screen") { v.append(d) }
                    }
                }
                DispatchQueue.main.async { self.videos = v; self.audios = a; if !v.contains(where: {$0.id == self.video}) { self.video = v.first?.id ?? "0" }; if !a.contains(where: {$0.id == self.audio}) { self.audio = a.first?.id ?? "0" } }
            } catch { DispatchQueue.main.async { self.notice = "Could not enumerate capture devices." } }
        }
    }
    func validatedConnection() -> String? {
        guard var c = URLComponents(string: connection.trimmingCharacters(in: .whitespacesAndNewlines)), c.scheme == "srt", let host = c.host, !host.isEmpty, let port = c.port, (1...65535).contains(port), c.user == nil, c.password == nil else { return nil }
        var items = c.queryItems ?? []
        guard items.first(where: {$0.name == "mode"})?.value == "caller", let secret = items.first(where: {$0.name == "passphrase"})?.value, (10...79).contains(secret.count) else { return nil }
        items.removeAll { $0.name == "pbkeylen" || $0.name == "enforced_encryption" }
        items.append(URLQueryItem(name: "pbkeylen", value: "32")); items.append(URLQueryItem(name: "enforced_encryption", value: "1")); c.queryItems = items
        return c.string
    }
    func start(send: Bool) {
        if send && validatedConnection() == nil { notice = "Paste an encrypted caller SRT connection from Jupiter Io."; return }
        guard !videos.isEmpty, !audios.isEmpty else { notice = "Connect a video capture device and audio source, then refresh."; return }
        Task {
            let camera = await AVCaptureDevice.requestAccess(for: .video)
            let mic = await AVCaptureDevice.requestAccess(for: .audio)
            guard camera && mic else { notice = "Enable camera and microphone for Jupiter Send in System Settings > Privacy & Security."; return }
            let prior = process
            stop()
            if let prior, prior.isRunning {
                await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                    DispatchQueue.global().async { prior.waitUntilExit(); continuation.resume() }
                }
            }
            launch(send: send)
        }
    }
    private func launch(send: Bool) {
        stop()
        guard let encoder else { return }
        let id = UUID(); generation = id
        let p = Process(), pictures = Pipe(), diagnostics = Pipe()
        var args = ["-hide_banner", "-nostdin", "-loglevel", "info", "-f", "avfoundation", "-framerate", String(fps), "-video_size", resolution, "-i", "\(video):\(audio)"]
        let meterFilter = "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level"
        if send, let url = validatedConnection() {
            args += ["-map", "0:v:0", "-map", "0:a:0", "-c:v", videoEncoder, "-b:v", "\(bitrate)k", "-g", String(fps * 2), "-pix_fmt", "yuv420p", "-af", meterFilter, "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-f", "mpegts", url]
        } else {
            args += ["-map", "0:a:0", "-af", meterFilter, "-f", "null", "/dev/null"]
        }
        if send && videoEncoder == "libx264" {
            if let position = args.firstIndex(of: "-c:v") { args.insert(contentsOf: ["-preset", "veryfast", "-tune", "zerolatency"], at: position) }
        }
        args += ["-map", "0:v:0", "-an", "-vf", "fps=2,scale=960:-2", "-c:v", "mjpeg", "-q:v", "4", "-f", "image2pipe", "pipe:1"]
        p.executableURL = encoder; p.arguments = args; p.standardOutput = pictures; p.standardError = diagnostics
        p.terminationHandler = { proc in
            DispatchQueue.main.async {
                if self.generation == id { self.running = false; self.sending = false; self.state = "Stopped"; self.meter = -60; if proc.terminationStatus != 0 { self.notice = "Encoder stopped. Check device availability, supported format, receiver, sender-IP firewall and connection. No automatic retry." } }
            }
        }
        do { try p.run(); process = p; running = true; sending = send; state = send ? "Sending to Jupiter Io" : "Local preview"; notice = send ? "Encrypted SRT send active. Verify reception in Jupiter Io and the destination Zoom meeting." : "Local picture and audio monitoring. No program is being sent." }
        catch { notice = "Could not start the bundled encoder."; return }
        DispatchQueue.global(qos: .userInitiated).async {
            var pending = Data()
            while true {
                let chunk = pictures.fileHandleForReading.availableData
                if chunk.isEmpty { break }; pending.append(chunk)
                while let end = pending.range(of: Data([0xff,0xd9])) {
                    let data = pending.subdata(in: 0..<end.upperBound); pending.removeSubrange(0..<end.upperBound)
                    if let image = NSImage(data: data) { DispatchQueue.main.async { if self.generation == id { self.image = image } } }
                }
                if pending.count > 5_000_000 { pending.removeAll() }
            }
        }
        DispatchQueue.global().async {
            var pending = ""
            while true {
                let data = diagnostics.fileHandleForReading.availableData
                if data.isEmpty { break }
                pending += String(decoding: data, as: UTF8.self)
                let lines = pending.components(separatedBy: .newlines); pending = lines.last ?? ""
                for line in lines.dropLast() {
                    if let range = line.range(of: "lavfi.astats.Overall.RMS_level="), let level = Double(line[range.upperBound...]), level.isFinite {
                        DispatchQueue.main.async { if self.generation == id { self.meter = max(-60, min(0, level)) } }
                    }
                }
                if pending.count > 8192 { pending = "" }
            }
        }
    }
    func stop() {
        generation = UUID(); let old = process; process = nil
        if let old, old.isRunning { old.terminate() }
        running = false; sending = false; state = "Ready"; meter = -60; image = nil
    }
    func saveConnection() { notice = SecretStore.write(connection) ? "Connection saved in macOS Keychain." : "Could not save to Keychain." }
}
enum SecretStore {
    static let base: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "events.jupiter.send", kSecAttrAccount as String: "srt-connection"]
    static func read() -> String { var q = base; q[kSecReturnData as String] = true; q[kSecMatchLimit as String] = kSecMatchLimitOne; var r: CFTypeRef?; guard SecItemCopyMatching(q as CFDictionary, &r) == errSecSuccess, let data = r as? Data else { return "" }; return String(decoding: data, as: UTF8.self) }
    static func write(_ value: String) -> Bool { SecItemDelete(base as CFDictionary); if value.isEmpty { return true }; var q = base; q[kSecValueData as String] = Data(value.utf8); return SecItemAdd(q as CFDictionary, nil) == errSecSuccess }
}
