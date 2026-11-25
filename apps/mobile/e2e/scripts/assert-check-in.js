// After the check-in walk-through (E12 S3): reads the fixture server's stats on the runner and
// fails the flow unless this month's check-in was finished, at least three saves reached the
// server and every one of them carried `checkIn: true`.
const res = http.get("http://127.0.0.1:8787/__fixture/stats");
if (res.status !== 200) throw new Error(`Fixture stats failed: ${res.status}`);
const stats = json(res.body);
if (stats.latestCompletedMonth !== stats.currentMonth) {
  throw new Error(
    `Check-in not finished: latest completed ${stats.latestCompletedMonth}, current ${stats.currentMonth}`,
  );
}
if (!(stats.snapshotPuts >= 3))
  throw new Error(`Expected 3 or more saves, got ${stats.snapshotPuts}`);
if (stats.putsWithoutCheckIn !== 0) {
  throw new Error(`${stats.putsWithoutCheckIn} saves did not send checkIn: true`);
}
