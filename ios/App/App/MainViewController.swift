import UIKit
import Capacitor

/// The app's web view controller; registers QuestNote's own native plugins.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(QuestNoteWidgetBridge())
    }
}
