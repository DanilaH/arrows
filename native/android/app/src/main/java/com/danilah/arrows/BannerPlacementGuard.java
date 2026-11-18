package com.danilah.arrows;

/** Final native containment check. Mapping/reservation is owned by the pinned kit in JS. */
final class BannerPlacementGuard {
    /** JSONObject decodes small JS counters as Integer; PluginCall.getLong ignores them. */
    static long revision(Object value) {
        if (!(value instanceof Number)) return -1;
        double n=((Number)value).doubleValue();
        return Double.isFinite(n)&&n>=0&&n<=9007199254740991d&&n==Math.rint(n)?((Number)value).longValue():-1;
    }
    static boolean valid(double x,double y,double w,double h,double wx,double wy,double ww,double wh,double rw,double rh,double l,double t,double r,double b,int requiredWidth,int requiredHeight){
        for(double v:new double[]{x,y,w,h,wx,wy,ww,wh,rw,rh,l,t,r,b})if(!Double.isFinite(v))return false;
        if(w<=0||h<=0||ww<=0||wh<=0||rw<=0||rh<=0||l<0||t<0||r<0||b<0)return false;
        if(x!=Math.rint(x)||y!=Math.rint(y)||w!=Math.rint(w)||h!=Math.rint(h)||w!=requiredWidth||h<requiredHeight)return false;
        return x>=Math.max(wx,l)&&y>=Math.max(wy,t)&&x+w<=Math.min(wx+ww,rw-r)&&y+h<=Math.min(wy+wh,rh-b);
    }
}
