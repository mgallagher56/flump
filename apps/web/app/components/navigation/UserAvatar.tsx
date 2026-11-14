import { css, cx } from "@repo/ui/styled-system/css";
import { useAtomValue } from "jotai";
import { type FC, useEffect, useState } from "react";
import { type UserProfile, userProfileAtom } from "~/hooks/useUserProfile";
import { resolveUserInitials } from "~/utils/avatar";

export interface UserAvatarProps {
  user?: any;
  profile?: Partial<UserProfile> | null;
  size?: number;
  className?: string;
  alt?: string;
  bordered?: boolean;
}

export const UserAvatar: FC<UserAvatarProps> = ({
  user,
  profile: propProfile,
  size = 28,
  className,
  alt,
  bordered = false,
}) => {
  const atomProfile = useAtomValue(userProfileAtom);
  const effectiveProfile = propProfile !== undefined ? propProfile : atomProfile;

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

  const fontSize = Math.max(10, Math.round(size * 0.4));

  const rootStyle = css({
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
  });

  const borderedStyle = css({
    boxShadow: "0 0 0 2px token(colors.border)",
  });

  const imageStyle = css({
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "inherit",
  });

  const fallbackStyle = css({
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
  });

  const hasImage = Boolean(avatarUrl && !imageError);

  return (
    <span
      className={cx(rootStyle, bordered && borderedStyle, className)}
      data-testid="user-avatar"
      id="user-avatar"
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
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
          className={fallbackStyle}
          data-testid="user-avatar-fallback"
          id="user-avatar-fallback"
          style={{ fontSize: `${fontSize}px` }}
        >
          {initials}
        </span>
      )}
    </span>
  );
};

export default UserAvatar;
