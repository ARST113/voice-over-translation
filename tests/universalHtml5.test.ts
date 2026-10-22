import { expect, test } from "bun:test";
import {
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
