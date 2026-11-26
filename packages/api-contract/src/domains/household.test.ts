// @vitest-environment node
import { describe, expect, it } from "vitest";
import { IDEMPOTENCY_EXCLUDED_ROUTES, routes } from "../manifest.js";
import {
  CreateHouseholdInvitationRequest,
  HOUSEHOLD_INVITATION_TTL_HOURS,
  HouseholdInvitationPreviewResponse,
  HouseholdInvitationToken,
  HouseholdJointSummaryItem,
  HouseholdResponse,
  LeaveHouseholdRequest,
} from "./household.js";

const token = () => "a".repeat(43);

describe("household contract (E34 C3)", () => {
  it("G1: an invitation is made with nothing about the invited person", () => {
    expect(CreateHouseholdInvitationRequest.safeParse({}).success).toBe(true);
    for (const extra of [{ email: "x@example.invalid" }, { name: "Sam" }, { userId: "u" }]) {
      expect(CreateHouseholdInvitationRequest.safeParse(extra).success).toBe(false);
    }
  });

  it("G8: the preview says joining shares nothing and carries no inviter field", () => {
    expect(HouseholdInvitationPreviewResponse.parse({ shares: [] })).toEqual({ shares: [] });
    expect(HouseholdInvitationPreviewResponse.safeParse({ shares: ["accounts"] }).success).toBe(
      false,
    );
    expect(
      HouseholdInvitationPreviewResponse.safeParse({ shares: [], inviterName: "Sam" }).success,
    ).toBe(false);
  });

  it("G4: the household state gives the other person's name and nothing else of theirs", () => {
    const withOther = {
      household: {
        sharesJointSummary: false,
        withName: null,
      },
      invitation: null,
      otherMember: { id: "u" },
    };
    expect(HouseholdResponse.safeParse(withOther).success).toBe(false);
    // No join date either: the screen does not need one, and the export keeps the person's own.
    expect(
      HouseholdResponse.safeParse({
        household: {
          sharesJointSummary: false,
          withName: null,
          joinedAt: "2026-11-25T10:00:00.000Z",
        },
        invitation: null,
      }).success,
    ).toBe(false);
    expect(
      HouseholdResponse.safeParse({
        household: {
          sharesJointSummary: false,
          withName: "Sam",
          lastSeen: 1,
        },
        invitation: null,
      }).success,
    ).toBe(false);
  });

  it("a summary item carries no share or percentage", () => {
    const item = {
      name: "Joint current",
      type: "Current",
      wholeBalance: 1200,
      addedBy: "you",
    };
    expect(HouseholdJointSummaryItem.safeParse(item).success).toBe(true);
    expect(HouseholdJointSummaryItem.safeParse({ ...item, sharePct: 50 }).success).toBe(false);
  });

  it("leaving takes no reason or approval", () => {
    expect(LeaveHouseholdRequest.safeParse({}).success).toBe(true);
    expect(LeaveHouseholdRequest.safeParse({ reason: "x" }).success).toBe(false);
  });

  it("tokens are 43 base64url characters and the link lasts 48 hours", () => {
    expect(HouseholdInvitationToken.safeParse(token()).success).toBe(true);
    expect(HouseholdInvitationToken.safeParse(`${token()}=`).success).toBe(false);
    expect(HouseholdInvitationToken.safeParse("a".repeat(42)).success).toBe(false);
    expect(HOUSEHOLD_INVITATION_TTL_HOURS).toBe(48);
  });

  it("G6: no route removes a member, renames, or sets a role", () => {
    const paths = Object.values(routes.household).map((r) => `${r.method} ${r.path}`);
    expect(paths.sort()).toEqual(
      [
        "GET household",
        "POST household/invitations",
        "DELETE household/invitations",
        "POST household/invitations/preview",
        "POST household/invitations/accept",
        "POST household/sharing",
        "POST household/leave",
        "GET household/joint-summary",
      ].sort(),
    );
  });

  it("the invitation create is not replayable by key: the token is a secret", () => {
    expect(IDEMPOTENCY_EXCLUDED_ROUTES).toContain("household.createInvitation");
  });
});
