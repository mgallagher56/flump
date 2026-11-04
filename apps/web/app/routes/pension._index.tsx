import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";

export const loader = async (_args: LoaderFunctionArgs) => {
  return redirect("/app/pension");
};

export default function PensionIndex() {
  return null;
}
