import { ForbiddenException, ServiceUnavailableException, SetMetadata } from "@nestjs/common";

/**
 * Port the AuthGuard uses to refuse callers who have not agreed to the terms of use in force (terms
 * acceptance). Provided by the profile module (TermsAcceptanceService), so the auth layer does not
 * depend on the database. A read that fails must throw: the guard answers 503, never a pass.
 */
export interface TermsAcceptanceCheck {
  hasAgreedToTermsInForce(userId: string, now?: Date): Promise<boolean>;
}

export const TERMS_ACCEPTANCE_CHECK = "TERMS_ACCEPTANCE_CHECK";

export const ALLOW_WITHOUT_TERMS = "flump:allow-without-terms";

/**
 * Lets a signed-in caller who has not agreed to the terms in force through the AuthGuard. Only for
 * what a person who does not agree must still be able to do: read and record the agreement, get a
 * copy of their data, delete their account, and redeem an invite (which comes before the terms in
 * the sign-up flow). `reason` says why, and test/authz/route-coverage.spec.ts lists every use, so
 * the list cannot grow without a test changing.
 */
export const AllowWithoutTerms = (reason: string) => SetMetadata(ALLOW_WITHOUT_TERMS, reason);

/** The refusal for a caller who has not agreed. The web and mobile apps show the terms on it. */
export const termsNotAcceptedException = () =>
  new ForbiddenException({
    statusCode: 403,
    error: "terms_not_accepted",
    message: "Agree to the terms of use in Flump to carry on.",
  });

/** The terms check could not be made (database down, or the check is not wired): fail closed. */
export const termsCheckUnavailableException = () =>
  new ServiceUnavailableException({
    code: "service_unavailable",
    message: "The service is busy. Please try again shortly.",
  });
