import { redirect } from "react-router";

export const loader = async () => {
  return redirect("/app/accounts?tab=savings-yield");
};

export default function SavingsRedirectRoute() {
  return null;
}
