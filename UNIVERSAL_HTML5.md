# Universal HTML5 VOT (experimental)

This fork adds a generic HTML5 source adapter to the upstream userscript.
It is designed for Firefox Android with Tampermonkey, and also works as a
desktop userscript.

## Build/install

Use **Actions → Build VOT Universal HTML5 → latest successful run → Artifacts**
and download `vot-universal-html5-userscript`. Extract `vot.user.js` and
install it with Tampermonkey in Firefox Android. Disable the original VOT
userscript to prevent duplicate controls.

Local development: `bun install --frozen-lockfile && bun run check &&
bun test tests/universalHtml5.test.ts && bun run build:gm:default`.

## Scope and limitations

- The upstream VOT site adapters have priority. The universal fallback
  applies to other HTML5 <video> players and accepts an HTTP(S) media
  URL from `currentSrc`, `src`, or `<source src>`.
- The resolved network URL is submitted to the upstream VOT translation
  mechanism; success requires the Yandex service to access that video.
- Cookies, Referer checks, expiring signed URLs, and geo restrictions can
  prevent remote access even if the browser itself can play the media.
- `blob:`/MSE, MediaStream and DRM-protected playback are not supported.
- HLS/DASH manifest URLs can be detected, but their use by the translation
  backend has not been validated.
- Broad `@match *://*/*` permission runs the userscript on many sites.
  Restrict site permissions in Tampermonkey if privacy is important.
- Video URLs (possibly containing time-limited tokens) are sent to a
  third-party translation service when translation is requested. Do not
  translate private material unless you understand this data flow.

This is a prototype: automated tests cover source resolution and the
repository workflow checks its build. End-to-end translation on specific
Android sites remains to be verified.
