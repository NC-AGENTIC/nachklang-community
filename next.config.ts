import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

import { securityHeaders } from "./src/server/security/headers";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders(
          process.env.NODE_ENV === "production" ? "production" : "development",
          { includeContentSecurityPolicy: false },
        ),
      },
    ];
  },
};

export default withNextIntl(nextConfig);
