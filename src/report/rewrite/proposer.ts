import type { RewriteProposal, RewriteProposer, RewriteRequest } from "./types";

export class StubRewriteProposer implements RewriteProposer {
  readonly id: string;
  private readonly fixtures: ReadonlyMap<string, string>;

  constructor(fixtures: Record<string, string>, id = "stub@1+fixtures@1") {
    this.id = id;
    this.fixtures = new Map(Object.entries(fixtures));
  }

  async propose(request: RewriteRequest): Promise<RewriteProposal> {
    const original = request.target.text;
    const proposed = this.fixtures.get(original) ?? original;
    return { proposerId: this.id, original, proposed, localeId: request.localeId };
  }
}
