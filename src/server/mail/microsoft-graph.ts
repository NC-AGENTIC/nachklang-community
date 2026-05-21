import type { MailMessage, MailTransport } from "./types";

export const GRAPH_SENDMAIL_SCOPE = "https://graph.microsoft.com/.default";
const GRAPH_CLIENT_ASSERTION_TYPE = "urn:ietf:params:oauth:client-assertion-type:jwt-bearer";

type GraphEmailAddress = {
  emailAddress: {
    address: string;
    name?: string;
  };
};

export type GraphSendMailInput = {
  to: string;
  subject: string;
  html: string;
};

export type GraphSendMailRequest = {
  endpoint: string;
  payload: {
    message: {
      subject: string;
      body: {
        contentType: "HTML";
        content: string;
      };
      toRecipients: GraphEmailAddress[];
      replyTo: GraphEmailAddress[];
      internetMessageHeaders: Array<{
        name: string;
        value: string;
      }>;
    };
    saveToSentItems: false;
  };
};

export type GraphTokenRequestInput = {
  clientId: string;
  clientSecret?: string;
  clientAssertion?: string;
  authMode: "certificate" | "client-secret";
};

export function buildGraphSendMailRequest(input: GraphSendMailInput): GraphSendMailRequest {
  const mailboxUpn = requiredEnv("GRAPH_MAILBOX_UPN");
  const visibleEmail = requiredEnv("NACHKLANG_VISIBLE_EMAIL");
  return {
    endpoint: `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailboxUpn)}/sendMail`,
    payload: {
      message: {
        subject: input.subject,
        body: {
          contentType: "HTML",
          content: input.html,
        },
        toRecipients: [
          {
            emailAddress: {
              address: input.to,
            },
          },
        ],
        replyTo: [
          {
            emailAddress: {
              address: visibleEmail,
              name: "NachKlang Sicherheit",
            },
          },
        ],
        internetMessageHeaders: [
          {
            name: "x-nachklang-mailbox-upn",
            value: mailboxUpn,
          },
        ],
      },
      saveToSentItems: false,
    },
  };
}

export async function sendGraphMail(accessToken: string, input: GraphSendMailInput, fetchImpl = fetch): Promise<void> {
  const request = buildGraphSendMailRequest(input);
  const response = await fetchImpl(request.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request.payload),
  });

  if (!response.ok) {
    // MAIL_SEND_FAILED — Microsoft Graph returned non-2xx for sendMail
    console.error("Microsoft Graph sendMail failed", { status: response.status });
    throw new Error("MAIL_SEND_FAILED");
  }
}

export function buildGraphTokenRequestBody(input: GraphTokenRequestInput): URLSearchParams {
  const body = new URLSearchParams({
    client_id: input.clientId,
    grant_type: "client_credentials",
    scope: GRAPH_SENDMAIL_SCOPE,
  });

  if (input.clientAssertion) {
    body.set("client_assertion_type", GRAPH_CLIENT_ASSERTION_TYPE);
    body.set("client_assertion", input.clientAssertion);
    return body;
  }

  if (input.clientSecret && input.authMode === "client-secret") {
    body.set("client_secret", input.clientSecret);
    return body;
  }

  throw new Error("Microsoft Graph certificate authentication is required (NACHKLANG_GRAPH_AUTH_MODE=certificate) but no client assertion is available.");
}

export async function getGraphAccessToken(fetchImpl = fetch): Promise<string> {
  const tenantId = requiredEnv("MICROSOFT_TENANT_ID");
  const clientId = requiredEnv("MICROSOFT_CLIENT_ID");
  const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const clientAssertion = await maybeBuildCertificateAssertion({
    tenantId,
    clientId,
    tokenEndpoint,
  });

  const response = await fetchImpl(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildGraphTokenRequestBody({
      clientId,
      clientAssertion,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      authMode: (process.env.NACHKLANG_GRAPH_AUTH_MODE === "client-secret" ? "client-secret" : "certificate"),
    }),
  });

  if (!response.ok) {
    // MAIL_TOKEN_FETCH_FAILED — Microsoft Graph token endpoint returned non-2xx
    console.error("Microsoft Graph token request failed", { status: response.status });
    throw new Error("MAIL_TOKEN_FETCH_FAILED");
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    // MAIL_TOKEN_MISSING — token endpoint returned 2xx but no access_token field
    throw new Error("MAIL_TOKEN_MISSING");
  }
  return payload.access_token;
}

async function maybeBuildCertificateAssertion(input: {
  tenantId: string;
  clientId: string;
  tokenEndpoint: string;
}): Promise<string | undefined> {
  const privateKeyPath = process.env.MICROSOFT_CLIENT_CERTIFICATE_PRIVATE_KEY_PATH;
  const thumbprint = process.env.MICROSOFT_CLIENT_CERTIFICATE_THUMBPRINT;

  if (!privateKeyPath || !thumbprint) {
    return undefined;
  }

  const [{ readFile }, crypto] = await Promise.all([import("node:fs/promises"), import("node:crypto")]);
  const privateKeyPem = await readFile(privateKeyPath, "utf8");
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
    x5t: certificateThumbprintToX5t(thumbprint),
  };
  const payload = {
    aud: input.tokenEndpoint,
    exp: now + 300,
    iss: input.clientId,
    jti: crypto.randomUUID(),
    nbf: now - 30,
    sub: input.clientId,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(privateKeyPem);
  return `${unsigned}.${base64Url(signature)}`;
}

function certificateThumbprintToX5t(thumbprint: string): string {
  const hex = thumbprint.replace(/[^a-fA-F0-9]/g, "");
  if (hex.length !== 40) {
    throw new Error("MICROSOFT_CLIENT_CERTIFICATE_THUMBPRINT must be a SHA-1 thumbprint.");
  }
  return base64Url(Buffer.from(hex, "hex"));
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export const graphMailTransport: MailTransport = {
  async send(message: MailMessage): Promise<void> {
    await sendGraphMail(await getGraphAccessToken(), message);
  },
};
