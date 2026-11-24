"use client";

import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { focusRing } from "@/components/bureau/fields";
import { Card } from "@/components/ui/Card";
import { btnDanger, btnPrimary, btnSecondary } from "@/components/moderation/ui";
import { ACCESS_LEVELS, HUB_MODULES, type AccessLevel } from "@/lib/hub/modules";
import { ACTION_LABEL, call, formatDate, type AdminUser, type AuditLine, type Rights } from "./api";


const LEVEL_LABEL: Record<AccessLevel, string> = { none: "Aucun", read: "Lecture", write: "Écriture" };
const card = "!p-4 sm:!p-6";
const input = `mt-1 min-h-12 block w-full rounded-xl border border-ink-subtle/60 bg-surface px-3.5 py-2.5 text-base text-ink ${focusRing}`;

const emptyRights = (): Rights => Object.fromEntries(HUB_MODULES.map((m) => [m.id, "none"])) as Rights;
const suggestIdentifier = (name: string) =>
  name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().split(/\s+/)[0]?.replace(/[^a-z0-9-]/g, "") ?? "";

type Secret = { who: string; password: string; kind: "création" | "réinitialisation" };

/** Console des comptes ; la coquille (page serveur) garantit session et rôle admin. */
export function HubAdminApp({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [secret, setSecret] = useState<Secret | null>(null);

  const reload = useCallback(async () => {
    try {
      setUsers((await call<{ users: AdminUser[] }>("/api/admin/users")).users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, []);
  useEffect(() => void reload(), [reload]);

  async function act(fn: () => Promise<void>, ok: string) {
    setError("");
    setNotice("");
    try {
      await fn();
      setNotice(ok);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    }
  }

  return (
    <div className="space-y-6">
      <div aria-live="polite">
        {error && <p role="alert" className="rounded-xl bg-tuile-pale p-3 font-medium text-tuile">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-pre-pale p-3 font-medium text-moss-dark">{notice}</p>}
      </div>
      {secret && <SecretCard secret={secret} onClose={() => setSecret(null)} />}
      <CreateForm
        onCreated={(u, pw) => {
          setSecret({ who: `${u.displayName} (${u.identifier})`, password: pw, kind: "création" });
          setNotice("Compte créé.");
          void reload();
        }}
        onError={setError}
      />
      <section aria-labelledby="comptes" className="space-y-4">
        <h2 id="comptes" className="font-display text-2xl font-bold text-moss-dark">Comptes ({users.length})</h2>
        {users.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            self={u.id === selfId}
            onSave={(patch) => act(() => call(`/api/admin/users/${u.id}`, "PATCH", patch), "Modifications enregistrées.")}
            onActive={(active) => act(() => call(`/api/admin/users/${u.id}/active`, "POST", { active }), active ? "Compte réactivé." : "Compte désactivé.")}
            onReset={() =>
              act(async () => {
                const r = await call<{ temporaryPassword: string }>(`/api/admin/users/${u.id}/reset-password`, "POST", {});
                setSecret({ who: `${u.displayName} (${u.identifier})`, password: r.temporaryPassword, kind: "réinitialisation" });
              }, "Mot de passe réinitialisé.")
            }
          />
        ))}
      </section>
      <AuditPanel users={users} />
    </div>
  );
}

function SecretCard({ secret, onClose }: { secret: Secret; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className={`${card} border-2 !border-moss`}>
      <h2 className="font-display text-xl font-bold text-moss-dark">Mot de passe provisoire — {secret.kind}</h2>
      <p className="mt-1">Pour {secret.who}. <strong>Il ne sera plus jamais affiché</strong> : copiez-le ou imprimez-le maintenant. La personne devra le changer à sa première connexion.</p>
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

function CreateForm({ onCreated, onError }: { onCreated: (u: AdminUser, pw: string) => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [touched, setTouched] = useState(false);
  const [role, setRole] = useState<"admin" | "membre">("membre");
  const [rights, setRights] = useState<Rights>(emptyRights());
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    onError("");
    try {
      const r = await call<{ user: AdminUser; temporaryPassword: string }>("/api/admin/users", "POST", {
        displayName, identifier: identifier || suggestIdentifier(displayName), role, rights,
      });
      onCreated(r.user, r.temporaryPassword);
      setDisplayName(""); setIdentifier(""); setTouched(false); setRole("membre"); setRights(emptyRights()); setOpen(false);
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
      <label htmlFor={`${id}-r`} className="mt-4 block font-semibold">Rôle</label>
      <select id={`${id}-r`} className={input} value={role} onChange={(e) => setRole(e.target.value as "admin" | "membre")}>
        <option value="membre">Membre</option>
        <option value="admin">Administrateur (tous les droits)</option>
      </select>
      <h3 className="mt-5 font-semibold">Droits par module</h3>
      {role === "admin" ? <p className="text-ink-muted">Un administrateur a l&apos;écriture partout.</p> : <RightsGrid name="new" rights={rights} onChange={setRights} />}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="submit" className={btnPrimary}>Créer le compte</button>
        <button type="button" className={btnSecondary} onClick={() => setOpen(false)}>Annuler</button>
      </div>
    </form></Card>
  );
}

function UserCard({ user, self, onSave, onActive, onReset }: {
  user: AdminUser; self: boolean;
  onSave: (p: { role?: string; rights?: Rights; displayName?: string }) => void;
  onActive: (a: boolean) => void; onReset: () => void;
}) {
  const [rights, setRights] = useState<Rights>(user.rights);
  const [role, setRole] = useState(user.role);
  const dirty = role !== user.role || JSON.stringify(rights) !== JSON.stringify(user.rights);
  useEffect(() => { setRights(user.rights); setRole(user.role); }, [user]);

  const [pending, setPending] = useState<{ msg: string; fn: () => void } | null>(null);
  const confirmThen = (msg: string, fn: () => void) => () => setPending({ msg, fn });
  return (
    <Card className={`${card} ${user.active ? "" : "opacity-80"}`}><article aria-label={user.displayName}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-xl font-bold">{user.displayName}{self && " (vous)"}</h3>
        <span className={`rounded-full px-3 py-1 text-sm font-semibold ${user.active ? "bg-pre-pale text-moss-dark" : "bg-tuile-pale text-tuile"}`}>
          {user.active ? "Actif" : "Désactivé"}
        </span>
      </div>
      <p className="text-ink-muted">
        Identifiant : <strong>{user.identifier}</strong> · Dernière connexion : {formatDate(user.lastLogin)}
        {user.mustChangePassword && " · mot de passe provisoire non changé"}
      </p>
      <div className="mt-3">
        <label className="font-semibold">Rôle{" "}
          <select className={`${input} !mt-1 sm:w-auto`} value={role} disabled={self} onChange={(e) => setRole(e.target.value as "admin" | "membre")}>
            <option value="membre">Membre</option>
            <option value="admin">Administrateur</option>
          </select>
        </label>
      </div>
      <h4 className="mt-4 font-semibold">Droits par module</h4>
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
          onClick={confirmThen(`Enregistrer le rôle et les droits de ${user.displayName} ?`, () => onSave({ role, rights }))}>
          Enregistrer les droits
        </button>
        {!self && (
          <>
            <button type="button" className={btnSecondary}
              onClick={confirmThen(`Réinitialiser le mot de passe de ${user.displayName} ? L'ancien cessera de fonctionner et ses sessions seront fermées.`, onReset)}>
              Réinitialiser le mot de passe
            </button>
            <button type="button" className={user.active ? btnDanger : btnSecondary}
              onClick={confirmThen(user.active ? `Désactiver le compte de ${user.displayName} ? Sa session sera fermée.` : `Réactiver le compte de ${user.displayName} ?`, () => onActive(!user.active))}>
              {user.active ? "Désactiver" : "Réactiver"}
            </button>
          </>
        )}
      </div>
    </article></Card>
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
