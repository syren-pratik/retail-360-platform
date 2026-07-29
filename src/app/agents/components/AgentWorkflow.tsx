'use client';

import type {
  ERPConnectionResult,
  ProposalItem,
  ExecutionStep,
  ArtifactResult,
  DatabricksOperation,
} from '@/app/agents/lib/action-types';
import StepSystemCheck from './workflow/StepSystemCheck';
import StepProposal from './workflow/StepProposal';
import StepExecution from './workflow/StepExecution';

export type AgentWorkflowPhase = 'idle' | 'checking' | 'thinking' | 'proposing' | 'approved' | 'executing' | 'done' | 'error';

interface Props {
  agentId: string;
  agentName: string;
  agentIcon: string;
  initialTrigger: string;
  phase: AgentWorkflowPhase;
  erpResults: ERPConnectionResult[];
  proposals: ProposalItem[];
  executionSteps: ExecutionStep[];
  artifacts: ArtifactResult[];
  databricksOps: DatabricksOperation[];
  referenceNumber?: string;
  nextSteps?: string[];
  onStart: () => void;
  onProposalChange: (proposals: ProposalItem[]) => void;
  onApprove: (selected: ProposalItem[]) => void;
  onDismiss: () => void;
  userInstructions?: string;
  onUserInstructionsChange?: (value: string) => void;
}

const PHASE_ORDER: Record<AgentWorkflowPhase, number> = {
  idle: 0,
  checking: 1,
  thinking: 2,
  proposing: 2,
  approved: 3,
  executing: 4,
  done: 5,
  error: 0,
};

export default function AgentWorkflow({
  agentIcon,
  agentName,
  initialTrigger,
  phase,
  erpResults,
  proposals,
  executionSteps,
  artifacts,
  databricksOps,
  referenceNumber,
  nextSteps,
  onStart,
  onProposalChange,
  onApprove,
  onDismiss,
  userInstructions,
  onUserInstructionsChange,
}: Props) {
  const p = PHASE_ORDER[phase];

  if (phase === 'idle') {
    return (
      <div className="border border-[var(--border-default)] rounded-xl bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl">
            {agentIcon}
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-[var(--text-primary)]">{agentName}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{initialTrigger}</p>
          </div>
        </div>
        {onUserInstructionsChange && (
          <div className="mb-4 space-y-1.5">
            <p className="text-xs text-[var(--text-secondary)]">
              Any specific instructions? (optional)
            </p>
            <input
              type="text"
              value={userInstructions ?? ''}
              onChange={(e) => onUserInstructionsChange(e.target.value)}
              placeholder="e.g. focus on Beverages only, skip Dairy, top 3 SKUs..."
              className="w-full text-sm px-3 py-2 border border-[var(--border-default)] rounded-lg bg-white text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--border-hover)]"
            />
            <p className="text-[11px] text-[var(--text-secondary)]">
              Claude will adjust its proposals based on your instructions
            </p>
          </div>
        )}
        <button
          onClick={onStart}
          className="px-4 py-2 text-sm rounded-md bg-[var(--accent-primary)] text-white"
        >
          Run agent →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 text-xs text-[var(--text-secondary)]">{initialTrigger}</div>
      <StepSystemCheck results={erpResults} isChecking={phase === 'checking'} stepNumber={1} />

      {p >= PHASE_ORDER.approved && (
        <StepProposal
          proposals={proposals}
          onProposalChange={onProposalChange}
          onApprove={onApprove}
          onDismiss={onDismiss}
          readonly={p >= PHASE_ORDER.executing}
          stepNumber={2}
        />
      )}

      {p >= PHASE_ORDER.executing && (
        <StepExecution
          steps={executionSteps}
          artifacts={artifacts}
          databricksOps={databricksOps}
          isExecuting={phase === 'executing'}
          referenceNumber={referenceNumber}
          nextSteps={nextSteps}
          stepNumber={3}
        />
      )}
    </div>
  );
}
