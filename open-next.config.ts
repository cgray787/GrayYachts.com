import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig({}),
  // Use the webpack build verified with the Cloudflare adapter.
  buildCommand: "npx next build --webpack",
};
