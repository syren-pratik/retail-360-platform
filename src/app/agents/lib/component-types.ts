import type { UIComponentType } from '@/app/lib/types';

/** Shared contract for every agent run — used by the runner, agent routes, and panel. */
export interface AgentResponse {
  agent_id: string;
  run_id: string;
  timestamp: string;
  components: UIComponentType[];
}
