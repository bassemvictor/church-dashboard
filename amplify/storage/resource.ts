import { defineStorage } from "@aws-amplify/backend";

import { shepherdHubApi } from "../functions/shepherd-hub-api/resource.js";

export const storage = defineStorage({
  name: "churchdashboardassets",
  isDefault: true,
  access: (allow) => ({
    "public/expenses/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read"]),
      allow.groups(["admin"]).to(["read", "write", "delete"]),
      allow.resource(shepherdHubApi).to(["read"]),
    ],
  }),
});
