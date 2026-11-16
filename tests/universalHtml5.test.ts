import { expect, test } from "bun:test";
import {
  getHtml5CaptionTracks,
  getHtml5TranslationSource,
  isUniversalHtml5Site,
  resolveHtml5MediaUrl,
} from "../src/universal/html5";

function makeVideo(overrides: Record<string, unknown> = {}): HTMLVideoElement {
  return {
    currentSrc: "",
    src: "",
    srcObject: null,
    mediaKeys: null,
    ownerDocument: { baseURI: "https://site.example/page/" },
    querySelectorAll: () => [],
    ...overrides,
  } as unknown as HTMLVideoElement;
}

test("uses the active HTTPS source and preserves signed query strings", () => {
  const video = makeVideo({
    currentSrc: "https://cdn.example/movie.mp4?token=secret#fragment",
  });
  expect(resolveHtml5MediaUrl(video)).toBe(
    "https://cdn.example/movie.mp4?token=secret",
  );
});

test("resolves relative source URL", () => {
  const video = makeVideo({
    querySelectorAll: () => [{ src: "../movie.webm" }],
  });
  expect(resolveHtml5MediaUrl(video)).toBe("https://site.example/movie.webm");
});

test("refuses an active blob/MSE stream, even with stale source entries", () => {
  const video = makeVideo({
    currentSrc: "blob:https://site.example/9abc",
    src: "https://cdn.example/old.mp4",
  });
  expect(resolveHtml5MediaUrl(video)).toBeNull();
});

test("refuses encrypted or MediaStream video", () => {
  expect(
    resolveHtml5MediaUrl(
      makeVideo({ mediaKeys: {}, src: "https://cdn.example/movie.mp4" }),
    ),
  ).toBeNull();
  expect(
    resolveHtml5MediaUrl(
      makeVideo({ srcObject: {}, src: "https://cdn.example/movie.mp4" }),
    ),
  ).toBeNull();
});

test("rejects private network URLs and embedded URL credentials", () => {
  expect(
    resolveHtml5MediaUrl(makeVideo({ currentSrc: "http://192.168.0.2/a.mp4" })),
  ).toBeNull();
  expect(
    resolveHtml5MediaUrl(makeVideo({ currentSrc: "http://100.64.0.1/a.mp4" })),
  ).toBeNull();
  expect(
    resolveHtml5MediaUrl(makeVideo({ currentSrc: "https://user:pass@cdn.example/a.mp4" })),
  ).toBeNull();
});

test("does not confuse the fallback with the existing custom service", () => {
  expect(
    isUniversalHtml5Site({
      host: "custom",
      additionalData: "universal-html5",
    }),
  ).toBe(true);
  expect(isUniversalHtml5Site({ host: "custom" })).toBe(false);
});

function fakeTrack(
  src: string,
  lang: string,
  kind: string = "subtitles",
): Record<string, unknown> {
  const attrs: Record<string, string> = { src, srclang: lang, kind };
  return {
    src,
    srclang: lang,
    kind,
    getAttribute: (name: string) => attrs[name] ?? null,
  };
}

test("extracts captions and subtitles without guessing language from page title", () => {
  const video = makeVideo({
    querySelectorAll: (selector: string) => {
      if (selector !== "track[src]") return [];
      return [
        fakeTrack("../captions-en.vtt?sig=abc", "en-US"),
        fakeTrack("https://cdn.example/captions-ru.srt", "ru", "captions"),
        fakeTrack("https://cdn.example/chapter.vtt", "en", "chapters"),
      ];
    },
  });
  expect(getHtml5CaptionTracks(video)).toEqual([
    {
      source: "html5",
      language: "en",
      format: "vtt",
      url: "https://site.example/captions-en.vtt?sig=abc",
    },
    {
      source: "html5",
      language: "ru",
      format: "srt",
      url: "https://cdn.example/captions-ru.srt",
    },
  ]);
});

test("deduplicates subtitle tracks and excludes local or blob sources", () => {
  const video = makeVideo({
    querySelectorAll: () => [
      fakeTrack("https://cdn.example/en.vtt", "en"),
      fakeTrack("https://cdn.example/en.vtt", "en"),
      fakeTrack("blob:https://site.example/ab", "en"),
      fakeTrack("http://127.0.0.1/private.vtt", "en"),
    ],
  });
  expect(getHtml5CaptionTracks(video)).toEqual([
    {
      source: "html5",
      language: "en",
      format: "vtt",
      url: "https://cdn.example/en.vtt",
    },
  ]);
});

test("preserves unknown subtitle language instead of guessing the speech language", () => {
  const video = makeVideo({
    querySelectorAll: () => [fakeTrack("https://cdn.example/caption.vtt", "")],
  });
  expect(getHtml5CaptionTracks(video)[0].language).toBe("und");
});

test("uses the documented video_file_url hint for MP4 on an unknown site", () => {
  const video = makeVideo({
    ownerDocument: {
      baseURI: "https://site.example/video?id=23",
      location: { href: "https://site.example/video?id=23#player" },
    },
  });
  const media = "https://cdn.example/clip.mp4?token=temporary";
  expect(getHtml5TranslationSource(video, media)).toEqual({
    url: "https://site.example/video?id=23",
    videoId: media,
    translationHelp: [{ target: "video_file_url", targetUrl: media }],
  });
});

test("handles signed MP4 URLs with a trailing slash", () => {
  const video = makeVideo();
  const media = "https://cdn.example/video.mp4/?v-acctoken=temporary";
  expect(getHtml5TranslationSource(video, media)).toEqual({
    url: "https://site.example/page/",
    videoId: media,
    translationHelp: [{ target: "video_file_url", targetUrl: media }],
  });
});

test("does not mislabel HLS/DASH URLs as a direct video file", () => {
  const video = makeVideo();
  for (const media of [
    "https://cdn.example/playlist.m3u8?token=temp",
    "https://cdn.example/manifest.mpd",
    "https://cdn.example/watch?video=123",
  ]) {
    expect(getHtml5TranslationSource(video, media)).toEqual({
      url: media,
      videoId: media,
      translationHelp: null,
    });
  }
});

test("retains direct media URL if the page is local or non-HTTP", () => {
  const media = "https://cdn.example/movie.webm";
  const video = makeVideo({
    ownerDocument: {
      baseURI: "about:blank",
      location: { href: "http://localhost:8080/view" },
    },
  });
  expect(getHtml5TranslationSource(video, media)).toEqual({
    url: media,
    videoId: media,
    translationHelp: null,
  });
});
