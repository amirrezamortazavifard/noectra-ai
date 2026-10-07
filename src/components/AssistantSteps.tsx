'use client';

import React from 'react';
import { ResearchBlock } from '@/lib/types';
import AgentExecutionPanel from './AgentWorkflow/AgentExecutionPanel';

interface AssistantStepsProps {
  block?: ResearchBlock;
  status: 'answering' | 'completed' | 'error';
  isLast: boolean;
  query?: string;
}

export const AssistantSteps: React.FC<AssistantStepsProps> = ({
  block,
  status,
  isLast,
  query,
}) => {
  return (
    <AgentExecutionPanel
      block={block}
      status={status}
      isLast={isLast}
      query={query}
    />
  );
};

export default AssistantSteps;
