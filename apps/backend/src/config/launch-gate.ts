/**
 * Bank launch gate (BE-07, flipped by BE-12). `BANK_CONNECTIONS_ENABLED=true` opens bank
 * connections to every signed-in user, so boot refuses it until the bank sync, token and consent
 * work in BE-12 has shipped and this constant is set to true in that PR. The owner allow-list
 * (`BANK_CONNECTIONS_ALLOWED_USER_IDS`) is not affected.
 */
export const BANK_LAUNCH_GATE_PASSED = false;
