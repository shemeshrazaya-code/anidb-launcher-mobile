package com.anonymous.anidblaunchermobile

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import org.mozilla.geckoview.AllowOrDeny
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoView

class ShieldedBrowserActivity : Activity() {
  private var geckoSession: GeckoSession? = null
  private var canGoBack = false
  private lateinit var backButton: TextView
  private lateinit var urlLabel: TextView

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    val requestedUrl = intent.getStringExtra(EXTRA_URL)
    if (requestedUrl.isNullOrBlank()) {
      finish()
      return
    }

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(Color.rgb(14, 15, 16))
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT,
      )
    }

    val toolbar = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(10), dp(8), dp(10), dp(8))
      setBackgroundColor(Color.rgb(14, 15, 16))
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      )
    }

    backButton = toolbarButton("<").apply {
      isEnabled = false
      alpha = 0.45f
      setOnClickListener {
        if (canGoBack) {
          geckoSession?.goBack()
        }
      }
    }

    val reloadButton = toolbarButton("Reload").apply {
      setOnClickListener { geckoSession?.reload() }
    }
    val externalButton = toolbarButton("Open").apply {
      setOnClickListener {
        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(requestedUrl)))
      }
    }
    val closeButton = toolbarButton("Close").apply {
      setOnClickListener { finish() }
    }

    urlLabel = TextView(this).apply {
      text = hostLabel(requestedUrl)
      setTextColor(Color.rgb(230, 232, 235))
      textSize = 13f
      maxLines = 1
      ellipsize = android.text.TextUtils.TruncateAt.END
      setPadding(dp(8), 0, dp(8), 0)
      layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
    }

    toolbar.addView(backButton)
    toolbar.addView(reloadButton)
    toolbar.addView(urlLabel)
    toolbar.addView(externalButton)
    toolbar.addView(closeButton)

    val geckoView = GeckoView(this).apply {
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        0,
        1f,
      )
    }

    root.addView(toolbar)
    root.addView(geckoView)
    setContentView(root)

    val session = GeckoSession().also { geckoSession = it }
    session.setContentDelegate(object : GeckoSession.ContentDelegate {})
    session.setNavigationDelegate(object : GeckoSession.NavigationDelegate {
      override fun onCanGoBack(session: GeckoSession, canGoBack: Boolean) {
        this@ShieldedBrowserActivity.canGoBack = canGoBack
        backButton.isEnabled = canGoBack
        backButton.alpha = if (canGoBack) 1f else 0.45f
      }

      override fun onLocationChange(
        session: GeckoSession,
        url: String?,
        perms: MutableList<GeckoSession.PermissionDelegate.ContentPermission>,
        hasUserGesture: Boolean,
      ) {
        urlLabel.text = url?.let { hostLabel(it) } ?: "Shielded browser"
      }

      override fun onLoadRequest(
        session: GeckoSession,
        request: GeckoSession.NavigationDelegate.LoadRequest,
      ): GeckoResult<AllowOrDeny>? {
        if (request.target == GeckoSession.NavigationDelegate.TARGET_WINDOW_NEW) {
          session.loadUri(request.uri)
          return GeckoResult.deny()
        }
        return null
      }

      override fun onNewSession(
        session: GeckoSession,
        uri: String,
      ): GeckoResult<GeckoSession>? {
        return null
      }
    })

    val runtime = getOrCreateRuntime()
    session.open(runtime)
    geckoView.setSession(session)
    installUblockThenLoad(runtime, session, requestedUrl)
  }

  override fun onDestroy() {
    geckoSession?.close()
    geckoSession = null
    super.onDestroy()
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    if (canGoBack) {
      geckoSession?.goBack()
      return
    }
    super.onBackPressed()
  }

  private fun installUblockThenLoad(
    runtime: GeckoRuntime,
    session: GeckoSession,
    url: String,
  ) {
    runtime.webExtensionController
      .ensureBuiltIn(UBLOCK_ASSET_URI, UBLOCK_EXTENSION_ID)
      .accept(
        { session.loadUri(url) },
        { error ->
          Toast.makeText(
            this,
            "uBlock could not start; opening anyway.",
            Toast.LENGTH_SHORT,
          ).show()
          error?.printStackTrace()
          session.loadUri(url)
        },
      )
  }

  private fun toolbarButton(label: String): TextView {
    return TextView(this).apply {
      text = label
      setTextColor(Color.WHITE)
      textSize = 13f
      gravity = Gravity.CENTER
      setPadding(dp(10), dp(7), dp(10), dp(7))
      minWidth = dp(38)
      background = buttonBackground()
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.WRAP_CONTENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        marginEnd = dp(6)
      }
    }
  }

  private fun buttonBackground(): android.graphics.drawable.GradientDrawable {
    return android.graphics.drawable.GradientDrawable().apply {
      setColor(Color.rgb(31, 34, 38))
      cornerRadius = dp(7).toFloat()
      setStroke(1, Color.rgb(58, 62, 70))
    }
  }

  private fun hostLabel(url: String): String {
    return runCatching {
      Uri.parse(url).host?.removePrefix("www.") ?: "Shielded browser"
    }.getOrDefault("Shielded browser")
  }

  private fun dp(value: Int): Int {
    return (value * resources.displayMetrics.density).toInt()
  }

  private fun getOrCreateRuntime(): GeckoRuntime {
    return runtime ?: GeckoRuntime.create(this).also { runtime = it }
  }

  companion object {
    const val EXTRA_URL = "com.anonymous.anidblaunchermobile.EXTRA_URL"
    private const val UBLOCK_ASSET_URI = "resource://android/assets/ublock-origin/"
    private const val UBLOCK_EXTENSION_ID = "uBlock0@raymondhill.net"

    private var runtime: GeckoRuntime? = null
  }
}
