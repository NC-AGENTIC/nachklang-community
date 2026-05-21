import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

// Link / useRouter / usePathname read the active locale from the next-intl
// context, so they prefix internal hrefs automatically. We intentionally do NOT
// re-export next-intl's `redirect`: it requires an explicit locale and is also
// called from API routes that have no locale context. Server redirects use the
// plain `next/navigation` redirect and rely on the proxy middleware to add the
// locale prefix (it persists the choice in the NEXT_LOCALE cookie).
export const { Link, usePathname, useRouter, getPathname } = createNavigation(routing);
