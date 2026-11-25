"use client";

import { Fragment, useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { focusRing } from "@/components/bureau/fields";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/salle-des-fetes/Modal";
import { btnDanger, btnPrimary, btnSecondary } from "@/components/moderation/ui";
import { CATEGORY_LABEL, HUB_CATEGORIES, categorySummary, displayCategory, groupByCategory, type DisplayCategory, type HubCategory } from "@/lib/hub/categories";
import { isCustomized, membersOf, planApply, type ApplyPlan, type GroupTemplates } from "@/lib/hub/group-rights";
import { ACCESS_LEVELS, HUB_MODULES, type AccessLevel } from "@/lib/hub/modules";
import { noticeText } from "@/lib/hub/notice";
import { ACTION_LABEL, call, formatDate, type AdminUser, type AuditLine, type DriveOutcome, type DriveRow, type Rights } from "./api";

const LEVEL_LABEL: Record<AccessLevel, string> = { none: "Aucun", read: "Lecture", write: "Écriture" };
const card = "!p-4 sm:!p-6";
const input = `mt-1 min-h-12 block w-full rounded-xl border border-ink-subtle/60 bg-surface px-3.5 py-2.5 text-base text-ink ${focusRing}`;
const th = "px-3 py-2 text-left text-sm font-semibold text-ink-muted";
const td = "px-3 py-1.5 align-middle";

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

const SHORT_MODULE: Record<string, string> = { "actus-agenda": "Actualités", "espace-bureau": "Espace Bureau", "salle-des-fetes": "Salle des fêtes", documents: "Documents" };

const iconProps = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false } as const;
const PencilIcon = () => <svg {...iconProps}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
const EyeIcon = () => <svg {...iconProps}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;

const chip = "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold";

/** Pastille de droit : icône + mot, jamais la couleur seule. */
function RightChip({ level, label, all }: { level: AccessLevel; label: string; all?: boolean }) {
  const text = all ? "Tout" : LEVEL_LABEL[level];
  const aria = `${label} : ${all ? "écriture (administrateur)" : LEVEL_LABEL[level].toLowerCase()}`;
  if (level === "none") return <span className="text-ink-muted" role="img" aria-label={aria} title={aria}>—</span>;
  return (
    <span role="img" aria-label={aria} title={aria} className={`${chip} ${level === "write" ? "bg-pre-pale text-moss-dark" : "bg-canvas text-ink ring-1 ring-inset ring-border-subtle"}`}>
      {level === "write" ? <PencilIcon /> : <EyeIcon />}
      <span aria-hidden>{text}</span>
    </span>
  );
}

/** Pastille de catégorie : mot + icône, jamais la couleur seule. */
function CategoryChip({ category }: { category: DisplayCategory }) {
  const tone = category === "admin" ? "bg-moss-dark text-white" : category === "bureau" ? "bg-pre-pale text-moss-dark" : "bg-canvas text-ink ring-1 ring-inset ring-border-subtle";
  const icon = { admin: "★", bureau: "◆", conseil: "●", secretariat: "✎" }[category];
  return <span className={`${chip} ${tone}`}><span aria-hidden>{icon}</span>{CATEGORY_LABEL[category]}</span>;
}

function CategorySelect({ id, value, onChange, className }: { id?: string; value: HubCategory; onChange: (c: HubCategory) => void; className: string }) {
  return (
    <select id={id} className={className} value={value} onChange={(e) => onChange(e.target.value as HubCategory)}>
      {HUB_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
    </select>
  );
}

function driveState(u: AdminUser, enabled: boolean): { label: string; tone: string; hint: string } {
  if (u.driveLogin === null) return { label: "Pas de drive", tone: "text-ink-muted", hint: "Ce compte n'a pas de drive" };
  if (!enabled) return { label: "Désactivée", tone: "text-ink-muted", hint: "Synchronisation avec le drive désactivée" };
  if (u.driveSync?.error) return { label: "Erreur", tone: "text-tuile", hint: `Erreur de synchro : ${u.driveSync.error}` };
  if (u.driveSync?.at) return { label: "OK", tone: "text-moss-dark", hint: `Synchronisé le ${formatDate(u.driveSync.at)}` };
  return { label: "À faire", tone: "text-ink-muted", hint: "Pas encore synchronisé" };
}

function shortDate(iso: string | null): string {
  if (!iso) return "jamais";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso)).replace(",", "");
}

/** Console des comptes ; la coquille (page serveur) garantit session et rôle admin. */
export function HubAdminApp({ selfId }: { selfId: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [driveEnabled, setDriveEnabled] = useState(false);
  const [templates, setTemplates] = useState<GroupTemplates | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<HubCategory[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [secret, setSecret] = useState<Secret | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const secretRef = useRef<HTMLDivElement>(null);

  const closeEdit = useCallback(() => {
    setEditing((id) => {
      if (id) setTimeout(() => document.getElementById(`modifier-${id}`)?.focus(), 0);
      return null;
    });
  }, []);

  const reload = useCallback(async () => {
    try {
      const r = await call<{ users: AdminUser[]; driveSync: boolean }>("/api/admin/users");
      setUsers(r.users);
      setDriveEnabled(r.driveSync);
      const g = await call<{ templates: GroupTemplates; saved: HubCategory[] }>("/api/admin/groups");
      setTemplates(g.templates);
      setSavedTemplates(g.saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setLoaded(true);
    }
  }, []);
  useEffect(() => void reload(), [reload]);
  useEffect(() => {
    if (secret) secretRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [secret]);

  async function act(fn: () => Promise<string | void>, ok: string) {
    setError("");
    setNotice("");
    try {
      const msg: unknown = await fn();
      setNotice(noticeText(msg, ok));
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
      await reload();
    }
  }

  const selected = users.find((u) => u.id === editing) ?? null;

  const messages = (
    <div aria-live="polite">
      {error && <p role="alert" className="rounded-xl bg-tuile-pale p-3 font-medium text-tuile">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-pre-pale p-3 font-medium text-moss-dark">{notice}</p>}
    </div>
  );

  return (
    <div className="space-y-6">
      {!selected && messages}
      <p className={`rounded-xl p-3 ${driveEnabled ? "bg-pre-pale text-moss-dark" : "bg-canvas text-ink-muted"}`} data-testid="drive-banner">
        {driveEnabled
          ? "Drive synchronisé : le mot de passe attribué ici est le même sur le site et sur le drive."
          : "Synchronisation avec le drive désactivée (variables DRIVE_URL, DRIVE_ADMIN_USER et DRIVE_ADMIN_PASSWORD absentes) : les comptes du hub fonctionnent seuls."}
      </p>
      {secret && <div ref={secretRef} className="scroll-mt-24"><SecretCard secret={secret} onClose={() => setSecret(null)} /></div>}
      <CreateForm
        driveEnabled={driveEnabled}
        templates={templates}
        onCreated={(u, pw, drive) => {
          setSecret({ who: `${u.displayName} (${u.identifier})`, password: pw, kind: "création", drive });
          setNotice("Compte créé.");
          void reload();
        }}
        onError={setError}
      />
      {templates && (
        <GroupsPanel users={users} templates={templates} saved={savedTemplates} act={act} onError={setError} />
      )}
      <section aria-labelledby="comptes" className="space-y-3">
        <h2 id="comptes" className="font-display text-2xl font-bold text-moss-dark">{loaded ? `Comptes (${users.length})` : "Chargement des comptes…"}</h2>
        <p className="text-ink-muted" data-testid="accounts-summary">
          {categorySummary(users)} · {users.filter((u) => u.active).length} actif{users.filter((u) => u.active).length > 1 ? "s" : ""}
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted" data-testid="rights-legend">
          <span className="inline-flex items-center gap-1"><PencilIcon /> Écriture</span>
          <span className="inline-flex items-center gap-1"><EyeIcon /> Lecture</span>
          <span className="inline-flex items-center gap-1">— Aucun accès</span>
        </p>
        <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-surface">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead className="border-b border-border-subtle bg-canvas">
              <tr>
                <th scope="col" className={`${th} sticky left-0 z-10 bg-canvas`}>Nom</th>
                <th scope="col" className={th}>Catégorie</th>
                <th scope="col" className={th}>Actif</th>
                {HUB_MODULES.map((m) => <th key={m.id} scope="col" className={`${th} text-center`}>{SHORT_MODULE[m.id] ?? m.label}</th>)}
                <th scope="col" className={th}>Drive</th>
                <th scope="col" className={th}>Connexion</th>
                <th scope="col" className={th}><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {groupByCategory(users).map((g) => (
              <Fragment key={g.category}>
              <tr className="bg-canvas" data-testid={`group-${g.category}`}>
                <th scope="colgroup" colSpan={HUB_MODULES.length + 6} className="px-3 py-1.5 text-left text-sm font-bold text-moss-dark">{CATEGORY_LABEL[g.category]} · {g.users.length}</th>
              </tr>
              {g.users.map((u) => {
                const d = driveState(u, driveEnabled);
                const rowBg = editing === u.id ? "bg-pre-pale" : "bg-surface";
                return (
                  <tr key={u.id} className={`${u.active ? "" : "opacity-70"} ${editing === u.id ? "bg-pre-pale" : ""}`}>
                    <th scope="row" className={`${td} sticky left-0 z-10 text-left ${rowBg}`}>
                      <span className="block font-bold">{u.displayName}{u.id === selfId && " (vous)"}</span>
                      <span className="block text-xs font-normal text-ink-muted">{u.identifier}{u.driveLogin !== null && u.driveLogin !== u.identifier && ` · drive : ${u.driveLogin}`}</span>
                      {templates && isCustomized(u, templates) && (
                        <span className={`${chip} mt-0.5 bg-canvas font-medium text-ink-muted ring-1 ring-inset ring-border-subtle`} data-testid="custom-mark" title="Droits différents du modèle de la catégorie">personnalisé</span>
                      )}
                    </th>
                    <td className={td}>
                      <CategoryChip category={displayCategory(u)} />
                    </td>
                    <td className={td}>
                      <span className={`${chip} ${u.active ? "bg-pre-pale text-moss-dark" : "bg-tuile-pale text-tuile"}`}>{u.active ? "Oui" : "Non"}</span>
                    </td>
                    {HUB_MODULES.map((m) => (
                      <td key={m.id} className={`${td} text-center`}>
                        <RightChip level={u.role === "admin" ? "write" : u.rights[m.id]} all={u.role === "admin"} label={SHORT_MODULE[m.id] ?? m.label} />
                      </td>
                    ))}
                    <td className={`${td} font-semibold ${d.tone}`} title={d.hint}><span aria-label={d.hint}>{d.label}</span></td>
                    <td className={`${td} whitespace-nowrap`}>{shortDate(u.lastLogin)}</td>
                    <td className={td}>
                      <button type="button" id={`modifier-${u.id}`} className={`${btnSecondary} !min-h-9 !px-3 !py-1 !text-sm`} aria-haspopup="dialog" aria-expanded={editing === u.id} aria-label={`Modifier ${u.displayName}`}
                        onClick={() => setEditing(u.id)}>
                        Modifier
                      </button>
                    </td>
                  </tr>
                );
              })}
              </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <Modal labelledBy="hub-edit-titre" onClose={closeEdit}>
        {messages}
        <EditPanel
          key={selected.id}
          user={selected}
          self={selected.id === selfId}
          driveEnabled={driveEnabled}
          onClose={closeEdit}
          onSave={(patch) => act(async () => { await call<unknown>(`/api/admin/users/${selected.id}`, "PATCH", patch); }, "Modifications enregistrées.")}
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
              closeEdit();
              return "Mot de passe réinitialisé.";
            }, "")
          }
        />
        </Modal>
      )}
      {driveEnabled && <DrivePanel users={users} onChanged={reload} />}
      <AuditPanel users={users} />
    </div>
  );
}

const OF_CATEGORY: Record<HubCategory, string> = { bureau: "du Bureau", conseil: "du Conseil", secretariat: "du Secrétariat" };

function PlanPreview({ plan }: { plan: ApplyPlan }) {
  const n = plan.unchanged.length;
  return (
    <div data-testid="apply-preview">
      {plan.changed.length === 0 ? <p>Aucun changement : tous les comptes sont déjà conformes.</p> : (
        <ul className="list-disc space-y-1 pl-5">
          {plan.changed.map((p) => (
            <li key={p.id}><strong>{p.displayName}</strong> : {p.changes.map((c) => `${SHORT_MODULE[c.module] ?? c.module} ${LEVEL_LABEL[c.from]} → ${LEVEL_LABEL[c.to]}`).join(", ")}</li>
          ))}
        </ul>
      )}
      {n > 0 && plan.changed.length > 0 && <p className="mt-2 text-ink-muted">{n} compte{n > 1 ? "s" : ""} déjà conforme{n > 1 ? "s" : ""}.</p>}
    </div>
  );
}

/** Une ligne par catégorie : modèle de droits, « Enregistrer », « Appliquer à tous les membres ». */
function GroupRow({ category, users, template, saved, act, onError }: {
  category: HubCategory; users: AdminUser[]; template: Rights; saved: boolean;
  act: (fn: () => Promise<string | void>, ok: string) => Promise<void>; onError: (m: string) => void;
}) {
  const [draft, setDraft] = useState<Rights>(template);
  const [confirming, setConfirming] = useState(false);
  const members = membersOf(users, category);
  const N = members.length;
  const dirty = JSON.stringify(draft) !== JSON.stringify(template);
  const plan = planApply(users, category, template);
  const label = CATEGORY_LABEL[category];
  return (
    <div className="rounded-xl border border-border-subtle p-4" data-testid={`group-row-${category}`}>
      <h3 className="font-display text-lg font-bold text-moss-dark">{label} · {N}</h3>
      {!saved && <p className="text-sm text-ink-muted">Proposition d&apos;après les droits les plus fréquents du groupe (pas encore enregistrée).</p>}
      <div className="mt-2"><RightsGrid name={`grp-${category}`} rights={draft} onChange={(r) => { setDraft(r); setConfirming(false); }} /></div>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" className={btnSecondary} disabled={!dirty && saved}
          onClick={() => void act(async () => { await call("/api/admin/groups", "PUT", { category, rights: draft }); }, `Modèle ${label} enregistré. Il n'a encore été appliqué à personne.`)}>
          Enregistrer le modèle
        </button>
        <button type="button" className={btnPrimary} disabled={N === 0 || dirty || !saved} aria-expanded={confirming} onClick={() => setConfirming(true)}>
          {N === 1 ? `Appliquer au membre ${OF_CATEGORY[category]}` : `Appliquer aux ${N} membres ${OF_CATEGORY[category]}`}
        </button>
      </div>
      {(dirty || !saved) && N > 0 && <p className="mt-2 text-sm text-ink-muted">Enregistrez d&apos;abord le modèle pour pouvoir l&apos;appliquer.</p>}
      {confirming && (
        <div role="alertdialog" aria-label="Confirmation" className="mt-4 rounded-xl border-2 border-moss bg-pre-pale p-4">
          <p className="font-semibold">Appliquer ce modèle à {N} compte{N > 1 ? "s" : ""} {OF_CATEGORY[category]} ? Les administrateurs ne sont jamais modifiés.</p>
          <div className="mt-2"><PlanPreview plan={plan} /></div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button type="button" className={btnPrimary} autoFocus disabled={plan.changed.length === 0}
              onClick={() => {
                setConfirming(false);
                void act(async () => {
                  try {
                    const r = await call<ApplyPlan>("/api/admin/groups/apply", "POST", { category });
                    return `${r.changed.length} compte${r.changed.length > 1 ? "s" : ""} modifié${r.changed.length > 1 ? "s" : ""}, ${r.unchanged.length} déjà conforme${r.unchanged.length > 1 ? "s" : ""}.`;
                  } catch (e) {
                    onError(e instanceof Error ? e.message : "Application impossible.");
                  }
                }, "");
              }}>
              Confirmer
            </button>
            <button type="button" className={btnSecondary} onClick={() => setConfirming(false)}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GroupsPanel({ users, templates, saved, act, onError }: {
  users: AdminUser[]; templates: GroupTemplates; saved: HubCategory[];
  act: (fn: () => Promise<string | void>, ok: string) => Promise<void>; onError: (m: string) => void;
}) {
  return (
    <Card className={card}><section aria-labelledby="groupes" className="space-y-4">
      <h2 id="groupes" className="font-display text-2xl font-bold text-moss-dark">Droits par catégorie</h2>
      <p className="text-ink-muted">Réglez les droits d&apos;une catégorie, enregistrez le modèle, puis appliquez-le à tous ses membres d&apos;un coup. Les droits restent propres à chaque personne : vous pouvez toujours en ajuster un seul avec « Modifier » (le tableau signale alors « personnalisé »). Les administrateurs ne sont jamais touchés ; le drive non plus.</p>
      {HUB_CATEGORIES.map((c) => (
        <GroupRow key={`${c}-${JSON.stringify(templates[c])}-${saved.includes(c)}`} category={c} users={users} template={templates[c]} saved={saved.includes(c)} act={act} onError={onError} />
      ))}
    </section></Card>
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

function CreateForm({ driveEnabled, templates, onCreated, onError }: { driveEnabled: boolean; templates: GroupTemplates | null; onCreated: (u: AdminUser, pw: string, drive: DriveOutcome) => void; onError: (m: string) => void }) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [touched, setTouched] = useState(false);
  const [driveLogin, setDriveLogin] = useState("");
  const [noDrive, setNoDrive] = useState(false);
  const [role, setRole] = useState<"admin" | "membre">("membre");
  const [category, setCategory] = useState<HubCategory>("conseil");
  const [rights, setRights] = useState<Rights>(emptyRights());
  const [pw, setPw] = useState<PasswordChoice>({ passwordMode: "generate" });
  const id = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    onError("");
    try {
      const r = await call<{ user: AdminUser; password: string; drive: DriveOutcome }>("/api/admin/users", "POST", {
        displayName, identifier: identifier || suggestIdentifier(displayName), role, category, rights, ...pw,
        ...(noDrive ? { driveLogin: null } : driveLogin.trim() ? { driveLogin: driveLogin.trim() } : {}),
      });
      onCreated(r.user, r.password, r.drive);
      setDisplayName(""); setIdentifier(""); setTouched(false); setDriveLogin(""); setNoDrive(false); setRole("membre"); setCategory("conseil"); setRights(emptyRights()); setPw({ passwordMode: "generate" }); setOpen(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Création impossible.");
    }
  }

  if (!open) return <button type="button" className={btnPrimary} onClick={() => { setRights(templates ? { ...templates[category] } : emptyRights()); setOpen(true); }}>+ Créer un compte</button>;
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
          <input id={`${id}-d`} className={input} maxLength={64} value={driveLogin} autoCapitalize="none" placeholder={identifier || "identique à l'identifiant"} disabled={noDrive}
            onChange={(e) => setDriveLogin(e.target.value)} />
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={noDrive} onChange={(e) => setNoDrive(e.target.checked)} /> Ce compte n&apos;a pas de drive
          </label>
          <p className="mt-1 text-sm text-ink-muted">Si ce compte existe déjà sur le drive, il est rattaché ; sinon il est créé. Les espaces du drive ne sont jamais modifiés ici.</p>
        </>
      )}
      <label htmlFor={`${id}-r`} className="mt-4 block font-semibold">Rôle</label>
      <select id={`${id}-r`} className={input} value={role} onChange={(e) => setRole(e.target.value as "admin" | "membre")}>
        <option value="membre">Membre</option>
        <option value="admin">Administrateur (tous les droits)</option>
      </select>
      <label htmlFor={`${id}-c`} className="mt-4 block font-semibold">Catégorie</label>
      <CategorySelect id={`${id}-c`} className={input} value={category} onChange={(c) => { setCategory(c); if (templates) setRights({ ...templates[c] }); }} />
      <p className="mt-1 text-sm text-ink-muted">Choisir une catégorie propose les droits du modèle de cette catégorie ; vous pouvez les modifier ci-dessous avant de créer le compte. Un administrateur s&apos;affiche toujours « Admin ».</p>
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
  onSave: (p: { role?: string; category?: HubCategory; rights?: Rights; driveLogin?: string | null }) => void;
  onActive: (a: boolean) => void; onReset: (c: PasswordChoice) => void;
}) {
  const [rights, setRights] = useState<Rights>(user.rights);
  const [role, setRole] = useState(user.role);
  const [category, setCategory] = useState<HubCategory>(user.category ?? "conseil");
  const [driveLogin, setDriveLogin] = useState(user.driveLogin ?? "");
  const [noDrive, setNoDrive] = useState(user.driveLogin === null);
  const [pw, setPw] = useState<PasswordChoice>({ passwordMode: "generate" });
  const [showPw, setShowPw] = useState(false);
  const dirty = role !== user.role || category !== (user.category ?? "conseil") || JSON.stringify(rights) !== JSON.stringify(user.rights) || noDrive !== (user.driveLogin === null) || (!noDrive && driveLogin !== (user.driveLogin ?? ""));
  const [pending, setPending] = useState<{ msg: string; fn: () => void } | null>(null);
  const confirmThen = (msg: string, fn: () => void) => () => setPending({ msg, fn });
  return (
    <section aria-labelledby="hub-edit-titre">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="hub-edit-titre" className="font-display text-xl font-bold text-moss-dark">{user.displayName}{self && " (vous)"} — {user.identifier}</h2>
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
        <label className="font-semibold">Catégorie{" "}
          <CategorySelect className={`${input} !mt-1 sm:w-auto`} value={category} onChange={setCategory} />
        </label>
        {driveEnabled && (
          <div>
            <label className="font-semibold">Identifiant du drive{" "}
              <input className={`${input} !mt-1 sm:w-64`} value={driveLogin} maxLength={64} autoCapitalize="none" disabled={noDrive} placeholder={user.identifier} onChange={(e) => setDriveLogin(e.target.value)} />
            </label>
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={noDrive} onChange={(e) => setNoDrive(e.target.checked)} /> Ce compte n&apos;a pas de drive
            </label>
          </div>
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
          onClick={confirmThen(`Enregistrer les modifications de ${user.displayName} ?`, () => onSave({ role, category, rights, driveLogin: noDrive ? null : driveLogin }))}>
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
    </section>
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
  const [loading, setLoading] = useState(false);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const id = useId();
  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      setRows((await call<{ enabled: boolean; rows: DriveRow[] }>("/api/admin/drive")).rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lecture du drive impossible.");
    } finally {
      setLoading(false);
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
  const unlinked = users.filter((u) => u.driveLogin !== null && !rows?.some((r) => r.hub?.id === u.id && r.drive));
  return (
    <Card className={card}><section aria-labelledby={id}>
      <h2 id={id} className="font-display text-2xl font-bold text-moss-dark">Comptes du drive</h2>
      {loading && <p role="status" className="mt-1 text-ink-muted">Chargement des comptes du drive…</p>}
      <p className="mt-1 text-ink-muted">Comparaison en lecture seule entre le hub et le drive. Les espaces et leurs permissions se gèrent dans le drive, jamais ici.</p>
      <button type="button" className={`${btnSecondary} mt-3`} disabled={loading} onClick={load}>{rows ? "Actualiser la comparaison" : "Comparer avec le drive"}</button>
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
