"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { focusRing } from "@/components/bureau/fields";
import { Card } from "@/components/ui/Card";
import { btnDanger, btnPrimary, btnSecondary } from "@/components/moderation/ui";
import { ACCESS_LEVELS, HUB_MODULES, type AccessLevel } from "@/lib/hub/modules";
import { ACTION_LABEL, call, formatDate, type AdminUser, type AuditLine, type DriveOutcome, type DriveRow, type Rights } from "./api";

const LEVEL_LABEL: Record<AccessLevel, string> = { none: "Aucun", read: "Lecture", write: "Écriture" };
const card = "!p-4 sm:!p-6";
const input = `mt-1 min-h-12 block w-full rounded-xl border border-ink-subtle/60 bg-surface px-3.5 py-2.5 text-base text-ink ${focusRing}`;
const th = "px-3 py-2 text-left text-sm font-semibold text-ink-muted";
const td = "px-3 py-2 align-top";

const emptyRights = (): Rights => Object.fromEntries(HUB_MODULES.map((m) => [m.id, "none"])) as Rights;
const suggestIdentifier = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().split(/\s+/)[0]?.replace(/[^a-z0-9-]/g, "") ?? "";

type Secret = { who: string; password: string; kind: "création" | "réinitialisation"; drive?: DriveOutcome };
type PasswordChoice = { passwordMode: "generate" | "custom"; password?: string };

const DRIVE_NOTE: Record<DriveOutcome["status"], string> = {
  disabled: "",
  created: "Compte du drive créé avec le même mot de passe.",
  attached: "Compte du drive existant rattaché : même mot de passe.",
  updated: "Drive mis à jour.",
  error: "",
};

function rightsSummary(u: AdminUser): string {
  if (u.role === "admin") return "Tout (administrateur)";
  const parts = HUB_MODULES.filter((m) => u.rights[m.id] !== "none").map((m) => `${m.label} : ${LEVEL_LABEL[u.rights[m.id]].toLowerCase()}`);
  return parts.length ? parts.join(" · ") : "Aucun";
}

function driveState(u: AdminUser, enabled: boolean): { label: string; tone: string } {
  if (!enabled) return { label: "Synchro désactivée", tone: "text-ink-muted" };
  if (u.driveSync?.error) return { label: "Erreur", tone: "text-tuile" };
  if (u.driveSync?.at) return { label: `Synchronisé ${formatDate(u.driveSync.at)}`, tone: "text-moss-dark" };
  return { label: "À synchroniser", tone: "text-ink-muted" };
}

/** Console des comptes ; la coquille (page serveur) garantit session et rôle admin. */
export function HubAdminApp({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [driveEnabled, setDriveEnabled] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [secret, setSecret] = useState<Secret | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const r = await call<{ users: AdminUser[]; driveSync: boolean }>("/api/admin/users");
      setUsers(r.users);
      setDriveEnabled(r.driveSync);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, []);
  useEffect(() => void reload(), [reload]);

  async function act(fn: () => Promise<string | void>, ok: string) {
    setError("");
    setNotice("");
    try {
      const msg = await fn();
      setNotice(msg || ok);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
      await reload();
    }
  }

  const selected = users.find((u) => u.id === editing) ?? null;

  return (
    <div className="space-y-6">
      <div aria-live="polite">
        {error && <p role="alert" className="rounded-xl bg-tuile-pale p-3 font-medium text-tuile">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-pre-pale p-3 font-medium text-moss-dark">{notice}</p>}
      </div>
      <p className={`rounded-xl p-3 ${driveEnabled ? "bg-pre-pale text-moss-dark" : "bg-canvas text-ink-muted"}`} data-testid="drive-banner">
        {driveEnabled
          ? "Drive synchronisé : le mot de passe attribué ici est le même sur le site et sur le drive."
          : "Synchronisation avec le drive désactivée (variables DRIVE_URL, DRIVE_ADMIN_USER et DRIVE_ADMIN_PASSWORD absentes) : les comptes du hub fonctionnent seuls."}
      </p>
      {secret && <SecretCard secret={secret} onClose={() => setSecret(null)} />}
      <CreateForm
        driveEnabled={driveEnabled}
        onCreated={(u, pw, drive) => {
          setSecret({ who: `${u.displayName} (${u.identifier})`, password: pw, kind: "création", drive });
          setNotice("Compte créé.");
          void reload();
        }}
        onError={setError}
      />
      <section aria-labelledby="comptes" className="space-y-3">
        <h2 id="comptes" className="font-display text-2xl font-bold text-moss-dark">Comptes ({users.length})</h2>
        <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
          <table className="w-full min-w-[56rem] border-collapse text-base">
            <thead className="border-b border-border-subtle bg-canvas">
              <tr>
                <th scope="col" className={th}>Nom</th>
                <th scope="col" className={th}>Identifiant</th>
                <th scope="col" className={th}>Rôle</th>
                <th scope="col" className={th}>Actif</th>
                <th scope="col" className={th}>Droits</th>
                <th scope="col" className={th}>Drive</th>
                <th scope="col" className={th}>Dernière connexion</th>
                <th scope="col" className={th}><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {users.map((u) => {
                const d = driveState(u, driveEnabled);
                return (
                  <tr key={u.id} className={`${u.active ? "" : "opacity-70"} ${editing === u.id ? "bg-pre-pale" : ""}`}>
                    <th scope="row" className={`${td} font-semibold`}>{u.displayName}{u.id === selfId && " (vous)"}</th>
                    <td className={td}>{u.identifier}{u.driveLogin !== u.identifier && <span className="block text-sm text-ink-muted">drive : {u.driveLogin}</span>}</td>
                    <td className={td}>{u.role === "admin" ? "Administrateur" : "Membre"}</td>
                    <td className={td}>
                      <span className={`rounded-full px-2.5 py-0.5 text-sm font-semibold ${u.active ? "bg-pre-pale text-moss-dark" : "bg-tuile-pale text-tuile"}`}>{u.active ? "Oui" : "Non"}</span>
                    </td>
                    <td className={`${td} max-w-64 text-sm`}>{rightsSummary(u)}</td>
                    <td className={`${td} text-sm ${d.tone}`} title={u.driveSync?.error}>{d.label}</td>
                    <td className={`${td} text-sm`}>{formatDate(u.lastLogin)}</td>
                    <td className={td}>
                      <button type="button" className={btnSecondary} aria-expanded={editing === u.id} aria-label={`Modifier ${u.displayName}`}
                        onClick={() => setEditing(editing === u.id ? null : u.id)}>
                        Modifier
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <EditPanel
          key={selected.id}
          user={selected}
          self={selected.id === selfId}
          driveEnabled={driveEnabled}
          onClose={() => setEditing(null)}
          onSave={(patch) => act(() => call(`/api/admin/users/${selected.id}`, "PATCH", patch), "Modifications enregistrées.")}
          onActive={(active) =>
            act(async () => {
              const r = await call<{ drive: DriveOutcome }>(`/api/admin/users/${selected.id}/active`, "POST", { active });
              const base = active ? "Compte réactivé." : "Compte désactivé.";
              return r.drive.status === "error" ? `${base} Mais le drive n'a pas suivi : ${r.drive.error}` : base;
            }, "")
          }
          onReset={(choice) =>
            act(async () => {
              const r = await call<{ password: string; drive: DriveOutcome }>(`/api/admin/users/${selected.id}/reset-password`, "POST", choice);
              setSecret({ who: `${selected.displayName} (${selected.identifier})`, password: r.password, kind: "réinitialisation", drive: r.drive });
              return "Mot de passe réinitialisé.";
            }, "")
          }
        />
      )}
      {driveEnabled && <DrivePanel users={users} onChanged={reload} />}
      <AuditPanel users={users} />
    </div>
  );
}

function SecretCard({ secret, onClose }: { secret: Secret; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const note = secret.drive ? DRIVE_NOTE[secret.drive.status] : "";
  return (
    <Card className={`${card} border-2 !border-moss`}>
      <h2 className="font-display text-xl font-bold text-moss-dark">Mot de passe attribué — {secret.kind}</h2>
      <p className="mt-1">Pour {secret.who}. <strong>Il ne sera plus jamais affiché</strong> : copiez-le ou imprimez-le maintenant. La personne ne peut pas le changer : en cas d&apos;oubli, elle s&apos;adresse à vous.</p>
      {note && <p className="mt-1 font-medium text-moss-dark">{note}</p>}
      <p className="mt-3 select-all break-all rounded-xl bg-pre-pale p-4 font-mono text-2xl font-bold" data-testid="temp-password">{secret.password}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={btnPrimary} onClick={async () => { await navigator.clipboard?.writeText(secret.password).catch(() => {}); setCopied(true); }}>
          {copied ? "Copié ✓" : "Copier"}
        </button>
        <button type="button" className={btnSecondary} onClick={() => window.print()}>Imprimer</button>
        <button type="button" className={btnSecondary} onClick={onClose}>J&apos;ai noté, fermer</button>
      </div>
    </Card>
  );
}

/** « Générer » (lisible, 3 groupes de 4) ou « Saisir » (10 caractères minimum). */
function PasswordChooser({ value, onChange, name }: { value: PasswordChoice; onChange: (v: PasswordChoice) => void; name: string }) {
  const id = useId();
  return (
    <fieldset className="mt-4">
      <legend className="font-semibold">Mot de passe</legend>
      <div className="flex flex-wrap gap-x-6">
        <label className="inline-flex min-h-11 items-center gap-2">
          <input type="radio" className="size-5" name={`${name}-pw`} checked={value.passwordMode === "generate"} onChange={() => onChange({ passwordMode: "generate" })} />
          Générer (lisible)
        </label>
        <label className="inline-flex min-h-11 items-center gap-2">
          <input type="radio" className="size-5" name={`${name}-pw`} checked={value.passwordMode === "custom"} onChange={() => onChange({ passwordMode: "custom", password: value.password ?? "" })} />
          Saisir un mot de passe
        </label>
      </div>
      {value.passwordMode === "custom" && (
        <>
          <label htmlFor={`${id}-p`} className="sr-only">Mot de passe attribué (10 caractères minimum)</label>
          <input id={`${id}-p`} className={input} type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} minLength={10} maxLength={200} required
            placeholder="10 caractères minimum" value={value.password ?? ""} onChange={(e) => onChange({ passwordMode: "custom", password: e.target.value })} />
        </>
      )}
    </fieldset>
  );
}

function RightsGrid({ rights, onChange, disabled, name }: { rights: Rights; onChange: (r: Rights) => void; disabled?: boolean; name: string }) {
  return (
    <div className="space-y-3">
      {HUB_MODULES.map((m) => (
        <fieldset key={m.id} disabled={disabled} className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <legend className="sr-only">{m.label}</legend>
          <span className="min-w-44 font-semibold" aria-hidden>{m.label}</span>
          {ACCESS_LEVELS.map((lv) => (
            <label key={lv} className="inline-flex min-h-11 items-center gap-2">
              <input type="radio" className="size-5" name={`${name}-${m.id}`} checked={rights[m.id] === lv} onChange={() => onChange({ ...rights, [m.id]: lv })} aria-label={`${m.label} : ${LEVEL_LABEL[lv]}`} />
              {LEVEL_LABEL[lv]}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

function CreateForm({ driveEnabled, onCreated, onError }: { driveEnabled: boolean; onCreated: (u: AdminUser, pw: string, drive: DriveOutcome) => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [touched, setTouched] = useState(false);
  const [driveLogin, setDriveLogin] = useState("");
  const [role, setRole] = useState<"admin" | "membre">("membre");
  const [rights, setRights] = useState<Rights>(emptyRights());
  const [pw, setPw] = useState<PasswordChoice>({ passwordMode: "generate" });
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    onError("");
    try {
      const r = await call<{ user: AdminUser; password: string; drive: DriveOutcome }>("/api/admin/users", "POST", {
        displayName, identifier: identifier || suggestIdentifier(displayName), role, rights, ...pw,
        ...(driveLogin.trim() ? { driveLogin: driveLogin.trim() } : {}),
      });
      onCreated(r.user, r.password, r.drive);
      setDisplayName(""); setIdentifier(""); setTouched(false); setDriveLogin(""); setRole("membre"); setRights(emptyRights()); setPw({ passwordMode: "generate" }); setOpen(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Création impossible.");
    }
  }

  if (!open) return <button type="button" className={btnPrimary} onClick={() => setOpen(true)}>+ Créer un compte</button>;
  return (
    <Card className={card}><form onSubmit={submit}>
      <h2 className="font-display text-xl font-bold text-moss-dark">Nouveau compte</h2>
      <label htmlFor={`${id}-n`} className="mt-4 block font-semibold">Nom affiché</label>
      <input id={`${id}-n`} className={input} required maxLength={80} value={displayName}
        onChange={(e) => { setDisplayName(e.target.value); if (!touched) setIdentifier(suggestIdentifier(e.target.value)); }} />
      <label htmlFor={`${id}-i`} className="mt-4 block font-semibold">Identifiant de connexion (modifiable)</label>
      <input id={`${id}-i`} className={input} required maxLength={32} value={identifier} autoCapitalize="none"
        onChange={(e) => { setTouched(true); setIdentifier(e.target.value); }} />
      {driveEnabled && (
        <>
          <label htmlFor={`${id}-d`} className="mt-4 block font-semibold">Identifiant du drive (si différent)</label>
          <input id={`${id}-d`} className={input} maxLength={64} value={driveLogin} autoCapitalize="none" placeholder={identifier || "identique à l'identifiant"}
            onChange={(e) => setDriveLogin(e.target.value)} />
          <p className="mt-1 text-sm text-ink-muted">Si ce compte existe déjà sur le drive, il est rattaché ; sinon il est créé. Les espaces du drive ne sont jamais modifiés ici.</p>
        </>
      )}
      <label htmlFor={`${id}-r`} className="mt-4 block font-semibold">Rôle</label>
      <select id={`${id}-r`} className={input} value={role} onChange={(e) => setRole(e.target.value as "admin" | "membre")}>
        <option value="membre">Membre</option>
        <option value="admin">Administrateur (tous les droits)</option>
      </select>
      <h3 className="mt-5 font-semibold">Droits par module</h3>
      {role === "admin" ? <p className="text-ink-muted">Un administrateur a l&apos;écriture partout.</p> : <RightsGrid name="new" rights={rights} onChange={setRights} />}
      <PasswordChooser name="new" value={pw} onChange={setPw} />
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" className={btnPrimary}>Créer le compte</button>
        <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Annuler</button>
      </div>
    </form></Card>
  );
}

/** Panneau de modification d'un seul compte à la fois. */
function EditPanel({ user, self, driveEnabled, onClose, onSave, onActive, onReset }: {
  user: AdminUser; self: boolean; driveEnabled: boolean; onClose: () => void;
  onSave: (p: { role?: string; rights?: Rights; driveLogin?: string }) => void;
  onActive: (a: boolean) => void; onReset: (c: PasswordChoice) => void;
}) {
  const [rights, setRights] = useState<Rights>(user.rights);
  const [role, setRole] = useState(user.role);
  const [driveLogin, setDriveLogin] = useState(user.driveLogin);
  const [pw, setPw] = useState<PasswordChoice>({ passwordMode: "generate" });
  const [showPw, setShowPw] = useState(false);
  const dirty = role !== user.role || JSON.stringify(rights) !== JSON.stringify(user.rights) || driveLogin !== user.driveLogin;
  const [pending, setPending] = useState<{ msg: string; fn: () => void } | null>(null);
  const confirmThen = (msg: string, fn: () => void) => () => setPending({ msg, fn });
  return (
    <Card className={card}><section aria-label={`Modifier ${user.displayName}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-moss-dark">{user.displayName}{self && " (vous)"} — {user.identifier}</h2>
        <button type="button" className={btnSecondary} onClick={onClose}>Fermer</button>
      </div>
      {user.driveSync?.error && <p role="alert" className="mt-2 rounded-xl bg-tuile-pale p-3 text-tuile">Dernière synchro avec le drive en erreur : {user.driveSync.error}</p>}
      <div className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
        <label className="font-semibold">Rôle{" "}
          <select className={`${input} !mt-1 sm:w-auto`} value={role} disabled={self} onChange={(e) => setRole(e.target.value as "admin" | "membre")}>
            <option value="membre">Membre</option>
            <option value="admin">Administrateur</option>
          </select>
        </label>
        {driveEnabled && (
          <label className="font-semibold">Identifiant du drive{" "}
            <input className={`${input} !mt-1 sm:w-64`} value={driveLogin} maxLength={64} autoCapitalize="none" onChange={(e) => setDriveLogin(e.target.value)} />
          </label>
        )}
      </div>
      <h3 className="mt-4 font-semibold">Droits par module</h3>
      {role === "admin" ? <p className="text-ink-muted">Écriture partout (administrateur).</p> : <RightsGrid name={user.id} rights={rights} onChange={setRights} />}
      {pending && (
        <div role="alertdialog" aria-label="Confirmation" className="mt-4 rounded-xl border-2 border-moss bg-pre-pale p-4">
          <p className="font-semibold">{pending.msg}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={btnPrimary} autoFocus onClick={() => { const f = pending.fn; setPending(null); f(); }}>Confirmer</button>
            <button type="button" className={btnSecondary} onClick={() => setPending(null)}>Annuler</button>
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={btnPrimary} disabled={!dirty}
          onClick={confirmThen(`Enregistrer les modifications de ${user.displayName} ?`, () => onSave({ role, rights, driveLogin }))}>
          Enregistrer
        </button>
        <button type="button" className={btnSecondary} aria-expanded={showPw} onClick={() => setShowPw((v) => !v)}>Réinitialiser le mot de passe</button>
        {!self && (
          <button type="button" className={user.active ? btnDanger : btnSecondary}
            onClick={confirmThen(user.active ? `Désactiver le compte de ${user.displayName} ? Sa session sera fermée${driveEnabled ? " et son compte du drive sera désactivé (jamais supprimé)" : ""}.` : `Réactiver le compte de ${user.displayName} ?`, () => onActive(!user.active))}>
            {user.active ? "Désactiver" : "Réactiver"}
          </button>
        )}
      </div>
      {showPw && (
        <form className="mt-4 rounded-xl border border-border-subtle p-4"
          onSubmit={(e) => { e.preventDefault(); confirmThen(`Réinitialiser le mot de passe de ${user.displayName} ? L'ancien cessera de fonctionner${driveEnabled ? " sur le site et sur le drive" : ""} et ses sessions seront fermées.`, () => { setShowPw(false); onReset(pw); })(); }}>
          <PasswordChooser name={`reset-${user.id}`} value={pw} onChange={setPw} />
          <button type="submit" className={`${btnPrimary} mt-3`}>Attribuer ce mot de passe</button>
        </form>
      )}
    </section></Card>
  );
}

const DRIVE_STATUS: Record<DriveRow["status"], string> = {
  ok: "Conforme",
  "drive-sans-hub": "Compte drive sans compte hub",
  "hub-sans-drive": "Compte hub sans compte drive",
  "desactive-hub-seulement": "Désactivé dans le hub seulement",
  "desactive-drive-seulement": "Désactivé dans le drive seulement",
};

/** « Comptes du drive » : comparaison en lecture seule, plus l'action « rattacher ». */
function DrivePanel({ users, onChanged }: { users: AdminUser[]; onChanged: () => void }) {
  const [rows, setRows] = useState<DriveRow[] | null>(null);
  const [err, setErr] = useState("");
  const [choice, setChoice] = useState<Record<string, string>>({});
  const id = useId();
  const load = useCallback(async () => {
    setErr("");
    try {
      setRows((await call<{ enabled: boolean; rows: DriveRow[] }>("/api/admin/drive")).rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lecture du drive impossible.");
    }
  }, []);
  async function attach(driveLogin: string) {
    setErr("");
    try {
      await call("/api/admin/drive/attach", "POST", { userId: choice[driveLogin], driveLogin });
      await load();
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Rattachement impossible.");
    }
  }
  const unlinked = users.filter((u) => !rows?.some((r) => r.hub?.id === u.id && r.drive));
  return (
    <Card className={card}><section aria-labelledby={id}>
      <h2 id={id} className="font-display text-2xl font-bold text-moss-dark">Comptes du drive</h2>
      <p className="mt-1 text-ink-muted">Comparaison en lecture seule entre le hub et le drive. Les espaces et leurs permissions se gèrent dans le drive, jamais ici.</p>
      <button type="button" className={`${btnSecondary} mt-3`} onClick={load}>{rows ? "Actualiser la comparaison" : "Comparer avec le drive"}</button>
      {err && <p role="alert" className="mt-3 text-tuile">{err}</p>}
      {rows && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse">
            <thead className="border-b border-border-subtle"><tr>
              <th scope="col" className={th}>Identifiant drive</th><th scope="col" className={th}>Compte hub</th><th scope="col" className={th}>Écart</th><th scope="col" className={th}><span className="sr-only">Action</span></th>
            </tr></thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((r) => (
                <tr key={r.driveLogin}>
                  <th scope="row" className={`${td} font-semibold`}>{r.driveLogin}</th>
                  <td className={td}>{r.hub ? r.hub.displayName : "—"}</td>
                  <td className={`${td} ${r.status === "ok" ? "text-moss-dark" : "text-tuile"}`}>{DRIVE_STATUS[r.status]}</td>
                  <td className={td}>
                    {r.status === "drive-sans-hub" && r.technical && <span className="text-sm text-ink-muted">Compte technique du drive : non rattachable.</span>}
                    {r.status === "drive-sans-hub" && !r.technical && (
                      <span className="flex flex-wrap items-center gap-2">
                        <label className="sr-only" htmlFor={`${id}-${r.driveLogin}`}>Compte hub à rattacher à {r.driveLogin}</label>
                        <select id={`${id}-${r.driveLogin}`} className={`${input} !mt-0 sm:w-56`} value={choice[r.driveLogin] ?? ""} onChange={(e) => setChoice({ ...choice, [r.driveLogin]: e.target.value })}>
                          <option value="">Choisir un compte hub…</option>
                          {unlinked.map((u) => <option key={u.id} value={u.id}>{u.displayName}</option>)}
                        </select>
                        <button type="button" className={btnSecondary} disabled={!choice[r.driveLogin]} onClick={() => attach(r.driveLogin)}>Rattacher</button>
                      </span>
                    )}
                    {r.status === "hub-sans-drive" && <span className="text-sm text-ink-muted">Attribuer un mot de passe crée le compte du drive.</span>}
                    {(r.status === "desactive-hub-seulement" || r.status === "desactive-drive-seulement") && <span className="text-sm text-ink-muted">Désactiver / réactiver depuis le panneau du compte.</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section></Card>
  );
}

function AuditPanel({ users }: { users: AdminUser[] }) {
  const [person, setPerson] = useState("");
  const [entries, setEntries] = useState<AuditLine[]>([]);
  const [err, setErr] = useState("");
  const id = useId();
  useEffect(() => {
    call<{ entries: AuditLine[] }>(`/api/admin/audit?limit=100${person ? `&person=${encodeURIComponent(person)}` : ""}`)
      .then((r) => { setEntries(r.entries); setErr(""); })
      .catch((e) => setErr(e instanceof Error ? e.message : "Journal indisponible."));
  }, [person]);
  return (
    <Card className={card}><section aria-labelledby={id}>
      <h2 id={id} className="font-display text-2xl font-bold text-moss-dark">Journal</h2>
      <label className="mt-3 block font-semibold">Personne
        <select className={input} value={person} onChange={(e) => setPerson(e.target.value)}>
          <option value="">Tout le monde</option>
          {users.map((u) => <option key={u.id} value={u.identifier}>{u.displayName}</option>)}
        </select>
      </label>
      {err && <p role="alert" className="mt-3 text-tuile">{err}</p>}
      {entries.length === 0 ? <p className="mt-3 text-ink-muted">Aucun événement.</p> : (
        <ul className="mt-3 divide-y divide-border-subtle">
          {entries.map((l, i) => (
            <li key={i} className="py-2">
              <span className="text-ink-muted">{formatDate(l.date)}</span> — <strong>{l.actor}</strong> : {ACTION_LABEL[l.action] ?? l.action}
              {l.detail && <span className="text-ink-muted"> ({l.detail})</span>}
            </li>
          ))}
        </ul>
      )}
    </section></Card>
  );
}
