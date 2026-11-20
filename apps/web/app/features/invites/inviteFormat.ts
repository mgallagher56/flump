/** One date style for the invites page: 4 Dec 2026 (en-GB, UTC so a server and browser agree). */
const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatInviteDate(iso: string): string {
  return DATE.format(new Date(iso));
}
