# Bank token key rotation

Bank access and refresh tokens in `bank_connections` are encrypted with AES-256-GCM by `@flump/banking` (`packages/banking/src/server/crypto.ts`). Each stored value carries the version of the key that wrote it, in the form `v<version>:<iv>:<tag>:<ciphertext>`. Values written before versioning have no prefix (`<iv>:<tag>:<ciphertext>`); these legacy values are always read with the version 1 key.

## How keys are configured

- `BANKING_TOKEN_ENCRYPTION_KEY` is the single key. When it is the only variable set, it is key version 1.
- `BANKING_TOKEN_ENCRYPTION_KEYS` is an optional comma-separated list of `<version>:<secret>` entries. The first entry is the active key, which encrypts every new value. Every listed key can still decrypt.
- Versions are positive whole numbers and must be unique. Outside development and test, every secret must be at least 32 characters. A malformed list stops the backend at boot, and the error names the variable but never the key.
- While `BANKING_TOKEN_ENCRYPTION_KEYS` is set it takes over from `BANKING_TOKEN_ENCRYPTION_KEY`. Keep `BANKING_TOKEN_ENCRYPTION_KEY` set too, because backend config validation still checks it.

## Rotate to a new key

1. Generate a new secret on a trusted machine:

   ```sh
   openssl rand -hex 32
   ```

2. In the hosting provider's variables for the backend, set the list with the new key first and the current key second. If you have never set the list before, the current key is the value of `BANKING_TOKEN_ENCRYPTION_KEY` and is version 1:

   ```sh
   BANKING_TOKEN_ENCRYPTION_KEYS="2:<new-secret>,1:<old-secret>"
   ```

   Use the next unused version number each time (3, then 4, and so on). Never reuse a version number for a different secret.

3. Deploy the backend. New values are written with version 2 straight away.
4. Existing values re-encrypt lazily. Each time a connection syncs, the backend decrypts its tokens with whichever key wrote them and, if that was not the active key (or the value is legacy), writes them back under the active key.

## Check progress

Count the rows that still hold a value under an older key or in the legacy format:

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

Once only one key is left you can keep the list (`"2:<new-secret>"`) or move the new secret into `BANKING_TOKEN_ENCRYPTION_KEY`. Do not move it there while any legacy unprefixed values remain, because legacy values are read with version 1 only.

## If a key leaks

Treat every token encrypted with that key as exposed.

1. Rotate straight away as above, with the leaked key as the old entry, so new writes stop using it.
2. Do not wait for lazy re-encryption. Re-encrypting does not help, because anyone holding the leaked key may already have decrypted the old values. For every row still on the leaked version, clear the tokens and force the user to reconnect, and revoke access at the provider where that is supported.
3. Drop the leaked key as soon as no row needs it, then record the incident.

Legacy unprefixed values are version 1, so a leak of the version 1 key covers them too.
