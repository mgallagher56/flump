import { redirect } from "react-router";

/**
 * Self Assessment moved to `/app/self-assessment` (IA review T-IA-7). Old links and bookmarks land
 * on the new page. Receipt files keep their `/app/tax/receipts/:id` path, which is not a page.
 */
export const loader = () => redirect("/app/self-assessment", 301);
