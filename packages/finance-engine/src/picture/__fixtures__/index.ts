/**
 * Persona fixtures for the financial picture (E23 section 9.1). Data only. Reused by the engine
 * persona test, the web consistency harness and the MCP consistency test, through the
 * "@flump/finance-engine/testing" subpath. Deliberately not exported from src/index.ts.
 */
import { danExpected, danTaxYearsExpected } from "./expected/dan.js";
import { debtStressedExpected, debtStressedItemsExpected } from "./expected/debt-stressed.js";
import { garethContributionsExpected, garethExpected } from "./expected/gareth.js";
import { heavyExpected, heavyHistoryExpected, heavyTaxYearsExpected } from "./expected/heavy.js";
import { newUserExpected } from "./expected/new-user.js";
import { priyaExpected, priyaTrapExpected } from "./expected/priya.js";
import { samExpected } from "./expected/sam.js";
import { scottishExpected } from "./expected/scottish.js";
import { trapEdgeExpected, trapEdgeTrapExpected } from "./expected/trap-edge.js";
import { dan } from "./personas/dan.js";
import { debtStressed } from "./personas/debt-stressed.js";
import { gareth } from "./personas/gareth.js";
import { heavy } from "./personas/heavy.js";
import { newUser } from "./personas/new-user.js";
import { priya } from "./personas/priya.js";
import { sam } from "./personas/sam.js";
import { scottish } from "./personas/scottish.js";
import { trapEdge, trapEdgeVariants } from "./personas/trap-edge.js";
import type { PersonaExpected, PersonaFixture } from "./types.js";

export * from "./builders.js";
export type * from "./types.js";
export {
  dan,
  danExpected,
  danTaxYearsExpected,
  debtStressed,
  debtStressedExpected,
  debtStressedItemsExpected,
  gareth,
  garethContributionsExpected,
  garethExpected,
  heavy,
  heavyExpected,
  heavyHistoryExpected,
  heavyTaxYearsExpected,
  newUser,
  newUserExpected,
  priya,
  priyaExpected,
  priyaTrapExpected,
  sam,
  samExpected,
  scottish,
  scottishExpected,
  trapEdge,
  trapEdgeExpected,
  trapEdgeTrapExpected,
  trapEdgeVariants,
};

export type PersonaName =
  | "sam"
  | "priya"
  | "trapEdge"
  | "scottish"
  | "gareth"
  | "dan"
  | "debtStressed"
  | "newUser"
  | "heavy";

export const PERSONAS: Record<PersonaName, { fixture: PersonaFixture; expected: PersonaExpected }> =
  {
    sam: { fixture: sam, expected: samExpected },
    priya: { fixture: priya, expected: priyaExpected },
    trapEdge: { fixture: trapEdge, expected: trapEdgeExpected },
    scottish: { fixture: scottish, expected: scottishExpected },
    gareth: { fixture: gareth, expected: garethExpected },
    dan: { fixture: dan, expected: danExpected },
    debtStressed: { fixture: debtStressed, expected: debtStressedExpected },
    newUser: { fixture: newUser, expected: newUserExpected },
    heavy: { fixture: heavy, expected: heavyExpected },
  };
