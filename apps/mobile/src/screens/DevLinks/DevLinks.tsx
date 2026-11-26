import { Link } from "expo-router";
import { Button } from "../../components/Button";

/** The development-only screens. Expo strips `__DEV__` branches from a production export. */
export function DevLinks() {
  return __DEV__ ? (
    <>
      <Link href="/engine-check" asChild>
        <Button
          variant="link"
          accessibilityRole="link"
          label="Device check"
          testID="dev-link-engine-check"
        />
      </Link>
      <Link href="/gallery" asChild>
        <Button
          variant="link"
          accessibilityRole="link"
          label="Component gallery"
          testID="dev-link-gallery"
        />
      </Link>
      <Link href="/sign-in-check" asChild>
        <Button
          variant="link"
          accessibilityRole="link"
          label="Sign-in check"
          testID="dev-link-sign-in-check"
        />
      </Link>
    </>
  ) : null;
}
