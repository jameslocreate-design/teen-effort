import UIKit
import Capacitor

/// Capacitor 6+ no longer auto-discovers plugins that live inside the App
/// target, so the WidgetData plugin must be registered here. Set this class
/// as the Custom Class of the Bridge View Controller in Main.storyboard.
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetDataPlugin())
    }
}
