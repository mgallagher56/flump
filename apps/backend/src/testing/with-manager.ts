/**
 * Gives a repository test double a TypeORM-style `manager` whose `transaction` runs the
 * work at once and hands back doubles from `getRepository`. Services refuse to write
 * without a manager, so unit-test doubles need one.
 *
 * `byEntity` maps an entity class name to the double to return; anything else gets `repo`.
 */
export function withManager<T extends object>(
  repo: T,
  byEntity: Record<string, object> = {},
): T & { manager: { transaction: <R>(work: (em: unknown) => Promise<R>) => Promise<R> } } {
  const em = {
    getRepository: (entity: { name: string }) => byEntity[entity.name] ?? repo,
  };
  return Object.assign(repo, {
    manager: { transaction: <R>(work: (em: unknown) => Promise<R>) => work(em) },
  });
}
