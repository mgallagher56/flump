import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async (_args: LoaderFunctionArgs) => {
  return redirect("/sandbox");
};

export default function AppSandboxRoute() {
  return null;
}
