import { useSelectedLayoutSegments } from 'next/navigation';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const segments = useSelectedLayoutSegments();
  const isPdf = segments.includes('pdf');
  const isDiscover = segments.includes('discover');
  const isHome = segments.length === 0;

  if (isPdf) {
    return (
      <main className="lg:pl-20 bg-light-primary dark:bg-dark-primary h-screen w-full overflow-hidden">
        {children}
      </main>
    );
  }

  return (
    <main className="lg:pl-20 bg-light-primary dark:bg-dark-primary h-screen w-full overflow-y-auto overflow-x-hidden">
      <div className={isDiscover || isHome ? "w-full min-h-full" : "max-w-screen-lg lg:mx-auto mx-4 min-h-full"}>
        {children}
      </div>
    </main>
  );
};

export default Layout;

