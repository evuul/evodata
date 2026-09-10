// Checks the rendered announcement and accessible label in both supported languages.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const { transform } = require("next/dist/build/swc");
const filename = fileURLToPath(new URL("./LiveHeaderNewsFlash.jsx", import.meta.url));
const { code } = await transform(await readFile(filename, "utf8"), {
  filename,
  jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } },
  module: { type: "commonjs" },
});
const compiled = new Module(filename);
compiled.filename = filename;
compiled.paths = Module._nodeModulePaths(fileURLToPath(new URL(".", import.meta.url)));
compiled._compile(code, filename);
const LiveHeaderNewsFlash = compiled.exports.default;
const now = Date.parse("2026-09-10T12:00:00Z");
const game = { players: 1564, updated: new Date(now).toISOString() };

for (const [locale, badge, message, label] of [
  ["sv", "NYHET", " är nu live i vår tracker!", "Trackernyheter"],
  ["en", "NEW", " is now live in our tracker!", "Tracker news"],
]) {
  test(`renders the Disco Balls announcement in ${locale}`, () => {
    const markup = renderToStaticMarkup(React.createElement(LiveHeaderNewsFlash, {
      translate: (sv, en) => locale === "sv" ? sv : en,
      locale, game, now,
    }));
    assert.match(markup, new RegExp(`<aside[^>]*aria-label="${label}"`));
    assert.ok(markup.includes(`>${badge}</span>`));
    assert.ok(markup.includes(`>Disco Balls</strong>${message}`));
    assert.ok(markup.includes(locale === "sv" ? "1 564 spelare" : "1,564 players"));
  });
}

const render = (props = {}) => renderToStaticMarkup(React.createElement(LiveHeaderNewsFlash, {
  translate: (sv, en) => en, locale: "en", now, game, ...props,
}));

test("shows zero players and hides missing, invalid or outdated counts", () => {
  assert.ok(render({ game: { ...game, players: 0 } }).includes("0 players"));
  for (const reading of [undefined, { ...game, players: null }, { ...game, players: -1 },
    { ...game, stale: true }, { ...game, stuck: true }, { ...game, error: true },
    { ...game, updated: "invalid" }, { ...game, updated: new Date(now - 26 * 60_000).toISOString() }]) {
    assert.ok(render({ game: reading }).includes("Player count currently unavailable"));
  }
});

test("removes the announcement after September 24 Stockholm time", () => {
  const expiresAt = Date.parse("2026-09-25T00:00:00+02:00");
  assert.notEqual(render({ now: expiresAt - 1 }), "");
  assert.equal(render({ now: expiresAt }), "");
  assert.equal(render({ now: expiresAt + 1 }), "");
});
