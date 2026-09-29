#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers the WidgetData plugin with the Capacitor bridge.
CAP_PLUGIN(WidgetDataPlugin, "WidgetData",
    CAP_PLUGIN_METHOD(setTimeTogether, CAPPluginReturnPromise);
)
