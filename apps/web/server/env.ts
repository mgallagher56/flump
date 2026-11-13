// Imported first by server.ts (ES imports run in order) so nothing reads NODE_ENV before this.
// react-router-serve defaulted to production when unset; keep that.
process.env.NODE_ENV = process.env.NODE_ENV ?? "production";
