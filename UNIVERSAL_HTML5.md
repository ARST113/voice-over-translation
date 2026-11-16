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

## Yandex translation requests for generic players

The VOT API documents `translationHelp: [{ target: "video_file_url", targetUrl }]`
for unsupported page URLs backed by publicly retrievable MP4/WebM files.
This fork now sends the stable page address as `videoData.url` and the direct
media address in `translationHelp`, rather than using the sometimes
short-lived signed CDN URL as the translation request's primary address.

Only direct MP4/WebM links are eligible for this documented hint. HLS/DASH,
other URL formats, `blob:`/MSE and DRM are not implicitly supported by it.

The Yandex server must be able to retrieve the media URL. Cookies, IP-bound
tokens, short expiry, referer policies and geographic restrictions can still
cause `Yandex couldn't translate video`. A page playing successfully in the
browser does not prove remote accessibility. Do not paste full signed URLs
or account tokens into public bug reports.

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
player initialization. Empty subtitle responses for generic players are not
persistently cached, so another attempt can retry the Yandex subtitle endpoint
after the translation begins or finishes.

Site-provided English captions are not automatically translated into Russian:
translated captions still depend on the Yandex subtitles backend supporting
the given video URL. No `<track>`, no accessible generated captions and no
available subtitle API will still result in an empty subtitles list.

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
