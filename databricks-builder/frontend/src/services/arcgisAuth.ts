export interface ArcgisSession {
  token: string;
  userName: string;
}

function sharingRestUrl(portalUrl: string) {
  const portal = portalUrl.replace(/\/$/, "");
  if (portal.endsWith("/sharing/rest")) return portal;
  if (portal.endsWith("/sharing")) return `${portal}/rest`;
  return `${portal}/sharing/rest`;
}

function parseHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return {
    accessToken: params.get("access_token") ?? "",
    error: params.get("error") ?? "",
    errorDescription: params.get("error_description") ?? "",
    state: params.get("state") ?? "",
    userName: params.get("username") ?? params.get("user") ?? "ArcGIS user"
  };
}

export async function signIn(portalUrl: string, appId: string): Promise<ArcgisSession> {
  const redirectUri = `${window.location.origin}/oauth-callback.html`;
  const state = crypto.randomUUID();
  const authorizeUrl = new URL(`${sharingRestUrl(portalUrl)}/oauth2/authorize`);

  authorizeUrl.search = new URLSearchParams({
    client_id: appId,
    response_type: "token",
    expiration: "20160",
    redirect_uri: redirectUri,
    state
  }).toString();

  return new Promise((resolve, reject) => {
    const popup = window.open(
      authorizeUrl.toString(),
      "arcgis-oauth",
      "height=600,width=700,menubar=no,location=yes,resizable=yes,scrollbars=yes,status=yes"
    );

    if (!popup) {
      reject(new Error("The ArcGIS sign-in popup was blocked by the browser."));
      return;
    }

    const cleanup = () => {
      window.removeEventListener("arcgis:auth:hash", handleHash as EventListener);
      window.clearInterval(closedTimer);
    };

    const closedTimer = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("ArcGIS sign-in was closed before authentication completed."));
      }
    }, 700);

    const handleHash = (event: CustomEvent<string>) => {
      const result = parseHash(event.detail);
      cleanup();

      if (result.state !== state) {
        reject(new Error("ArcGIS sign-in returned an invalid state."));
        return;
      }

      if (result.error) {
        reject(new Error(result.errorDescription || result.error));
        return;
      }

      if (!result.accessToken) {
        reject(new Error("ArcGIS sign-in did not return an access token."));
        return;
      }

      resolve({
        token: result.accessToken,
        userName: result.userName
      });
    };

    window.addEventListener("arcgis:auth:hash", handleHash as EventListener, { once: true });
  });
}
