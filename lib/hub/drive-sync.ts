import { createHash, randomBytes } from "node:crypto";
import { AppError } from "../content/errors";
import { DRIVE_ADMIN_MESSAGE, driveLoginOf, isDriveAdminLogin, type HubUser } from "./users";

/**
 * Synchronisation des comptes du hub avec le drive (ownCloud Infinite Scale 8, IdP intégré).
 * Côté serveur uniquement. Le hub crée / rattache des COMPTES et pose leur mot de passe ;
 * il ne supprime jamais un compte et ne touche jamais aux espaces ni à leurs permissions
 * (gérés dans le drive). Aucune méthode DELETE n'est exposée par ce module.
 *
 * Variables : DRIVE_URL, DRIVE_ADMIN_USER, DRIVE_ADMIN_PASSWORD (toutes les trois requises,
 * sinon la synchro est désactivée et le hub fonctionne seul). DRIVE_MAIL_DOMAIN (facultative)
 * sert à l'adresse technique exigée par oCIS à la création d'un compte.
 */

export type DriveConfig = { url: string; adminUser: string; adminPassword: string; mailDomain: string };

/** Rôle « User » d'oCIS et ressource (application) sur laquelle on l'attribue (voir docs/drive-bureau.md du serveur). */
const ROLE_USER_ID = "d7beeea8-8ff4-406b-8fb6-ab2dd81e6b11";
const RESOURCE_ID = "27c04400-5acb-4182-ae4a-eb99e8094f2c";
const CLIENT_ID = "web";
const SCOPE = "openid profile email";
const TIMEOUT_MS = 15_000;

/** https obligatoire, sauf boucle locale (faux serveur des tests). */
function parseUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
    if (!(u.protocol === "https:" || (u.protocol === "http:" && loopback)) || u.username || u.password) return null;
    return u.origin;
  } catch {
    return null;
  }
}

export function driveConfig(env: Record<string, string | undefined> = process.env): DriveConfig | null {
  const url = parseUrl(env.DRIVE_URL ?? "");
  const adminUser = (env.DRIVE_ADMIN_USER ?? "").trim();
  const adminPassword = env.DRIVE_ADMIN_PASSWORD ?? "";
  if (!url || !adminUser || !adminPassword) return null;
  return { url, adminUser, adminPassword, mailDomain: (env.DRIVE_MAIL_DOMAIN ?? "").trim() || "drive.succieu.fr" };
}

export const driveSyncEnabled = (env: Record<string, string | undefined> = process.env) => driveConfig(env) !== null;

function fail(message: string, details?: Record<string, unknown>): never {
  throw new AppError("drive_sync_failed", message, details ? { details } : undefined);
}

/** Cookies d'une réponse (Set-Cookie → en-tête Cookie), fusionnés dans le pot. */
function absorb(jar: Map<string, string>, res: Response) {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
  }
}
const cookieHeader = (jar: Map<string, string>) => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");

async function http(url: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
  } catch {
    return fail("Le drive ne répond pas. Réessayez plus tard.");
  }
}

type Token = { value: string; exp: number; key: string };
let cached: Token | null = null;

/** Oublie le jeton en cache (tests, ou après un 401). */
export function resetDriveToken() {
  cached = null;
}

/** Jeton OIDC de l'administrateur du drive : flux code + PKCE du client `web`, sans basic auth. */
async function loginAdmin(cfg: DriveConfig): Promise<Token> {
  const conf = await http(`${cfg.url}/.well-known/openid-configuration`);
  if (!conf.ok) fail("Le drive est injoignable (configuration OpenID).");
  const meta = (await conf.json().catch(() => null)) as { authorization_endpoint?: string; token_endpoint?: string } | null;
  if (!meta?.authorization_endpoint || !meta.token_endpoint) fail("Réponse OpenID du drive incomplète.");
  const redirectUri = `${cfg.url}/oidc-callback.html`;
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(12).toString("base64url");
  const nonce = randomBytes(12).toString("base64url");
  const authUrl = new URL(meta.authorization_endpoint);
  authUrl.search = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPE,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const jar = new Map<string, string>();
  const authorize = async () => {
    const r = await http(authUrl.toString(), { redirect: "manual", headers: { cookie: cookieHeader(jar) } });
    absorb(jar, r);
    return r;
  };
  await authorize(); // pose les cookies de la session de connexion

  const logon = await http(`${cfg.url}/signin/v1/identifier/_/logon`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "kopano-konnect-xsrf": "1",
      origin: cfg.url,
      referer: `${cfg.url}/`,
      cookie: cookieHeader(jar),
    },
    body: JSON.stringify({
      params: [cfg.adminUser, cfg.adminPassword, "1"],
      hello: { scope: SCOPE, client_id: CLIENT_ID, redirect_uri: redirectUri, flow: "oidc" },
      state,
    }),
  });
  absorb(jar, logon);
  const logonBody = (await logon.json().catch(() => null)) as { success?: boolean } | null;
  if (!logon.ok || logonBody?.success === false) fail("Connexion du hub au drive refusée (compte administrateur du drive).");

  const back = await authorize();
  const location = back.headers.get("location");
  const code = location ? new URL(location, cfg.url).searchParams.get("code") : null;
  if (!code) fail("Le drive n'a pas délivré de code d'autorisation.");

  const tok = await http(meta.token_endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });
  const body = (await tok.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
  if (!tok.ok || !body?.access_token) fail("Le drive n'a pas délivré de jeton.");
  const ttl = Math.max(30, Number(body.expires_in) || 300);
  return { value: body.access_token, exp: Date.now() + (ttl - 30) * 1000, key: `${cfg.url}|${cfg.adminUser}` };
}

async function token(cfg: DriveConfig, force = false): Promise<string> {
  const key = `${cfg.url}|${cfg.adminUser}`;
  if (!force && cached && cached.key === key && cached.exp > Date.now()) return cached.value;
  cached = await loginAdmin(cfg);
  return cached.value;
}

/** Seules lectures, créations et modifications : jamais de suppression. */
type GraphMethod = "GET" | "POST" | "PATCH";

async function graph(cfg: DriveConfig, method: GraphMethod, path: string, body?: unknown): Promise<Response> {
  const call = async (force: boolean) =>
    http(`${cfg.url}/graph/v1.0${path}`, {
      method,
      headers: {
        authorization: `Bearer ${await token(cfg, force)}`,
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  let res = await call(false);
  if (res.status === 401) res = await call(true); // jeton révoqué avant son expiration
  return res;
}

async function graphError(res: Response, what: string): Promise<never> {
  const e = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  // Le message du drive peut citer un nom : on le garde court et sans mot de passe (jamais envoyé en retour).
  const detail = (e?.error?.message ?? "").slice(0, 160);
  return fail(`Le drive a refusé : ${what} (${res.status}${detail ? ` — ${detail}` : ""}).`);
}

export type DriveAccount = { id: string; login: string; displayName: string; enabled: boolean | null };

function toAccount(u: Record<string, unknown>): DriveAccount {
  return {
    id: String(u.id ?? ""),
    login: String(u.onPremisesSamAccountName ?? u.userPrincipalName ?? "").toLowerCase(),
    displayName: String(u.displayName ?? ""),
    enabled: typeof u.accountEnabled === "boolean" ? u.accountEnabled : null,
  };
}

const need = (): DriveConfig => {
  const cfg = driveConfig();
  if (!cfg) fail("La synchronisation avec le drive n'est pas configurée.");
  return cfg;
};

/** Garde-fou défensif : jamais d'appel au drive pour le compte administrateur du drive. */
function assertNotAdmin(login: string, cfg: DriveConfig) {
  if (isDriveAdminLogin(login, cfg.adminUser)) throw new AppError("validation_failed", DRIVE_ADMIN_MESSAGE, { fields: { driveLogin: DRIVE_ADMIN_MESSAGE } });
}

/** Compte drive par identifiant, ou null s'il n'existe pas. */
export async function findDriveAccount(login: string, cfg: DriveConfig = need()): Promise<DriveAccount | null> {
  const res = await graph(cfg, "GET", `/users/${encodeURIComponent(login)}`);
  if (res.status === 404) return null;
  if (!res.ok) return graphError(res, "lecture du compte");
  return toAccount((await res.json()) as Record<string, unknown>);
}

export async function listDriveAccounts(cfg: DriveConfig = need()): Promise<DriveAccount[]> {
  const res = await graph(cfg, "GET", "/users");
  if (!res.ok) return graphError(res, "liste des comptes");
  const data = (await res.json()) as { value?: Record<string, unknown>[] };
  return (data.value ?? []).map(toAccount);
}

export type EnsureResult = "created" | "attached";

/**
 * Crée le compte drive s'il n'existe pas (avec le rôle « User »), sinon le rattache ;
 * dans les deux cas le mot de passe du drive devient `password`. Ne supprime rien.
 */
export async function ensureDriveAccount(
  login: string,
  displayName: string,
  password: string,
  cfg: DriveConfig = need(),
): Promise<EnsureResult> {
  assertNotAdmin(login, cfg);
  const existing = await findDriveAccount(login, cfg);
  if (existing) {
    await patchUser(cfg, login, { passwordProfile: { password } }, "mot de passe");
    return "attached";
  }
  const res = await graph(cfg, "POST", "/users", {
    onPremisesSamAccountName: login,
    displayName,
    mail: `${login}@${cfg.mailDomain}`,
    passwordProfile: { password },
  });
  if (!res.ok) return graphError(res, "création du compte");
  const created = (await res.json().catch(() => null)) as { id?: string } | null;
  if (!created?.id) fail("Le drive n'a pas renvoyé l'identifiant du compte créé.");
  const role = await graph(cfg, "POST", `/users/${created.id}/appRoleAssignments`, {
    appRoleId: ROLE_USER_ID,
    principalId: created.id,
    resourceId: RESOURCE_ID,
  });
  if (!role.ok) return graphError(role, "attribution du rôle « Utilisateur »");
  return "created";
}

async function patchUser(cfg: DriveConfig, login: string, body: unknown, what: string) {
  const res = await graph(cfg, "PATCH", `/users/${encodeURIComponent(login)}`, body);
  if (!res.ok) await graphError(res, what);
}

/** Mot de passe d'un compte drive existant. */
export async function setDrivePassword(login: string, password: string, cfg: DriveConfig = need()): Promise<void> {
  assertNotAdmin(login, cfg);
  await patchUser(cfg, login, { passwordProfile: { password } }, "changement de mot de passe");
}

/** Active / désactive (accountEnabled) un compte drive existant ; ne supprime rien. */
export async function setDriveEnabled(login: string, enabled: boolean, cfg: DriveConfig = need()): Promise<void> {
  assertNotAdmin(login, cfg);
  await patchUser(cfg, login, { accountEnabled: enabled }, enabled ? "réactivation du compte" : "désactivation du compte");
}

export type ComparisonRow = {
  /** Identifiant du drive. */
  driveLogin: string;
  /** Compte du hub correspondant, s'il y en a un. */
  hub: { id: string; identifier: string; displayName: string; active: boolean } | null;
  drive: { displayName: string; enabled: boolean | null } | null;
  /** Compte technique (administrateur du drive) : listé mais jamais rattachable. */
  technical?: boolean;
  /** Écart constaté. */
  status: "ok" | "drive-sans-hub" | "hub-sans-drive" | "desactive-hub-seulement" | "desactive-drive-seulement";
};

/** Comparaison pure hub ↔ drive (lecture seule). */
export function compareAccounts(users: HubUser[], drive: DriveAccount[]): ComparisonRow[] {
  const byLogin = new Map(drive.map((d) => [d.login, d]));
  const seen = new Set<string>();
  const rows: ComparisonRow[] = users.map((u) => {
    const login = driveLoginOf(u).toLowerCase();
    seen.add(login);
    const d = byLogin.get(login) ?? null;
    const hub = { id: u.id, identifier: u.identifier, displayName: u.displayName, active: u.active };
    let status: ComparisonRow["status"] = "ok";
    if (!d) status = "hub-sans-drive";
    else if (!u.active && d.enabled !== false) status = "desactive-hub-seulement";
    else if (u.active && d.enabled === false) status = "desactive-drive-seulement";
    return { driveLogin: login, hub, drive: d && { displayName: d.displayName, enabled: d.enabled }, status };
  });
  for (const d of drive) {
    if (!seen.has(d.login)) {
      rows.push({ driveLogin: d.login, hub: null, drive: { displayName: d.displayName, enabled: d.enabled }, status: "drive-sans-hub", ...(isDriveAdminLogin(d.login) ? { technical: true } : {}) });
    }
  }
  return rows;
}

/** Comparaison en direct (lit le drive). */
export async function compareWithDrive(users: HubUser[]): Promise<ComparisonRow[]> {
  return compareAccounts(users, await listDriveAccounts());
}
