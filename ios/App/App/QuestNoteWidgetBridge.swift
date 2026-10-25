import Foundation
import Capacitor
import WidgetKit

/// Receives the unfinished to-do snapshot from the web app (src/nativeBridge.js) after every
/// refresh, stores it in the shared App Group and asks WidgetKit to redraw the widgets.
@objc(QuestNoteWidgetBridge)
public class QuestNoteWidgetBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "QuestNoteWidgetBridge"
    public let jsName = "QuestNoteWidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)
    ]

    static let appGroup = "group.io.github.leotsouo.questnote"
    static let snapshotKey = "widgetSnapshot"

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
}
