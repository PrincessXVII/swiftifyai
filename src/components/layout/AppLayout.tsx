import { useEffect, useRef, useState } from 'react';
import { AccountPanel } from '../account/AccountPanel';
import { useAppHotkeys } from '../../hooks/useAppHotkeys';
import { useAuth } from '../../hooks/useAuth';
import { ChatWindow, type ChatWindowHandle } from '../chat/ChatWindow';
import { Sidebar } from '../sidebar/Sidebar';
import { rehydrateChatStoreForUser, useChatStore } from '../../store/chatStore';
import { MobileHeader } from './MobileHeader';

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, loading: authLoading, refreshSession } = useAuth();
  const chatWindowRef = useRef<ChatWindowHandle>(null);
  const theme = useChatStore((s) => s.settings.theme);
  const setTheme = useChatStore((s) => s.setTheme);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const applyRootTheme = () => {
      const mobile = mq.matches;
      const t = useChatStore.getState().settings.theme;
      if (mobile && t !== 'dark') {
        setTheme('dark');
      }
      document.documentElement.classList.toggle('dark', mobile || useChatStore.getState().settings.theme === 'dark');
    };
    applyRootTheme();
    mq.addEventListener('change', applyRootTheme);
    return () => mq.removeEventListener('change', applyRootTheme);
  }, [theme, setTheme]);

  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.get('payment') !== 'success') return;
    u.searchParams.delete('payment');
    void refreshSession();
    window.history.replaceState({}, '', `${u.pathname}${u.search}${u.hash}`);
  }, [refreshSession]);

  useAppHotkeys({
    isStarted,
    accountOpen,
    isSidebarOpen,
    setAccountOpen,
    setIsSidebarOpen,
    chatWindowRef,
  });

  useEffect(() => {
    if (authLoading) return;
    rehydrateChatStoreForUser(user?.id ?? null);
  }, [authLoading, user?.id]);
  const prevUserRef = useRef(user);
  const chatsCount = useChatStore((state) => state.chats.length);
  const prevChatsCount = useRef(chatsCount);

  useEffect(() => {
    if (prevUserRef.current && !user) {
      setIsStarted(false);
      setIsSidebarOpen(false);
      setAccountOpen(false);
    }
    prevUserRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!isStarted) setAccountOpen(false);
  }, [isStarted]);

  useEffect(() => {
    if (prevChatsCount.current > 0 && chatsCount === 0) {
      setIsStarted(false);
      setIsSidebarOpen(false);
    }
    prevChatsCount.current = chatsCount;
  }, [chatsCount]);

  return (
    <div className={`app-layout ${isStarted ? 'started' : 'welcome-only'}`}>
      {isStarted && (
        <div className="desktop-sidebar">
          <Sidebar onOpenAccount={() => setAccountOpen(true)} />
        </div>
      )}

      <div className="main-pane">
        {isStarted && (
          <MobileHeader
            onMenuClick={() => setIsSidebarOpen(true)}
            accountMode={accountOpen}
            onBackFromAccount={() => setAccountOpen(false)}
          />
        )}
        {isStarted && accountOpen ? (
          <AccountPanel onBack={() => setAccountOpen(false)} />
        ) : (
          <ChatWindow
            ref={chatWindowRef}
            onStart={() => setIsStarted(true)}
            isStarted={isStarted}
            onRequestPlus={() => setAccountOpen(true)}
          />
        )}
      </div>

      {isStarted && isSidebarOpen && (
        <>
          <div className="overlay" onClick={() => setIsSidebarOpen(false)} />
          <div className="mobile-sidebar">
            <Sidebar
              onClose={() => setIsSidebarOpen(false)}
              onOpenAccount={() => {
                setAccountOpen(true);
                setIsSidebarOpen(false);
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
