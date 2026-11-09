package com.danilah.arrows;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.core.splashscreen.SplashScreen;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(ArrowsAdsPlugin.class);
        registerPlugin(ArrowsAnalyticsPlugin.class);
        registerPlugin(ArrowsFeedbackPlugin.class);
        registerPlugin(ArrowsStoragePlugin.class);
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
    }
}
