import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  auth: false,
  preview: {
    realtime: {
      allowedOrigins: ["https://neon-slop-fork.vercel.app", "http://localhost:3030"],
    },
  },
});
