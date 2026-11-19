import { vi } from "vitest";
import { profileFixture } from "~/test/fixtures/contractResponses";

/**
 * Tests: a stand-in profile backend for hooks rendered in `withRootLoader`. The root loader reads
 * `state.saved`; each fetch returns the next queued answer, and a 200 answer carrying a profile
 * (or a reset's `profile`) becomes what the next reload of saved data reads (audit slice 8).
 */
export function profileBackend(initial: Record<string, unknown> = {}) {
  const state = { saved: { ...profileFixture, ...initial } as Record<string, unknown> };
  const answers: (() => Response | Promise<Response>)[] = [];
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => {
    const answer = answers.shift();
    if (!answer) throw new Error("profileBackend: no answer queued");
    const res = await answer();
    if (res.status === 200) {
      const body = await res
        .clone()
        .json()
        .catch(() => undefined);
      const profile = body?.profile ?? body;
      if (profile?.id) state.saved = profile;
    }
    return res;
  });
  /** Queue an answer: a JSON body with a status, or a function returning a Response or throwing. */
  const answer = (body: unknown, status = 200) =>
    answers.push(() => new Response(body === undefined ? null : JSON.stringify(body), { status }));
  const answerWith = (make: () => Response | Promise<Response>) => answers.push(make);
  const sentIfMatch = (call: number): string | undefined =>
    (fetchMock.mock.calls[call]?.[1]?.headers as Record<string, string> | undefined)?.["If-Match"];
  return { state, fetchMock, answer, answerWith, sentIfMatch };
}
