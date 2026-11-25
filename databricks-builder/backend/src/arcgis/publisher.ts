import type { PortalFolder, PublishResult, ServiceConfiguration } from "@databricks-spatial-service-builder/shared";
import { env } from "../config/env.js";
import { buildServiceParameters } from "./serviceParameters.js";

interface PublishRequest {
  config: ServiceConfiguration;
  portalToken: string;
  portalUrl?: string;
}

function normalizeServiceName(serviceName: string) {
  return serviceName.trim().replace(/^databricks_/i, "");
}

function buildServiceRestUrl(serviceName: string) {
  if (!env.ARCGIS_SERVER_ADMIN_URL) return undefined;

  const adminUrl = env.ARCGIS_SERVER_ADMIN_URL.replace(/\/$/, "");
  const restRoot = /\/admin$/i.test(adminUrl)
    ? adminUrl.replace(/\/admin$/i, "/rest")
    : `${adminUrl}/rest`;

  return `${restRoot}/services/${encodeURIComponent(serviceName)}/FeatureServer`;
}

function buildCustomDataServiceJson(config: ServiceConfiguration, serviceParameters: Record<string, string | undefined>) {
  return {
    serviceName: normalizeServiceName(config.serviceName),
    type: "FeatureServer",
    description: "",
    capabilities: config.editable ? "Query,Editing" : "Query",
    provider: "CUSTOMDATA",
    clusterName: "default",
    minInstancesPerNode: 0,
    maxInstancesPerNode: 0,
    instancesPerContainer: 1,
    maxWaitTime: 60,
    maxStartupTime: 300,
    maxIdleTime: 1800,
    maxUsageTime: 600,
    loadBalancing: "ROUND_ROBIN",
    isolationLevel: "HIGH",
    configuredState: "STARTED",
    recycleInterval: 24,
    recycleStartTime: "00:00",
    keepAliveInterval: 1800,
    private: false,
    isDefault: false,
    maxUploadFileSize: 0,
    allowedUploadFileTypes: "",
    properties: {
      disableCaching: "true"
    },
    jsonProperties: {
      customDataProviderInfo: {
        dataProviderName: env.CDF_PROVIDER_NAME,
        forwardUserIdentity: false,
        serviceParameters
      },
      customDataServiceInfo: {
        cache: {
          expiration: 0,
          enabled: false
        }
      }
    },
    extensions: [],
    frameworkProperties: {},
    datasets: []
  };
}

function portalSharingRestUrl(portalUrl = env.PORTAL_URL) {
  const portalBase = portalUrl.replace(/\/$/, "");
  if (portalBase.endsWith("/sharing/rest")) return portalBase;
  if (portalBase.endsWith("/sharing")) return `${portalBase}/rest`;
  return `${portalBase}/sharing/rest`;
}

async function getPortalSelf(portalToken: string, portalUrl?: string) {
  const body = new URLSearchParams({
    f: "json",
    token: portalToken
  });
  const response = await fetch(`${portalSharingRestUrl(portalUrl)}/community/self`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const result = (await response.json()) as {
    username?: string;
    folders?: PortalFolder[];
    error?: { message?: string; details?: string[] };
  };

  if (!response.ok || result.error) {
    const details = result.error?.details?.length ? ` ${result.error.details.join(" ")}` : "";
    throw new Error(`${result.error?.message ?? "Could not read Portal user folders."}${details}`);
  }

  return result;
}

export async function listPortalFolders(portalToken: string, portalUrl?: string): Promise<PortalFolder[]> {
  const self = await getPortalSelf(portalToken, portalUrl);
  if (!self.username) {
    throw new Error("Could not read Portal folders because the signed-in username was not returned.");
  }

  const body = new URLSearchParams({
    f: "json",
    token: portalToken
  });
  const response = await fetch(`${portalSharingRestUrl(portalUrl)}/content/users/${encodeURIComponent(self.username)}`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const result = (await response.json()) as {
    folders?: PortalFolder[];
    error?: { message?: string; details?: string[] };
  };

  if (!response.ok || result.error) {
    const details = result.error?.details?.length ? ` ${result.error.details.join(" ")}` : "";
    throw new Error(`${result.error?.message ?? "Could not read Portal user folders."}${details}`);
  }

  return (result.folders ?? []).map((folder) => ({
    id: folder.id,
    title: folder.title
  }));
}

async function movePortalItemToFolder(itemId: string, folderId: string, portalToken: string, portalUrl?: string) {
  const self = await getPortalSelf(portalToken, portalUrl);
  if (!self.username) {
    throw new Error("Could not move Portal item because the signed-in username was not returned.");
  }

  const body = new URLSearchParams({
    f: "json",
    token: portalToken,
    folder: folderId
  });
  const response = await fetch(`${portalSharingRestUrl(portalUrl)}/content/users/${encodeURIComponent(self.username)}/items/${encodeURIComponent(itemId)}/move`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });
  const result = (await response.json()) as {
    success?: boolean;
    error?: { message?: string; details?: string[] };
  };

  if (!response.ok || result.error || result.success === false) {
    const details = result.error?.details?.length ? ` ${result.error.details.join(" ")}` : "";
    throw new Error(`${result.error?.message ?? "Could not move Portal item to the selected folder."}${details}`);
  }
}

export async function publishCdfService({ config, portalToken, portalUrl }: PublishRequest): Promise<PublishResult> {
  if (!env.ARCGIS_SERVER_ADMIN_URL) {
    return {
      ok: false,
      errors: ["ARCGIS_SERVER_ADMIN_URL is not configured."],
      warnings: []
    };
  }

  const serviceParameters = buildServiceParameters(config);
  const service = buildCustomDataServiceJson(config, serviceParameters);
  const body = new URLSearchParams({
    f: "json",
    token: portalToken,
    service: JSON.stringify(service)
  });

  const response = await fetch(`${env.ARCGIS_SERVER_ADMIN_URL.replace(/\/$/, "")}/services/createService`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  const result = (await response.json()) as {
    status?: string;
    itemId?: string;
    serviceUrl?: string;
    messages?: string[];
    error?: { message?: string; details?: string[] };
  };

  if (!response.ok || result.error || result.status === "error") {
    const errors = [
      result.error?.message,
      ...(result.error?.details ?? []),
      ...(!result.error && result.status ? [`ArcGIS service creation returned status: ${result.status}.`] : [])
    ].filter((message): message is string => Boolean(message));

    return {
      ok: false,
      errors: errors.length ? errors : ["ArcGIS service creation failed."],
      warnings: result.messages ?? []
    };
  }

  const warnings = [...(result.messages ?? [])];
  if (result.itemId && config.folderId) {
    try {
      await movePortalItemToFolder(result.itemId, config.folderId, portalToken, portalUrl);
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Could not move Portal item to the selected folder.");
    }
  }

  const portalBase = (portalUrl || env.PORTAL_URL).replace(/\/$/, "");
  const serviceName = normalizeServiceName(config.serviceName);
  const restUrl = result.serviceUrl ?? buildServiceRestUrl(serviceName);
  const itemUrl = result.itemId ? `${portalBase}/home/item.html?id=${result.itemId}` : undefined;
  return {
    ok: true,
    itemId: result.itemId,
    itemUrl,
    mapViewerUrl: result.itemId ? `${portalBase}/apps/mapviewer/index.html?layers=${result.itemId}` : undefined,
    restUrl,
    errors: [],
    warnings
  };
}
