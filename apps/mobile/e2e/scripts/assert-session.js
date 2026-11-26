// After a sign-out flow (E12 S2b): reads the fixture server's stats on the runner. SIGN_OUTS is the
// number of server sign-outs expected (the app revoked its session, with no browser). MAX_AGE, if
// given, is the `max_age` the last sign-in must have sent ("0": WorkOS asks again every time).
// The app shows the sign-in screen before its sign-out call lands, so the server waits (up to 10
// seconds) for the expected count before answering. A count of 0 is read at once.
const res = http.get(`http://127.0.0.1:8787/__fixture/stats?signOutsAtLeast=${SIGN_OUTS}`);
if (res.status !== 200) throw new Error(`Fixture stats failed: ${res.status}`);
const stats = json(res.body);
if (String(stats.signOuts) !== SIGN_OUTS) {
  throw new Error(`Expected ${SIGN_OUTS} server sign-outs, got ${stats.signOuts}`);
}
if (typeof MAX_AGE !== "undefined" && stats.lastAuthorizeMaxAge !== MAX_AGE) {
  throw new Error(`Expected max_age ${MAX_AGE}, got ${stats.lastAuthorizeMaxAge}`);
}
