# Capacitor supplies scoped plugin/annotation keep rules as consumer rules.
# Keep custom bridge names/methods explicit and inspect the optimized DEX in CI.
-keep @com.getcapacitor.annotation.CapacitorPlugin class com.danilah.arrows.** {
    @com.getcapacitor.PluginMethod public <methods>;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes SourceFile,LineNumberTable,*Annotation*
