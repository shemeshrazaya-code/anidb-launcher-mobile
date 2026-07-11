package com.anonymous.anidblaunchermobile

import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ShieldedBrowserModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "ShieldedBrowser"

  @ReactMethod
  fun openUrl(url: String, promise: Promise) {
    val parsed = runCatching { Uri.parse(url) }.getOrNull()
    val scheme = parsed?.scheme?.lowercase()
    val host = parsed?.host
    if (parsed == null || (scheme != "http" && scheme != "https") || host.isNullOrBlank()) {
      promise.reject("E_BAD_URL", "Shielded browser only opens http and https URLs with a host.")
      return
    }

    try {
      val intent = Intent(reactContext, ShieldedBrowserActivity::class.java).apply {
        putExtra(ShieldedBrowserActivity.EXTRA_URL, url)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_OPEN_BROWSER", error)
    }
  }
}
