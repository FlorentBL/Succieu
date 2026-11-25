import assert from "node:assert/strict";
import { test } from "node:test";
import { categorySummary, displayCategory, groupByCategory, isHubCategory, type HubCategory } from "./categories";

const u = (displayName: string, role = "membre", category?: HubCategory) => ({ displayName, role, category });

test("catégorie affichée : admin prime, absente = conseil", () => {
  assert.equal(displayCategory(u("A", "admin", "bureau")), "admin");
  assert.equal(displayCategory(u("A")), "conseil");
  assert.equal(displayCategory(u("A", "membre", "secretariat")), "secretariat");
});

test("validation stricte des catégories", () => {
  assert.ok(isHubCategory("bureau"));
  for (const bad of ["admin", "Bureau", "", null, undefined, 3]) assert.equal(isHubCategory(bad), false);
});

test("groupement : ordre Admin, Bureau, Conseil, Secrétariat, tri alphabétique, groupes vides omis", () => {
  const g = groupByCategory([
    u("Zoé", "membre", "conseil"), u("Émile", "membre", "bureau"), u("Alix"), u("Boris", "admin"),
    u("Claire", "membre", "secretariat"), u("Adam", "membre", "bureau"),
  ]);
  assert.deepEqual(g.map((x) => x.category), ["admin", "bureau", "conseil", "secretariat"]);
  assert.deepEqual(g[1].users.map((x) => x.displayName), ["Adam", "Émile"]);
  assert.deepEqual(g[2].users.map((x) => x.displayName), ["Alix", "Zoé"]);
  assert.deepEqual(groupByCategory([u("Alix")]).map((x) => x.category), ["conseil"]);
});

test("résumé", () => {
  assert.equal(categorySummary([u("A", "admin"), u("B", "membre", "bureau"), u("C")]), "3 comptes · 1 admin · 1 bureau · 1 conseil");
  assert.equal(categorySummary([u("A")]), "1 compte · 1 conseil");
});
