import React, { useEffect, useState } from 'react';
import { YocareHome } from './components/YocareHome';
import { YocareTools } from './components/YocareTools';
import { LiveApp } from './LiveApp';
export const App: React.FC = () => {
  const [pathname, setPathname] = useState(window.location.pathname);
  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', syncPath);
    return () => window.removeEventListener('popstate', syncPath);
  }, []);
  if (pathname === '/live' || pathname.startsWith('/live/')) return <LiveApp />;
  if (pathname === '/tools' || pathname.startsWith('/tools/')) return <YocareTools />;
  return <YocareHome />;
};
