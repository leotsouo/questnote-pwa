import Foundation
import Capacitor
import WidgetKit

/// Receives the unfinished to-do snapshot from the web app (src/nativeBridge.js) after every
/// refresh, stores it in the shared App Group and asks WidgetKit to redraw the widgets.
/// Also hands the web app the questnote:// link of the last widget tap.
@objc(QuestNoteWidgetBridge)
public class QuestNoteWidgetBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "QuestNoteWidgetBridge"
    public let jsName = "QuestNoteWidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeLink", returnType: CAPPluginReturnPromise)
    ]

    static let appGroup = "group.io.github.leotsouo.questnote"
    static let snapshotKey = "widgetSnapshot"
    static let linkScheme = "questnote"
    static let linkEvent = "questnote:widget-link"

    /// Set by MainViewController; used to tell a running web app that a link arrived.
    static weak var current: QuestNoteWidgetBridge?
    /// The latest widget link the web app has not taken yet. Main thread only.
    private static var pendingLink: String?

    @objc func update(_ call: CAPPluginCall) {
        guard let snapshot = call.getObject("snapshot"),
              JSONSerialization.isValidJSONObject(snapshot),
              let data = try? JSONSerialization.data(withJSONObject: snapshot),
              let defaults = UserDefaults(suiteName: Self.appGroup) else {
            call.reject("Invalid widget snapshot")
            return
        }
        defaults.set(data, forKey: Self.snapshotKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    /// Called by SceneDelegate on the main thread. A cold launch has no web app yet: it reads the
    /// link at startup. A running one is told to read it now.
    static func receive(_ url: URL) {
        guard url.scheme == linkScheme else { return }
        pendingLink = url.absoluteString
        current?.bridge?.webView?.evaluateJavaScript("window.dispatchEvent(new Event('\(linkEvent)'))")
    }

    @objc func consumeLink(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let link = Self.pendingLink
            Self.pendingLink = nil
            call.resolve(link.map { ["url": $0] } ?? [:])
        }
    }
}
