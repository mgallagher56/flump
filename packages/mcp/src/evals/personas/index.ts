import { LIABILITY_CATEGORIES, type Persona } from "../types.js";
import { emptyNewUser } from "./empty-new-user.js";
import { highEarnerBonus } from "./high-earner-bonus.js";
import { landlordSection24 } from "./landlord-section-24.js";
import { mortgageIsa } from "./mortgage-isa.js";
import { renterCreditCard } from "./renter-credit-card.js";

export { emptyNewUser, highEarnerBonus, landlordSection24, mortgageIsa, renterCreditCard };

export const PERSONAS: readonly Persona[] = [
  emptyNewUser,
  renterCreditCard,
  mortgageIsa,
  highEarnerBonus,
  landlordSection24,
];

export function getPersona(id: string): Persona {
  const persona = PERSONAS.find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown persona: ${id}`);
  return persona;
}

/** Ground-truth figures derived from the rows, used as expected values in golden tasks. */
export function personaFacts(persona: Persona) {
  const isLiability = (c: string) => (LIABILITY_CATEGORIES as readonly string[]).includes(c);
  const assetsGbp = persona.accounts
    .filter((a) => !isLiability(a.category))
    .reduce((sum, a) => sum + a.balanceGbp, 0);
  const liabilitiesGbp = persona.accounts
    .filter((a) => isLiability(a.category))
    .reduce((sum, a) => sum + a.balanceGbp, 0);
  const budget = persona.budget;
  return {
    assetsGbp,
    liabilitiesGbp,
    netWorthGbp: assetsGbp - liabilitiesGbp,
    monthlySurplusGbp: budget
      ? budget.monthlyIncomeGbp - budget.monthlyEssentialsGbp - budget.monthlyDiscretionaryGbp
      : undefined,
  };
}
