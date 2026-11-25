/**
 * Reads the VERIFY_* variables that `verify-flump` sets for journeys and the seeder. These scripts
 * run outside turbo, so the lookups go through one named helper instead of literal
 * `process.env.X` reads, which Biome's turbo env check would list as undeclared task inputs.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: run this through verify-flump`);
  return value;
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name] || undefined;
}
