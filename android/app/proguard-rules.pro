# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ========== REACT NATIVE CORE ==========
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# ========== HERMES JS ENGINE ==========
-keep class com.facebook.hermes.** { *; }

# ========== ASYNC STORAGE ==========
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ========== NETWORKING (AXIOS/FETCH) ==========
-keep class com.facebook.react.modules.network.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# ========== VECTOR ICONS ==========
-keep class com.oblador.vectoricons.** { *; }

# ========== SVG SUPPORT ==========
-keep class com.horcrux.svg.** { *; }

# ========== CIRCULAR PROGRESS ==========
-keep class com.bartolotito.** { *; }

# ========== TOAST NOTIFICATIONS ==========
-keep class com.toast.** { *; }

# ========== NAVIGATION ==========
-keep class com.reactnavigation.** { *; }

# ========== EXPO ==========
-keep class expo.modules.** { *; }

# ========== KEEP NATIVE METHODS ==========
-keepclasseswithmembernames class * {
    native <methods>;
}

# ========== KEEP REACT NATIVE BRIDGE CLASSES ==========
-keep class * extends com.facebook.react.bridge.JavaScriptModule { *; }
-keep class * extends com.facebook.react.bridge.NativeModule { *; }

# ========== KEEP SERIALIZATION ==========
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ========== KEEP ANNOTATIONS ==========
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keep class **.R
-keep class **.R$* {
    <fields>;
}

# ========== KEEP VIEWS ==========
-keep public class * extends android.view.View {
    public <init>(android.content.Context);
    public <init>(android.content.Context, android.util.AttributeSet);
    public <init>(android.content.Context, android.util.AttributeSet, int);
    public void set*(...);
}

# ========== KEEP JAVASCRIPT INTERFACE ==========
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ========== KEEP CLASSES THAT IMPLEMENT INTERFACES ==========
-keep class * implements android.os.Parcelable {
  public static final android.os.Parcelable$Creator *;
}

# ========== KEEP APPLICATION CLASS ==========
-keep public class * extends android.app.Application
-keep public class * extends android.app.Application {
    public <init>();
}

# ========== KEEP ACTIVITY CLASSES ==========
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Activity {
    public <init>();
}

# ========== KEEP ALL REACT PACKAGES ==========
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.swmansion.reanimated.** { *; }

# ========== KEEP MODEL CLASSES (For API responses) ==========
-keepclassmembers class your.package.name.models.** {
    *;
}

# ========== KEEP CLASSES WITH SPECIFIC ANNOTATIONS ==========
-keep @androidx.annotation.Keep class * {*;}
-keep class @com.facebook.soloader.** { *; }

# ========== DON'T OPTIMIZE (For certain problematic libraries) ==========
-dontoptimize class com.facebook.react.**
-dontoptimize class com.swmansion.reanimated.**