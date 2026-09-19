import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { addDays, resolveSubscriptionState } from "./subscriptionState";

describe("resolveSubscriptionState", () => {
  it("marks paid plan as active while access_until is in the future", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    const state = resolveSubscriptionState(
      {
        trialStartedAt: "2026-09-01T00:00:00.000Z",
        plan: "monthly",
        subscriptionExpiresAt: "2026-10-19T12:00:00.000Z"
      },
      now
    );

    assert.equal(state.status, "active");
    assert.equal(state.plan, "monthly");
  });

  it("uses 3-day trial when there is no paid access", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    const state = resolveSubscriptionState(
      {
        trialStartedAt: "2026-09-18T12:00:00.000Z",
        plan: "none",
        subscriptionExpiresAt: null
      },
      now
    );

    assert.equal(state.status, "trial");
    assert.equal(state.plan, "none");
    assert.equal(state.trialEndsAt, addDays(new Date("2026-09-18T12:00:00.000Z"), 3).toISOString());
  });

  it("expires after trial without a paid plan", () => {
    const now = new Date("2026-09-19T12:00:00.000Z");
    const state = resolveSubscriptionState(
      {
        trialStartedAt: "2026-09-01T12:00:00.000Z",
        plan: "none",
        subscriptionExpiresAt: null
      },
      now
    );

    assert.equal(state.status, "expired");
  });
});
