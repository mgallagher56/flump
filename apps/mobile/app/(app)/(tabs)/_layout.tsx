import { Tabs } from "expo-router";
import { AppHeader } from "../../../src/components/AppHeader";
import { TabBar } from "../../../src/components/TabBar";
import { TABS } from "../../../src/navigation/navItems";
import { useTheme } from "../../../src/theme/ThemeProvider";

const MORE_ROUTE = "more";

/**
 * The tab bar (E12 S4, plan 9.7): web's bottom bar tabs plus More, drawn by our own `TabBar` so
 * its roles, targets and large-text layout are ours and tested. Each tab's header has the menu
 * button that opens More, as web's phone top bar.
 */
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={({ navigation, route }) => ({
        sceneStyle: { backgroundColor: theme.colors["surface.canvas"] },
        header: ({ options }) => (
          <AppHeader
            title={options.title ?? ""}
            onOpenMenu={
              route.name === MORE_ROUTE ? undefined : () => navigation.navigate(MORE_ROUTE)
            }
          />
        ),
      })}
      tabBar={({ state, navigateToTab }) => (
        <TabBar
          items={TABS}
          activeKey={
            TABS.find((tab) => tab.routeName === state.routes[state.index]?.name)?.key ?? ""
          }
          onSelect={(key) => {
            const name = TABS.find((t) => t.key === key)?.routeName;
            const route = state.routes.find((r) => r.name === name);
            if (route) navigateToTab(route.key);
          }}
        />
      )}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.key} name={tab.routeName} options={{ title: tab.label }} />
      ))}
    </Tabs>
  );
}
