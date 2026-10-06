import SwiftUI
@main struct JupiterSendApp: App {
    @StateObject private var model = SenderModel()
    var body: some Scene {
        WindowGroup("Jupiter Send") { ContentView(model: model).frame(minWidth: 980, minHeight: 800).preferredColorScheme(.dark).onDisappear { model.stop() }.onReceive(NotificationCenter.default.publisher(for: NSApplication.willTerminateNotification)) { _ in model.stop() } }
        .commands { CommandGroup(replacing: .newItem) {} }
    }
}
struct ContentView: View {
    @ObservedObject var model: SenderModel
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                Image(systemName: "antenna.radiowaves.left.and.right").font(.system(size: 32)).foregroundStyle(.cyan)
                VStack(alignment: .leading) { Text("JUPITER SEND").font(.title.bold()); Text("Local program encoder  /  Jupiter Io").foregroundStyle(.secondary) }
                Spacer()
                Label(model.state, systemImage: model.sending ? "antenna.radiowaves.left.and.right" : "circle.fill").foregroundStyle(model.sending ? .green : .secondary)
            }
            HStack(alignment: .top, spacing: 20) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack { Text(model.frozen == nil ? "LOCAL PROGRAM" : "LOCAL SNAPSHOT").font(.caption.bold()); Spacer(); Button(model.frozen == nil ? "Freeze snapshot" : "Return to live") { model.frozen = model.frozen == nil ? model.image : nil }.disabled(model.image == nil && model.frozen == nil) }
                    ZStack {
                        RoundedRectangle(cornerRadius: 8).fill(Color.black)
                        if let image = model.frozen ?? model.image { Image(nsImage: image).resizable().scaledToFit() }
                        else { VStack(spacing: 10) { Image(systemName: "video").font(.largeTitle); Text("Start local preview to inspect your capture input.").font(.callout) }.foregroundStyle(.secondary) }
                    }.frame(maxWidth: .infinity).aspectRatio(16/9, contentMode: .fit)
                    HStack { Text("PROGRAM AUDIO").font(.caption.bold()); Spacer(); Text(String(format: "%.1f dBFS", model.meter)).font(.system(.caption, design: .monospaced)) }
                    GeometryReader { geo in ZStack(alignment: .leading) { RoundedRectangle(cornerRadius: 3).fill(.white.opacity(0.08)); RoundedRectangle(cornerRadius: 3).fill(model.meter > -6 ? Color.red : model.meter > -18 ? Color.yellow : Color.green).frame(width: max(0, geo.size.width * (model.meter + 60) / 60)) } }.frame(height: 16)
                    Text("Preview and frozen snapshots stay in memory on this Mac. No recording or automatic image upload.").font(.caption).foregroundStyle(.secondary)
                }.frame(maxWidth: .infinity)
                VStack(alignment: .leading, spacing: 14) {
                    Text("CAPTURE & SEND").font(.caption.bold()).foregroundStyle(.cyan)
                    TextField("Device name", text: $model.deviceName)
                    Picker("Video source", selection: $model.video) { ForEach(model.videos) { Text($0.name).tag($0.id) } }.disabled(model.running)
                    Picker("Audio source", selection: $model.audio) { ForEach(model.audios) { Text($0.name).tag($0.id) } }.disabled(model.running)
                    Button("Refresh devices") { model.refreshDevices() }.disabled(model.running)
                    Divider()
                    Picker("Resolution", selection: $model.resolution) { Text("1080p").tag("1920x1080"); Text("720p").tag("1280x720") }.disabled(model.running)
                    Picker("Frame rate", selection: $model.fps) { Text("30 fps").tag(30); Text("15 fps").tag(15) }.disabled(model.running)
                    Stepper("Bitrate: \(model.bitrate) Kbps", value: $model.bitrate, in: 1000...20000, step: 500).disabled(model.running)
                    Picker("H.264 encoder", selection: $model.videoEncoder) { Text("Software (CPU)").tag("libx264"); Text("VideoToolbox (hardware)").tag("h264_videotoolbox") }.disabled(model.running)
                    Text("H.264 · AAC 48 kHz · encrypted SRT").font(.caption).foregroundStyle(.secondary)
                    Divider()
                    SecureField("Paste Jupiter Io SRT connection", text: $model.connection).disabled(model.running)
                    HStack { Button("Paste connection") { if let text = NSPasteboard.general.string(forType: .string) { model.connection = text.trimmingCharacters(in: .whitespacesAndNewlines) } }.disabled(model.running); Button("Save in Keychain") { model.saveConnection() }.disabled(model.running) }
                    Text("Get the connection from Jupiter Io → Manage ingest → Copy connection. Allow this Mac’s public IP in the receiver firewall.").fixedSize(horizontal: false, vertical: true).font(.caption).foregroundStyle(.secondary)
                }.textFieldStyle(.roundedBorder).frame(width: 330).padding(18).background(.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 10))
            }
            Spacer(minLength: 0)
            Text(model.notice).lineLimit(8).font(.callout).foregroundStyle(.secondary).frame(minHeight: 35, alignment: .leading)
            HStack(spacing: 12) {
                Button("Start local preview") { model.frozen = nil; model.start(send: false) }.keyboardShortcut("p", modifiers: .command).disabled(model.running).buttonStyle(.bordered)
                Button("Send to Jupiter Io") { model.frozen = nil; model.start(send: true) }.disabled(model.sending).buttonStyle(.borderedProminent).tint(.blue)
                Button("Stop") { model.stop(); model.frozen = nil }.disabled(!model.running).buttonStyle(.bordered)
                Spacer()
                Link("Open Jupiter Io", destination: URL(string: "https://app.jupiter.events/admin/jupiter-io")!)
            }
        }.padding(28).background(Color(red: 0.025, green: 0.055, blue: 0.09))
    }
}
