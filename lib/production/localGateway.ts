import { ProductionError, type BroadcastScope, type CommandActor, type ProductionCommandGateway } from "./contracts.ts"
import { commitProductionCommand, type ProductionStore } from "./commandService.ts"
import { scopesMatch } from "./state.ts"
import { identifier, parseScope } from "./validation.ts"

function authorize(scope: BroadcastScope, actor: CommandActor): void {
  parseScope(scope)
  identifier(actor.actorId)
  if (!scopesMatch(scope, actor.scope)) throw new ProductionError("SCOPE_MISMATCH", "Command is outside the authorized broadcast")
}

/** The local adapter uses the same async wire boundary a future RPC adapter will. */
export function createLocalProductionGateway(store: ProductionStore): ProductionCommandGateway {
  return {
    async read(scope, actor) {
      authorize(scope, actor)
      return { state: store.read(scope), engine: null }
    },
    async commit(input, actor) {
      return commitProductionCommand(store, input, actor)
    },
    async commands(scope, actor, afterRevision, limit) {
      authorize(scope, actor)
      return store.commands(scope, afterRevision, limit)
    },
  }
}
