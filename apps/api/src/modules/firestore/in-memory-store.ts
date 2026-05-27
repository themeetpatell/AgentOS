/**
 * Minimal in-memory shim that implements the subset of the Firestore API
 * the app actually uses. Activated in local-dev mode so the platform runs
 * without a real Firebase project.
 *
 * Data lives in process memory only — restart loses everything. Acceptable
 * for a single developer running `npm run dev` to try the agents.
 */

type FilterOp = '==' | 'in' | '>=' | '<' | '>' | '<=' | '!=';

interface Filter {
  readonly field: string;
  readonly op: FilterOp;
  readonly value: unknown;
}

interface OrderBy {
  readonly field: string;
  readonly dir: 'asc' | 'desc';
}

interface DocSnapshot<T = Record<string, unknown>> {
  readonly id: string;
  readonly exists: boolean;
  data(): T | undefined;
}

interface QuerySnapshot<T = Record<string, unknown>> {
  readonly empty: boolean;
  readonly docs: ReadonlyArray<DocSnapshot<T>>;
}

class InMemoryDocRef<T = Record<string, unknown>> {
  constructor(
    private readonly collection: InMemoryCollection<T>,
    public readonly id: string,
  ) {}

  async get(): Promise<DocSnapshot<T>> {
    const value = this.collection.docs.get(this.id);
    return {
      id: this.id,
      exists: value !== undefined,
      data: () => value,
    };
  }

  async set(data: Partial<T>, opts?: { merge?: boolean }): Promise<void> {
    const existing = this.collection.docs.get(this.id);
    if (opts?.merge && existing) {
      this.collection.docs.set(this.id, { ...existing, ...data } as T);
    } else {
      this.collection.docs.set(this.id, { ...(data as T) });
    }
  }
}

class InMemoryQuery<T = Record<string, unknown>> {
  constructor(
    private readonly collection: InMemoryCollection<T>,
    private readonly filters: ReadonlyArray<Filter> = [],
    private readonly orderBys: ReadonlyArray<OrderBy> = [],
    private readonly limitN?: number,
  ) {}

  where(field: string, op: FilterOp, value: unknown): InMemoryQuery<T> {
    return new InMemoryQuery(
      this.collection,
      [...this.filters, { field, op, value }],
      this.orderBys,
      this.limitN,
    );
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): InMemoryQuery<T> {
    return new InMemoryQuery(
      this.collection,
      this.filters,
      [...this.orderBys, { field, dir }],
      this.limitN,
    );
  }

  limit(n: number): InMemoryQuery<T> {
    return new InMemoryQuery(this.collection, this.filters, this.orderBys, n);
  }

  async get(): Promise<QuerySnapshot<T>> {
    let rows = Array.from(this.collection.docs.entries()).map(([id, data]) => ({
      id,
      data,
    }));

    for (const f of this.filters) {
      rows = rows.filter((r) => matches(r.data, f));
    }

    for (const ob of [...this.orderBys].reverse()) {
      rows.sort((a, b) => {
        const av = (a.data as Record<string, unknown>)[ob.field];
        const bv = (b.data as Record<string, unknown>)[ob.field];
        const cmp = compare(av, bv);
        return ob.dir === 'asc' ? cmp : -cmp;
      });
    }

    if (this.limitN != null) {
      rows = rows.slice(0, this.limitN);
    }

    return {
      empty: rows.length === 0,
      docs: rows.map((r) => ({
        id: r.id,
        exists: true,
        data: () => r.data,
      })),
    };
  }
}

class InMemoryCollection<T = Record<string, unknown>> {
  readonly docs = new Map<string, T>();

  doc(id: string): InMemoryDocRef<T> {
    return new InMemoryDocRef(this, id);
  }

  where(field: string, op: FilterOp, value: unknown): InMemoryQuery<T> {
    return new InMemoryQuery(this).where(field, op, value);
  }

  orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): InMemoryQuery<T> {
    return new InMemoryQuery(this).orderBy(field, dir);
  }

  limit(n: number): InMemoryQuery<T> {
    return new InMemoryQuery(this).limit(n);
  }
}

export class InMemoryFirestore {
  private readonly collections = new Map<string, InMemoryCollection>();

  collection<T = Record<string, unknown>>(name: string): InMemoryCollection<T> {
    let c = this.collections.get(name);
    if (!c) {
      c = new InMemoryCollection<T>();
      this.collections.set(name, c as InMemoryCollection);
    }
    return c as InMemoryCollection<T>;
  }

  // FirestoreService calls `.settings({ ignoreUndefinedProperties: true })` — no-op here.
  settings(_opts: Record<string, unknown>): void {}
}

function matches(row: Record<string, unknown>, f: Filter): boolean {
  const v = row[f.field];
  switch (f.op) {
    case '==':
      return v === f.value;
    case '!=':
      return v !== f.value;
    case 'in':
      return Array.isArray(f.value) && (f.value as unknown[]).includes(v);
    case '>=':
      return v != null && (v as never) >= (f.value as never);
    case '>':
      return v != null && (v as never) > (f.value as never);
    case '<=':
      return v != null && (v as never) <= (f.value as never);
    case '<':
      return v != null && (v as never) < (f.value as never);
    default:
      return false;
  }
}

function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}
