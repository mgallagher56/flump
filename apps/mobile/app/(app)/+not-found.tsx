import { router, Stack } from "expo-router";
import { PageNotFound } from "../../src/screens/PageNotFound";

/**
 * Any path the app does not know (`flump://nope`), cold or warm. It sits inside the signed-in group,
 * so the session gate and terms screen come first and the theme is the app's, and it replaces Expo
 * Router's own unmatched-route page, which listed every route through its Sitemap link. One way
 * back: Home.
 */
export default function NotFoundRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "" }} />
      <PageNotFound way="home" onGo={() => router.navigate("/")} />
    </>
  );
}
