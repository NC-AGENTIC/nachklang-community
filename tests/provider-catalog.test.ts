import { describe, expect, it } from "vitest";

import {
  getProviderById,
  getProviderCatalogSearchIndex,
  PROVIDER_CATALOG,
  searchProviderCatalog,
} from "../src/features/vault/domain/vault-entry";

describe("D-A-CH provider catalog", () => {
  it("ships a broad actively selectable provider catalog", () => {
    expect(PROVIDER_CATALOG.length).toBeGreaterThanOrEqual(250);
    expect(new Set(PROVIDER_CATALOG.map((provider) => provider.id)).size).toBe(PROVIDER_CATALOG.length);
  });

  it("keeps provider defaults safe for vault entry creation", () => {
    for (const provider of PROVIDER_CATALOG) {
      expect(provider.loginUrl).toMatch(/^https:\/\//);
      expect(provider.name.trim()).toBe(provider.name);
      expect(provider.category).toBeTruthy();
    }
  });

  it("uses a stable module-level search cache for performant client filtering", () => {
    expect(getProviderCatalogSearchIndex()).toBe(getProviderCatalogSearchIndex());
    expect(searchProviderCatalog("krankenkasse", 8).map((provider) => provider.name)).toContain("Techniker Krankenkasse");
    expect(searchProviderCatalog("swissid", 5)[0]?.id).toBe("swissid");
  });

  it("includes major B2B consoles and accounting services", () => {
    expect(searchProviderCatalog("aws console", 5)[0]?.id).toBe("aws-console");
    expect(searchProviderCatalog("azure console", 5)[0]?.id).toBe("azure-portal");
    expect(searchProviderCatalog("sevdesk", 5)[0]?.id).toBe("sevdesk");
    expect(searchProviderCatalog("datev", 5)[0]?.id).toBe("datev");
  });

  it("includes major email providers for D-A-CH users", () => {
    expect(searchProviderCatalog("gmail", 5)[0]?.id).toBe("gmail");
    expect(searchProviderCatalog("web.de", 5)[0]?.id).toBe("web-de-mail");
    expect(searchProviderCatalog("gmx", 5)[0]?.id).toBe("gmx-mail");
    expect(searchProviderCatalog("m365 mail", 5)[0]?.id).toBe("microsoft-365");
  });

  it("supports direct lookup for prefilling forms", () => {
    expect(getProviderById("elster")?.loginUrl).toBe("https://www.elster.de/eportal/login");
    expect(getProviderById("postfinance")?.countryHint).toBe("CH");
    expect(getProviderById("aws-console")?.loginUrl).toBe("https://console.aws.amazon.com/console/home");
  });
});
