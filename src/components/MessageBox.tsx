'use client';

/* eslint-disable @next/next/no-img-element */
import React, { MutableRefObject } from 'react';
import { cn } from '@/lib/utils';
import {
  BookCopy,
  Disc3,
  Volume2,
  StopCircle,
  Layers3,
  Plus,
  CornerDownRight,
} from 'lucide-react';
import Markdown, { MarkdownToJSX, RuleType } from 'markdown-to-jsx';
import Copy from './MessageActions/Copy';
import Rewrite from './MessageActions/Rewrite';
import MessageSources from './MessageSources';
import SearchImages from './SearchImages';
import SearchVideos from './SearchVideos';
import { useSpeech } from 'react-text-to-speech';
import ThinkBox from './ThinkBox';
import { useChat, Section } from '@/lib/hooks/useChat';
import Citation from './MessageRenderer/Citation';
import AssistantSteps from './AssistantSteps';
import { ResearchBlock } from '@/lib/types';
import Renderer from './Widgets/Renderer';
import CodeBlock from './MessageRenderer/CodeBlock';

const ThinkTagProcessor = ({
  children,
  thinkingEnded,
}: {
  children: React.ReactNode;
  thinkingEnded: boolean;
}) => {
  return (
    <ThinkBox content={children as string} thinkingEnded={thinkingEnded} />
  );
};

const MessageBox = ({
  section,
  sectionIndex,
  dividerRef,
  isLast,
}: {
  section: Section;
  sectionIndex: number;
  dividerRef?: MutableRefObject<HTMLDivElement | null>;
  isLast: boolean;
}) => {
  const {
    loading,
    sendMessage,
    rewrite,
    messages,
    researchEnded,
    chatHistory,
  } = useChat();

  const parsedMessage = section.parsedTextBlocks.join('\n\n');
  const speechMessage = section.speechMessage || '';
  const thinkingEnded = section.thinkingEnded;

  const sourceBlocks = section.message.responseBlocks.filter(
    (block): block is typeof block & { type: 'source' } =>
      block.type === 'source',
  );

  const sources = sourceBlocks.flatMap((block) => block.data);

  const hasContent = section.parsedTextBlocks.length > 0;

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  const markdownOverrides: MarkdownToJSX.Options = {
    renderRule(next, node, renderChildren, state) {
      if (node.type === RuleType.codeInline) {
        return `\`${node.text}\``;
      }

      if (node.type === RuleType.codeBlock) {
        return (
          <CodeBlock key={state.key} language={node.lang || ''}>
            {node.text}
          </CodeBlock>
        );
      }

      return next();
    },
    overrides: {
      think: {
        component: ThinkTagProcessor,
        props: {
          thinkingEnded: thinkingEnded,
        },
      },
      citation: {
        component: Citation,
      },
    },
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="w-full pt-8 break-words flex items-start gap-4">
        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-1 shadow-sm">
          <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs uppercase tracking-wider">You</span>
        </div>
        <h2 className="text-black dark:text-white font-medium text-2xl lg:w-9/12 leading-relaxed">
          {section.message.query}
        </h2>
      </div>

      <div className="flex flex-col space-y-9 lg:space-y-0 lg:flex-row lg:justify-between lg:space-x-9">
        <div
          ref={dividerRef}
          className="flex flex-col space-y-6 w-full lg:w-9/12 pl-12"
        >
          {sources.length > 0 && (
            <div className="flex flex-col space-y-3">
              <div className="flex flex-row items-center space-x-2">
                <BookCopy className="text-black/60 dark:text-white/60" size={18} />
                <h3 className="text-black/70 dark:text-white/70 font-medium text-sm uppercase tracking-wider">
                  Sources
                </h3>
              </div>
              <MessageSources sources={sources} />
            </div>
          )}

          {section.message.responseBlocks
            .filter(
              (block): block is ResearchBlock =>
                block.type === 'research' && block.data.subSteps.length > 0,
            )
            .map((researchBlock) => (
              <div key={researchBlock.id} className="flex flex-col space-y-2">
                <AssistantSteps
                  block={researchBlock}
                  status={section.message.status}
                  isLast={isLast}
                />
              </div>
            ))}

          {isLast &&
            loading &&
            !researchEnded &&
            !section.message.responseBlocks.some(
              (b) => b.type === 'research' && b.data.subSteps.length > 0,
            ) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-light-secondary/50 dark:bg-dark-secondary/50 border border-light-200 dark:border-dark-200 shadow-sm w-max">
                <Disc3 className="w-5 h-5 text-fuchsia-500 animate-spin" />
                <span className="text-sm font-medium text-black/70 dark:text-white/70">
                  Thinking...
                </span>
              </div>
            )}

          {section.widgets.length > 0 && <Renderer widgets={section.widgets} />}

          <div className="flex flex-col space-y-4">
            {sources.length > 0 && (
              <div className="flex flex-row items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-fuchsia-500/10 flex items-center justify-center shrink-0 -ml-12 shadow-sm">
                  <Disc3
                    className={cn(
                      'text-fuchsia-600 dark:text-fuchsia-400',
                      isLast && loading ? 'animate-spin' : 'animate-none',
                    )}
                    size={16}
                  />
                </div>
                <h3 className="text-black dark:text-white font-medium text-lg">
                  Answer
                </h3>
              </div>
            )}

            {!sources.length && hasContent && (
               <div className="flex flex-row items-center space-x-3 mb-2">
                 <div className="w-8 h-8 rounded-full bg-fuchsia-500/10 flex items-center justify-center shrink-0 -ml-12 shadow-sm">
                   <Disc3
                     className={cn(
                       'text-fuchsia-600 dark:text-fuchsia-400',
                       isLast && loading ? 'animate-spin' : 'animate-none',
                     )}
                     size={16}
                   />
                 </div>
               </div>
            )}

            {hasContent && (
              <>
                <Markdown
                  className={cn(
                    'prose prose-base max-w-none break-words text-black dark:text-white dark:prose-invert',
                    'prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4',
                    'prose-h2:text-xl prose-h2:font-semibold prose-h2:mb-3 prose-h2:mt-6',
                    'prose-h3:text-lg prose-h3:font-medium prose-h3:mb-2 prose-h3:mt-4',
                    'prose-p:leading-7 prose-p:mb-4',
                    'prose-a:text-blue-500 hover:prose-a:text-blue-600 prose-a:no-underline',
                    'prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4',
                    'prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4',
                    'prose-li:mb-1',
                    'prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:text-sm prose-code:font-mono',
                    'prose-pre:p-0 prose-pre:bg-transparent prose-pre:m-0',
                    'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-700 prose-blockquote:pl-4 prose-blockquote:italic'
                  )}
                  options={markdownOverrides}
                  dir="auto"
                >
                  {parsedMessage}
                </Markdown>

                {loading && isLast ? null : (
                  <div className="flex flex-row items-center justify-between w-full text-black dark:text-white py-4">
                    <div className="flex flex-row items-center -ml-2">
                      <Rewrite
                        rewrite={rewrite}
                        messageId={section.message.messageId}
                      />
                    </div>
                    <div className="flex flex-row items-center -mr-2">
                      <Copy initialMessage={parsedMessage} section={section} />
                      <button
                        onClick={() => {
                          if (speechStatus === 'started') {
                            stop();
                          } else {
                            start();
                          }
                        }}
                        className="p-2 text-black/70 dark:text-white/70 rounded-full hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white"
                      >
                        {speechStatus === 'started' ? (
                          <StopCircle size={16} />
                        ) : (
                          <Volume2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {isLast &&
                  section.suggestions &&
                  section.suggestions.length > 0 &&
                  hasContent &&
                  !loading && (
                    <div className="mt-6">
                      <div className="flex flex-row items-center space-x-2 mb-4">
                        <Layers3
                          className="text-black dark:text-white"
                          size={20}
                        />
                        <h3 className="text-black dark:text-white font-medium text-xl">
                          Related
                        </h3>
                      </div>
                      <div className="space-y-0">
                        {section.suggestions.map(
                          (suggestion: string, i: number) => (
                            <div key={i}>
                              <div className="h-px bg-light-200/40 dark:bg-dark-200/40" />
                              <button
                                onClick={() => sendMessage(suggestion)}
                                className="group w-full py-4 text-left transition-colors duration-200"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex flex-row space-x-3 items-center">
                                    <CornerDownRight
                                      size={15}
                                      className="group-hover:text-sky-400 transition-colors duration-200 flex-shrink-0"
                                    />
                                    <p className="text-sm text-black/70 dark:text-white/70 group-hover:text-sky-400 transition-colors duration-200 leading-relaxed">
                                      {suggestion}
                                    </p>
                                  </div>
                                  <Plus
                                    size={16}
                                    className="text-black/40 dark:text-white/40 group-hover:text-sky-400 transition-colors duration-200 flex-shrink-0"
                                  />
                                </div>
                              </button>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </>
            )}
          </div>
        </div>

        {hasContent && (
          <div className="lg:sticky lg:top-20 flex flex-col items-center space-y-3 w-full lg:w-3/12 z-30 h-full pb-4">
            <SearchImages
              query={section.message.query}
              chatHistory={chatHistory}
              messageId={section.message.messageId}
            />
            <SearchVideos
              chatHistory={chatHistory}
              query={section.message.query}
              messageId={section.message.messageId}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBox;
