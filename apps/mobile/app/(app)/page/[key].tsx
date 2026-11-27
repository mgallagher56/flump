import { Redirect, router, Stack, useLocalSearchParams } from "expo-router";
import { findMorePage } from "../../../src/navigation/navItems";
import { ComingSoon } from "../../../src/screens/ComingSoon";
import { PageNotFound } from "../../../src/screens/PageNotFound";

/**
 * A page from the More list, also opened by `flump://page/<key>` (E12 S4). Until its own slice it
 * links to the same page on the website. Settings is the app's own list (E12 S9). An unknown key
 * gets one way back, to More.
 */
export default function MorePageRoute() {
  const { key } = useLocalSearchParams<{ key: string }>();
  if (key === "settings") return <Redirect href="/settings" />;
  const page = findMorePage(key ?? "");
  return (
    <>
      <Stack.Screen options={{ title: page?.label ?? "" }} />
      {page ? (
        <ComingSoon pageKey={page.key} label={page.label} webRoute={page.webRoute} />
      ) : (
        <PageNotFound way="more" onGo={() => router.navigate("/more")} />
      )}
    </>
  );
}
