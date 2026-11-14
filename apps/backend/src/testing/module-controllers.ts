type Ctor = new (...args: never[]) => unknown;

/**
 * Every controller registered under `root`, walking its imported modules (BE-13: controllers live
 * in one Nest module per domain, not on AppModule itself). Dynamic modules (`forRoot` and so on)
 * are followed through their `module` and `imports`. Each controller appears once, in import order.
 */
export function moduleControllers(root: Ctor): Ctor[] {
  const seen = new Set<unknown>();
  const out: Ctor[] = [];
  const visit = (entry: unknown): void => {
    if (!entry || seen.has(entry)) return;
    seen.add(entry);
    const dynamic =
      typeof entry === "object" ? (entry as { module?: unknown; imports?: unknown[] }) : null;
    const moduleClass = dynamic ? dynamic.module : entry;
    if (typeof moduleClass !== "function") return;
    const imports: unknown[] = [
      ...(Reflect.getMetadata("imports", moduleClass) ?? []),
      ...(dynamic?.imports ?? []),
    ];
    for (const controller of (Reflect.getMetadata("controllers", moduleClass) ?? []) as Ctor[]) {
      if (!out.includes(controller)) out.push(controller);
    }
    for (const imported of imports) visit(imported);
  };
  visit(root);
  return out;
}
