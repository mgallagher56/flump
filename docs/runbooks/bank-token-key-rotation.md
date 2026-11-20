# Bank token key rotation

Bank access and refresh tokens in `bank_connections` are encrypted with AES-256-GCM by `@flump/banking` (`packages/banking/src/server/crypto.ts`). Each stored value carries the version of the key that wrote it, in the form `v<version>:<iv>:<tag>:<ciphertext>`, and is bound to its connection and field by associated data (`<connectionId>:access` or `<connectionId>:refresh`), so a value copied to another row or field does not decrypt.

There are no unprefixed legacy values any more. The `ClearBankTokens1794355300000` migration nulled every token written before versioning, and the code refuses an unprefixed value (S4, BE-18): reading one fails, and the connection is marked as needing the user to reconnect. Nothing in this runbook needs to allow for them.

## How keys are configured

- `BANKING_TOKEN_ENCRYPTION_KEY` is the single key. When it is the only variable set, it is key version 1.
- `BANKING_TOKEN_ENCRYPTION_KEYS` is an optional comma-separated list of `<version>:<secret>` entries. The first entry is the active key, which encrypts every new value. Every listed key can still decrypt.
- Versions are positive whole numbers and must be unique. Outside development and test, every secret must be at least 32 characters. A malformed list stops the backend at boot, and the error names the variable but never the key.
- While `BANKING_TOKEN_ENCRYPTION_KEYS` is set it takes over from `BANKING_TOKEN_ENCRYPTION_KEY`. Keep `BANKING_TOKEN_ENCRYPTION_KEY` set too, because backend config validation still checks it.
- The version is the key id. It is written in clear at the start of every stored value (`v2:...`), so a value always says which key made it, and decryption picks that key from the list. A value whose version is not in the list fails to decrypt, and the connection is marked as needing the user to reconnect.
- The secret is not used as the AES key directly. The AES-256 key is the SHA-256 of the secret, so any secret of 32 or more characters gives a 32-byte key. Generate it as in step 1 below, so the secret itself carries 32 random bytes.
- Tax receipts use the same scheme with their own variables, `RECEIPT_ENCRYPTION_KEY` and `RECEIPT_ENCRYPTION_KEYS`. The list works the same way, but nothing re-encrypts a receipt on its own: a stored receipt stays under the key that wrote it until a new receipt is uploaded for that record. Editing the record without a new receipt keeps the stored value as it is. So never drop an old receipt key while `tax_records.receipt_data` still holds a value under its version (count rows where `receipt_data IS NOT NULL AND receipt_data NOT LIKE 'v<active>:%'`). A receipt whose key has gone does not fail loudly: it answers 404 "Receipt not found".

## Development keys

`@flump/banking` has committed development keys for bank tokens and receipts. They are used only when the variable is unset, `NODE_ENV` is exactly `development` or `test`, and `RAILWAY_ENVIRONMENT` is unset. Any other `NODE_ENV`, or no `NODE_ENV` at all, needs a real key, and so does every Railway service whatever its `NODE_ENV`. Production boot also refuses to start without `BANKING_TOKEN_ENCRYPTION_KEY` and `RECEIPT_ENCRYPTION_KEY` (or its list). Never run a server that holds real tokens with `NODE_ENV=development` or `test`: a self-hosted server (not on Railway) with `NODE_ENV=test` and no key set would silently use the committed development key.

## Rotate to a new key

1. Generate a new secret on a trusted machine:

   ```sh
   openssl rand -hex 32
   ```

   At boot the backend logs one warning for each configured banking key that is not in this form (64 hex characters, or base64 of 32 bytes). The warning names the variable and the key version only. Such a key still works, and boot never stops because of it; the warning is the prompt to rotate to a generated key with these steps.

2. In the hosting provider's variables for the backend, set the list with the new key first and the current key second. If you have never set the list before, the current key is the value of `BANKING_TOKEN_ENCRYPTION_KEY` and is version 1:

   ```sh
   BANKING_TOKEN_ENCRYPTION_KEYS="2:<new-secret>,1:<old-secret>"
   ```

   Use the next unused version number each time (3, then 4, and so on). Never reuse a version number for a different secret.

3. Deploy the backend. New values are written with version 2 straight away.
4. Existing values re-encrypt lazily. Each time a connection syncs, the backend decrypts its tokens with whichever key wrote them and, if that was not the active key, writes them back under the active key.

## Check progress

Count the rows that still hold a value under an older key:

```sql
SELECT count(*)
FROM bank_connections
WHERE (access_token IS NOT NULL AND access_token NOT LIKE 'v2:%')
   OR (refresh_token IS NOT NULL AND refresh_token NOT LIKE 'v2:%');
```

Replace `v2` with the active version. Connections that never sync (disconnected, in error, or belonging to inactive users) will not move on their own.

## Drop the old key

It is safe to remove the old entry from `BANKING_TOKEN_ENCRYPTION_KEYS` only when the count above is 0. Any row still under the old key will fail to decrypt once the key is gone, and that connection will need the user to reconnect.

If a few rows remain and will not sync, either leave the old key in place for longer or clear those tokens and mark the connections for reconnection, then drop the key.

Once only one key is left, keep the list (`"2:<new-secret>"`). Do not move a secret of version 2 or later into `BANKING_TOKEN_ENCRYPTION_KEY` alone: without the list, that variable is always read as version 1, so every `v2:` value would stop decrypting.

## If a key leaks

Treat every token encrypted with that key as exposed.

1. Rotate straight away as above, with the leaked key as the old entry, so new writes stop using it.
2. Do not wait for lazy re-encryption. Re-encrypting does not help, because anyone holding the leaked key may already have decrypted the old values. For every row still on the leaked version, clear the tokens and force the user to reconnect, and revoke access at the provider where that is supported.
3. Drop the leaked key as soon as no row needs it, then record the incident.
