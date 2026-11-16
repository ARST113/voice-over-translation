import { expect, test } from "bun:test";
import { buildManifestChrome } from "../vite/lib/extension/manifest-helpers";

test("wildcard userscript connect grants become valid extension host permissions", () => {
  const manifest = buildManifestChrome({
    headers: {
      name: "VOT Universal HTML5",
      match: ["*://*/*"],
      connect: ["*", "yandex.ru"],
    },
    includeWorld: true,
  });

  expect(manifest.host_permissions).toEqual([
    "<all_urls>",
    "*://*.yandex.ru/*",
  ]);
});
