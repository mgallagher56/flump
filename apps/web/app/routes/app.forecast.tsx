import { redirect } from "react-router";

/**
 * The standalone Forecast page was merged into Savings (E16 F21, D5-B): the growth forecaster and
 * the take-home calculator are tabs there. Old links and bookmarks land on the Savings forecaster.
 */
export const loader = () => redirect("/app/savings#forecast", 301);
