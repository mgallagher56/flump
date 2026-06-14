import { data, type LoaderFunctionArgs } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import { getAuthSession } from "~/utils/utils";

export const loader = async (args: LoaderFunctionArgs) => {
  const { user } = await getAuthSession(args, {
    ensureSignedIn: true,
  });
  return data({ ok: true, user });
};

const App = () => {
  return <FLPHeading>Dashboard</FLPHeading>;
};
export default App;
