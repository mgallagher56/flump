/**
 * Helper to derive initials from a name or email string.
 * Examples:
 * - "Marc Gallagher" -> "MG"
 * - "Marc" -> "MA"
 * - "m" -> "M"
 * - "mgrdevuk@gmail.com" -> "MG"
 * - "test.user@example.com" -> "TU"
 */
export function getUserInitials(nameOrEmail?: string | null): string {
  if (!nameOrEmail) return "U";
  const trimmed = nameOrEmail.trim();
  if (!trimmed) return "U";

  // If email address, strip the domain
  const text = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
  // Split on whitespace or common separators (._-)
  const parts = text.split(/[\s._-]+/).filter(Boolean);

  if (parts.length >= 2) {
    const first = parts[0][0];
    const last = parts[parts.length - 1][0];
    return `${first}${last}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].slice(0, Math.min(2, parts[0].length)).toUpperCase();
  }
  return "U";
}

/**
 * Resolves user initials by checking display name, firstName/lastName, full name, and email in priority order.
 */
export function resolveUserInitials(options: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email?: string | null;
    user_metadata?: {
      full_name?: string | null;
      name?: string | null;
      first_name?: string | null;
      last_name?: string | null;
    };
  } | null;
}): string {
  const { displayName, firstName: optFirst, lastName: optLast, user } = options;

  if (displayName?.trim()) {
    return getUserInitials(displayName);
  }

  const explicitFirst = optFirst?.trim();
  const explicitLast = optLast?.trim();
  if (explicitFirst || explicitLast) {
    if (explicitFirst && explicitLast) {
      return `${explicitFirst[0]}${explicitLast[0]}`.toUpperCase();
    }
    if (explicitFirst) return getUserInitials(explicitFirst);
    if (explicitLast) return getUserInitials(explicitLast);
  }

  if (user) {
    const firstName = user.firstName || user.user_metadata?.first_name;
    const lastName = user.lastName || user.user_metadata?.last_name;

    if (firstName || lastName) {
      const f = (firstName || "").trim();
      const l = (lastName || "").trim();
      if (f && l) {
        return `${f[0]}${l[0]}`.toUpperCase();
      }
      if (f) return getUserInitials(f);
      if (l) return getUserInitials(l);
    }

    const name = user.name || user.user_metadata?.full_name || user.user_metadata?.name;
    if (name?.trim()) {
      return getUserInitials(name);
    }

    if (user.email?.trim()) {
      return getUserInitials(user.email);
    }
  }

  return "U";
}

/**
 * Validates and scales/compresses an uploaded image file client-side.
 * Converts to a base64 Data URL for preview and persistent storage.
 */
export function processImageFile(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      return reject(new Error("Selected file must be an image."));
    }

    // Limit raw upload size before processing (5MB)
    const MAX_FILE_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_BYTES) {
      return reject(new Error("Image size must be less than 5MB."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const result = reader.result as string;

      // In non-DOM or test environment fallback gracefully to raw data URL
      if (
        typeof window === "undefined" ||
        typeof document === "undefined" ||
        typeof Image === "undefined"
      ) {
        return resolve(result);
      }

      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = Math.round((height * maxSize) / width);
              width = maxSize;
            } else {
              width = Math.round((width * maxSize) / height);
              height = maxSize;
            }
          }

          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(result);

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const isPng = file.type === "image/png";
          const dataUrl = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.85);
          resolve(dataUrl);
        } catch {
          resolve(result);
        }
      };
      img.src = result;
    };

    reader.readAsDataURL(file);
  });
}
