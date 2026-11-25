import { render } from "@testing-library/react-native";
import { View } from "react-native";
import { ApiProvider } from "./ApiProvider";
import { createQueryClient } from "./queryClient";
import { queryKeys } from "./queryKeys";

describe("ApiProvider", () => {
  it("drops every cached answer once nobody is signed in", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(queryKeys.accounts(), [{ name: "Current account" }]);
    const ui = (signedIn: boolean) => (
      <ApiProvider client={null} queryClient={queryClient} signedIn={signedIn}>
        <View />
      </ApiProvider>
    );
    const view = await render(ui(true));
    expect(queryClient.getQueryData(queryKeys.accounts())).toEqual([{ name: "Current account" }]);
    await view.rerender(ui(false));
    expect(queryClient.getQueryData(queryKeys.accounts())).toBeUndefined();
  });
});
