package com.danilah.arrows;
import org.junit.Test;
import static org.junit.Assert.*;
public class BannerPlacementGuardTest {
    private boolean valid(double x,double y,double w,double h){return BannerPlacementGuard.valid(x,y,w,h,0,0,1080,2400,1080,2400,0,80,0,130,1080,150);}
    @Test public void currentWholePixelsStayAboveNavigationAndInsideWebView(){
        assertTrue(valid(0,2120,1080,150));assertFalse(valid(0,2121,1080,150));assertFalse(valid(0,75,1080,150));
        assertFalse(valid(-1,2120,1080,150));assertFalse(valid(0,2120,1081,150));assertFalse(valid(0,2120,1080,149));
    }
    @Test public void invalidFractionalAndNonFiniteGeometryNeverShows(){
        assertFalse(valid(.5,2120,1080,150));assertFalse(valid(0,2120,Double.NaN,150));assertFalse(valid(0,2120,1080,Double.POSITIVE_INFINITY));
        assertFalse(valid(0,2120,0,150));assertFalse(valid(0,2120,1080,-1));
    }
    @Test public void webViewOffsetsAndSideCutoutsAreIndependentExclusions(){
        assertTrue(BannerPlacementGuard.valid(40,1080,720,100,20,30,760,1200,800,1280,40,50,40,60,720,100));
        assertFalse(BannerPlacementGuard.valid(20,1080,720,100,20,30,760,1200,800,1280,40,50,40,60,720,100));
        assertFalse(BannerPlacementGuard.valid(40,1140,720,100,20,30,760,1200,800,1280,40,50,40,60,720,100));
    }
}
