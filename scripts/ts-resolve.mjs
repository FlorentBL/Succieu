// Permet à `node --test` d'exécuter les .ts de lib/ : résout les imports
// relatifs sans extension vers .ts (les sources sont aussi compilées par Next).
import { register } from "node:module";
register(new URL("./ts-resolve-hooks.mjs", import.meta.url));
