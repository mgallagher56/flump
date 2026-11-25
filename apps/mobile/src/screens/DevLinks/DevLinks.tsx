import { Link } from "expo-router";
import { Button } from "../../components/Button";

/** The development-only screens. Expo strips `__DEV__` branches from a production export. */
export function DevLinks() {
  return __DEV__ ? (
    <>
      <Link href="/engine-check" asChild>
        <Button variant="link" accessibilityRole="link" label="Device check" />
      </Link>
      <Link href="/gallery" asChild>
        <Button variant="link" accessibilityRole="link" label="Component gallery" />
      </Link>
      <Link href="/sign-in-check" asChild>
        <Button variant="link" accessibilityRole="link" label="Sign-in check" />
      </Link>
    </>
  ) : null;
}
