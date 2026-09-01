// Guards the mobile dashboard layout against clipped frames and chart labels.

import assert from "node:assert/strict";
import test from "node:test";

import {
  MOBILE_CHART_MARGIN,
  MOBILE_PLAYER_AXIS_WIDTH,
  mobileAccentFrameSx,
} from "./liveDashboardPresentation.js";

test("mobile charts reserve space for compact six-digit labels", () => {
  assert.equal(MOBILE_CHART_MARGIN.left, 0);
  assert.ok(MOBILE_PLAYER_AXIS_WIDTH >= 48);
});

test("mobile cards use an inset accent line instead of a colored perimeter", () => {
  const accentColor = "rgba(52,211,153,0.55)";
  const styles = mobileAccentFrameSx(accentColor);

  assert.equal(styles.border.xs, "1px solid rgba(148,163,184,0.12)");
  assert.equal(styles.boxShadow.xs, "none");
  assert.equal(styles["&::before"].backgroundColor, accentColor);
  assert.ok(styles["&::before"].left > 0);
  assert.ok(styles["&::before"].right > 0);
});
