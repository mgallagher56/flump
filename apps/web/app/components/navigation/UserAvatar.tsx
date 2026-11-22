import { css, cva, cx } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useState } from "react";
import { type UserProfile, useSavedProfile } from "~/hooks/useUserProfile";
import { resolveUserInitials } from "~/utils/avatar";

interface UserAvatarProps {
  user?: any;
  profile?: Partial<UserProfile> | null;
  size?: number;
  className?: string;
  alt?: string;
  bordered?: boolean;
}

function resolveSizeVariant(size: number): "sm" | "md" | "lg" | "xl" {
  if (size >= 64) return "xl";
  if (size >= 36) return "lg";
  if (size >= 30) return "md";
  return "sm";
}

const avatarRoot = cva({
  base: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    verticalAlign: "middle",
    overflow: "hidden",
    userSelect: "none",
    borderRadius: "full",
    flexShrink: 0,
    backgroundColor: "surface.sunken",
  },
  variants: {
    size: {
      sm: { width: "26px", height: "26px" },
      md: { width: "32px", height: "32px" },
      lg: { width: "40px", height: "40px" },
      xl: { width: "72px", height: "72px" },
    },
    bordered: {
      true: { boxShadow: "0 0 0 2px token(colors.border)" },
      false: {},
    },
  },
  defaultVariants: {
    size: "sm",
    bordered: false,
  },
});

const avatarFallback = cva({
  base: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // Semantic fill (P9), not a hard-coded indigo gradient.
    backgroundColor: "primary.solid",
    color: "primary.foreground",
    fontWeight: "semibold",
    textTransform: "uppercase",
    letterSpacing: "0.02em",
    lineHeight: 1,
  },
  variants: {
    size: {
      sm: { fontSize: "xs" },
      md: { fontSize: "xs" },
      lg: { fontSize: "md" },
      xl: { fontSize: "2xl" },
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

const imageStyle = css({
  width: "100%",
  height: "100%",
  objectFit: "cover",
  borderRadius: "inherit",
});

const UserAvatar: FC<UserAvatarProps> = ({
  user,
  profile: propProfile,
  size = 28,
  className,
  alt,
  bordered = false,
}) => {
  const savedProfile = useSavedProfile();
  const effectiveProfile = propProfile !== undefined ? propProfile : savedProfile;

  const initials = resolveUserInitials({
    firstName: effectiveProfile?.firstName,
    lastName: effectiveProfile?.lastName,
    user,
  });

  const avatarUrl =
    effectiveProfile?.avatarUrl ||
    user?.profilePictureUrl ||
    user?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    null;

  const [imageError, setImageError] = useState(false);

  // Reset image error if avatarUrl changes
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const sizeVariant = resolveSizeVariant(size);
  const hasImage = Boolean(avatarUrl && !imageError);

  return (
    <span
      className={cx(avatarRoot({ size: sizeVariant, bordered }), className)}
      data-testid="user-avatar"
      id="user-avatar"
    >
      {hasImage ? (
        <img
          alt={
            alt ||
            [effectiveProfile?.firstName, effectiveProfile?.lastName].filter(Boolean).join(" ") ||
            user?.name ||
            user?.email ||
            "User Avatar"
          }
          className={imageStyle}
          data-testid="user-avatar-image"
          id="user-avatar-image"
          src={avatarUrl as string}
          onError={() => setImageError(true)}
        />
      ) : (
        <span
          className={avatarFallback({ size: sizeVariant })}
          data-testid="user-avatar-fallback"
          id="user-avatar-fallback"
        >
          {initials}
        </span>
      )}
    </span>
  );
};

export default UserAvatar;
