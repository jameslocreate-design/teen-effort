import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listUpcomingDates from "./tools/list-upcoming-dates";
import listSavedDateIdeas from "./tools/list-saved-date-ideas";
import listBucketList from "./tools/list-bucket-list";
import addBucketListItem from "./tools/add-bucket-list-item";

// Build the OAuth issuer from the project ref (inlined by Vite at build time).
// SUPABASE_URL is the .lovable.cloud proxy at runtime and would fail issuer validation.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "midnight-and-rose-mcp",
  title: "Midnight & Rose",
  version: "0.1.0",
  instructions:
    "Tools for the Midnight & Rose date-planning app. Use these to read the signed-in user's upcoming planned dates, saved date ideas, and shared couple bucket list, or to add a new bucket list item. All tools act as the authenticated user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listUpcomingDates, listSavedDateIdeas, listBucketList, addBucketListItem],
});
