import test from "node:test";
import assert from "node:assert/strict";
import { checkLocation, distanceMeters, validPoint } from "../lib/geofence.ts";

const office = { lat: 40.4093, lng: 49.8671, radius: 150 };

test("the distance between two points is close to the real one", () => {
  assert.equal(distanceMeters(office, office), 0);
  const d = distanceMeters(office, { lat: 40.4093, lng: 49.8771 }); // 0.01 degree of longitude at 40.4N is about 850 m
  assert.ok(d > 800 && d < 900, String(d));
});

test("off lets everyone in, warn leaves a note, require refuses", () => {
  const near = { lat: 40.4094, lng: 49.8672 };
  const far = { lat: 40.42, lng: 49.9 };
  assert.equal(checkLocation("off", office, far).allowed, true);
  assert.equal(checkLocation("require", office, near).allowed, true);
  const warn = checkLocation("warn", office, far);
  assert.equal(warn.allowed, true);
  assert.equal(warn.outside, true);
  assert.match(warn.note, /kənarda/);
  const strict = checkLocation("require", office, far);
  assert.equal(strict.allowed, false);
  assert.match(strict.error, /ofisdən/);
});

test("a missing or impossible position is refused only in require mode", () => {
  assert.equal(checkLocation("require", office, null).allowed, false);
  assert.equal(checkLocation("warn", office, null).allowed, true);
  assert.equal(checkLocation("warn", office, null).note.length > 0, true);
  assert.equal(validPoint(0, 0), false);
  assert.equal(validPoint(91, 10), false);
  assert.equal(validPoint("40.4", "49.8"), true);
  assert.equal(checkLocation("require", null, { lat: 1, lng: 1 }).allowed, true);
});
