import "server-only";
import { randomUUID } from "node:crypto";
import type { PaymentMethod } from "./types";

type NewPaymentMethod = Omit<PaymentMethod, "id" | "createdAt">;

/**
 * Persistence boundary for MOCK payment methods. Stores display metadata
 * only — never a full card number or CVV (see ./types.ts).
 *
 * TEMPORARY in-memory implementation, matching the other repositories until
 * the team's ORM lands. Real cards must never be stored here; a production
 * implementation would keep only a provider token.
 */
export interface PaymentMethodRepository {
  findById(id: string): Promise<PaymentMethod | null>;
  findByOwner(ownerUserId: string): Promise<PaymentMethod[]>;
  create(data: NewPaymentMethod): Promise<PaymentMethod>;
  /** Makes one card the owner's default and clears the flag on the others. */
  setDefault(ownerUserId: string, paymentMethodId: string): Promise<void>;
  delete(id: string): Promise<void>;
}

class InMemoryPaymentMethodRepository implements PaymentMethodRepository {
  private methods = new Map<string, PaymentMethod>();

  async findById(id: string): Promise<PaymentMethod | null> {
    return this.methods.get(id) ?? null;
  }

  async findByOwner(ownerUserId: string): Promise<PaymentMethod[]> {
    return [...this.methods.values()]
      .filter((method) => method.ownerUserId === ownerUserId)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  async create(data: NewPaymentMethod): Promise<PaymentMethod> {
    const method: PaymentMethod = { ...data, id: randomUUID(), createdAt: new Date() };
    this.methods.set(method.id, method);
    return method;
  }

  async setDefault(ownerUserId: string, paymentMethodId: string): Promise<void> {
    for (const [id, method] of this.methods) {
      if (method.ownerUserId !== ownerUserId) continue;
      this.methods.set(id, { ...method, isDefault: id === paymentMethodId });
    }
  }

  async delete(id: string): Promise<void> {
    this.methods.delete(id);
  }
}

const globalStore = globalThis as unknown as {
  __paymentMethodRepository?: PaymentMethodRepository;
};

export function getPaymentMethodRepository(): PaymentMethodRepository {
  globalStore.__paymentMethodRepository ??= new InMemoryPaymentMethodRepository();
  return globalStore.__paymentMethodRepository;
}
