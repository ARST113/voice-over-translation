import { expect, test } from "bun:test";
import {
  getHtml5CaptionTracks,
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
