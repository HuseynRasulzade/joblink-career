import test from "node:test";
import assert from "node:assert/strict";
import { PHOTO_MAX_BYTES, parsePhotoDataUrl } from "../lib/photo.ts";

const b64 = (bytes) => Buffer.from(bytes).toString("base64");
const jpeg = (n = 20) => `data:image/jpeg;base64,${b64([0xff, 0xd8, 0xff, 0xe0, ...new Array(n).fill(1)])}`;

test("a real JPEG, PNG and WebP are accepted", () => {
  assert.equal(parsePhotoDataUrl(jpeg()).ok, true);
  assert.equal(parsePhotoDataUrl(`data:image/png;base64,${b64([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5, 6, 7, 8])}`).ok, true);
  assert.equal(parsePhotoDataUrl(`data:image/webp;base64,${b64([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50])}`).ok, true);
});

test("a file that only says it is an image, a wrong type or a huge file is refused", () => {
  assert.equal(parsePhotoDataUrl(`data:image/jpeg;base64,${b64([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}`).ok, false);
  assert.equal(parsePhotoDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=").ok, false);
  assert.equal(parsePhotoDataUrl("data:text/html;base64,PGh0bWw+").ok, false);
  assert.equal(parsePhotoDataUrl(jpeg(PHOTO_MAX_BYTES + 10)).ok, false);
  assert.equal(parsePhotoDataUrl("javascript:alert(1)").ok, false);
  assert.equal(parsePhotoDataUrl(undefined).ok, false);
});
