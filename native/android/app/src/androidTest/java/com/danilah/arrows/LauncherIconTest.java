package com.danilah.arrows;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.Drawable;
import android.util.Log;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Inspect the actual installed Android resources, not a CSS icon mockup. */
@RunWith(AndroidJUnit4.class)
public class LauncherIconTest {
    @Test public void installedAdaptiveIcon() throws Exception {
        Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        Drawable installed=context.getPackageManager().getApplicationIcon(context.getPackageName());
        assertTrue(installed instanceof AdaptiveIconDrawable);
        AdaptiveIconDrawable adaptive=(AdaptiveIconDrawable)installed;
        // Explicitly draw the foreground in the documented 108dp layer space.
        Bitmap foreground=Bitmap.createBitmap(1080,1080,Bitmap.Config.ARGB_8888);
        Drawable layer=adaptive.getForeground();layer.setBounds(0,0,1080,1080);layer.draw(new Canvas(foreground));
        double radius=0;
        for(int y=0;y<1080;y++)for(int x=0;x<1080;x++)
            if(Color.alpha(foreground.getPixel(x,y))>=128)radius=Math.max(radius,Math.hypot(x-539.5,y-539.5)/10);
        assertTrue("Opaque glyph fits the 33dp radius safe zone: "+radius,radius<=33);
        Bitmap sheet=Bitmap.createBitmap(720,240,Bitmap.Config.ARGB_8888);Canvas canvas=new Canvas(sheet);
        Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);int[] sizes={96,64,48,32};
        for(int row=0;row<2;row++){
            paint.setColor(row==0?0xfff3f4fa:0xff181824);canvas.drawRect(0,row*120,720,(row+1)*120,paint);
            for(int i=0;i<sizes.length;i++){
                int size=sizes[i],left=i*180+(180-size)/2,top=row*120+(120-size)/2;
                // Fetch a fresh resource after the standalone layer measurement.
                Drawable icon=context.getPackageManager().getApplicationIcon(context.getPackageName());
                icon.setBounds(left,top,left+size,top+size);icon.draw(canvas);
            }
        }
        android.content.ContentValues values=new android.content.ContentValues();
        values.put(android.provider.MediaStore.Images.Media.DISPLAY_NAME,"launcher-icons.png");
        values.put(android.provider.MediaStore.Images.Media.MIME_TYPE,"image/png");
        values.put(android.provider.MediaStore.Images.Media.RELATIVE_PATH,"Pictures/ArrowsQA");
        android.net.Uri uri=context.getContentResolver().insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);assertNotNull(uri);
        try(java.io.OutputStream out=context.getContentResolver().openOutputStream(uri)){assertNotNull(out);assertTrue(sheet.compress(Bitmap.CompressFormat.PNG,100,out));}
        Log.i("ArrowsIconTest","Installed adaptive launcher: opaqueForegroundRadiusDp="+radius+" safeRadiusDp=33 smallSizesPx=48,32");
    }
}
