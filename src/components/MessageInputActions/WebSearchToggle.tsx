import { useChat } from '@/lib/hooks/useChat';
import { cn } from '@/lib/utils';
import { Switch } from '@headlessui/react';
import { GlobeIcon } from '@phosphor-icons/react';

const WebSearchToggle = () => {
  const { sources, setSources } = useChat();

  const isEnabled = sources.includes('web');

  const toggleSearch = () => {
    if (isEnabled) {
      setSources(sources.filter((s) => s !== 'web'));
    } else {
      setSources([...sources, 'web']);
    }
  };

  return (
    <div
      onClick={toggleSearch}
      className={cn(
        'flex flex-row items-center space-x-2 px-3 py-1.5 rounded-full cursor-pointer transition-all duration-300 border select-none',
        isEnabled
          ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400'
          : 'bg-light-200/50 dark:bg-dark-200/50 border-transparent text-black/50 dark:text-white/50 hover:bg-light-200 dark:hover:bg-dark-200'
      )}
    >
      <GlobeIcon className="h-4 w-4" weight={isEnabled ? 'fill' : 'regular'} />
      <span className="text-[13px] font-medium">Pro Search</span>
      
      <Switch
        checked={isEnabled}
        onChange={() => {}}
        className={cn(
          'group relative flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ml-1',
          isEnabled ? 'bg-sky-500' : 'bg-black/20 dark:bg-white/20'
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none inline-block size-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            isEnabled ? 'translate-x-2.5' : 'translate-x-0'
          )}
        />
      </Switch>
    </div>
  );
};

export default WebSearchToggle;
