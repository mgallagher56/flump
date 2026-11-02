import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async (_args: LoaderFunctionArgs) => {
  return redirect("/app/accounts");
};

const Accounts = () => {
  return null;
};
export default Accounts;
