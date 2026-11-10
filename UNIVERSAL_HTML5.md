# VOT Universal HTML5 — experimental fork

This userscript preserves the upstream VOT adapters and adds a generic
fallback for HTML5 video players not listed by upstream.

## Install on Windows / Android

After the [preview release](https://github.com/ARST113/voice-over-translation/releases/tag/universal-html5-preview)
is published, install the userscript at:

https://github.com/ARST113/voice-over-translation/releases/download/universal-html5-preview/vot.user.js

Use Tampermonkey in Firefox Android or Chrome/Edge/Firefox on desktop.
The script appears separately as **[VOT Universal HTML5]** in the
Tampermonkey dashboard; disable the unmodified **[VOT]** script to prevent
duplicate controls. The preview release URL is also used for script updates.

## HTML5 language handling

The universal adapter leaves the source language at **Auto** unless
the user selects one. It does not guess speech language from the web page
title: a Russian site title is not evidence that English audio is Russian.
A manually chosen source language takes priority when applying the
"don't translate these languages" preference.

## Subtitles

When a generic player exposes HTML `<track kind="subtitles" src="...">`
or `<track kind="captions" src="...">`, the fork reads its WebVTT or SRT
URL and offers that original track in VOT, alongside any Yandex-provided
tracks. It refreshes the site track list when new tracks appear after
player initialization. Site-provided English captions are not automatically
translated into Russian: translated captions still depend on the Yandex
subtitles backend supporting the given video URL.

## Limitations and privacy

- Direct media URLs must be accessible to the translation service;
  cookies, Referer policies, signed URL expiry and geo-blocks can prevent
  remote processing even if the browser plays the media successfully.
- Browser MediaSource/`blob:`, DRM and MediaStream do not provide a
  transferable media URL and are not supported.
- HLS/DASH URLs may be discoverable, but successful remote translation
  has not been verified.
- Video length and Yandex service availability remain subject to VOT
  restrictions.
- The scripts use broad `@match *://*/*` and `@connect *`
  permissions because they are designed for arbitrary hosts. Limit site
  access in Tampermonkey if appropriate.
- Translation sends video addresses, possibly including signed URL query
  tokens, to a third-party translation service. Do not submit private
  content unless you understand and accept this.

GitHub Actions runs type checks, unit tests and a userscript build before
publishing the preview. Browser-level end-to-end testing on a specific
HTML5 player is still needed.
