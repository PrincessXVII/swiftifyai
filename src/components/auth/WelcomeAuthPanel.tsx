import { useState, type FormEvent } from 'react';
import { getAppOrigin } from '../../lib/appOrigin';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

const OAUTH_FLAG = 'swiftify:oauth-pending';

interface Props {
  onAuthenticated: () => void;
}

export function WelcomeAuthPanel({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <div className="welcome-auth">
        <p className="welcome-auth__hint">
          Для входа и регистрации добавьте в <code>.env</code> переменные{' '}
          <code>VITE_SUPABASE_URL</code> и <code>VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> (или <code>VITE_SUPABASE_ANON_KEY</code>) в проекте Supabase.
        </p>
      </div>
    );
  }

  const supabase = getSupabaseClient()!;

  async function signInWithGoogle() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      sessionStorage.setItem(OAUTH_FLAG, '1');
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${getAppOrigin()}/` },
      });
      if (err) {
        sessionStorage.removeItem(OAUTH_FLAG);
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const em = email.trim();
    if (!em || !password) {
      setError('Введите почту и пароль');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'register') {
        const { data, error: err } = await supabase.auth.signUp({
          email: em,
          password,
        });
        if (err) {
          setError(err.message);
          return;
        }
        if (data.session) {
          onAuthenticated();
        } else {
          setInfo('Проверьте почту — отправили письмо для подтверждения.');
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: em,
          password,
        });
        if (err) {
          setError(err.message);
          return;
        }
        onAuthenticated();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="welcome-auth">
      <div className="welcome-auth__oauth">
        <button
          type="button"
          className="welcome-auth__oauth-btn welcome-auth__oauth-btn--google"
          disabled={busy}
          onClick={() => void signInWithGoogle()}
        >
          <span className="welcome-auth__oauth-icon" aria-hidden>
            G
          </span>
          Google
        </button>
      </div>

      <div className="welcome-auth__divider">
        <span>или почта</span>
      </div>

      <form className="welcome-auth__form" onSubmit={submitEmail}>
        <input
          className="welcome-auth__input"
          type="email"
          autoComplete="email"
          placeholder="Эл. почта"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
        />
        <input
          className="welcome-auth__input"
          type="password"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
        />

        <div className="welcome-auth__mode">
          <button
            type="button"
            className={`welcome-auth__mode-btn ${mode === 'register' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
          >
            Регистрация
          </button>
          <button
            type="button"
            className={`welcome-auth__mode-btn ${mode === 'login' ? 'is-active' : ''}`}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
          >
            Вход
          </button>
        </div>

        <button type="submit" className="welcome-auth__submit" disabled={busy}>
          {mode === 'register' ? 'Зарегистрироваться' : 'Войти'}
        </button>

        {error && <p className="welcome-auth__message welcome-auth__message--error">{error}</p>}
        {info && <p className="welcome-auth__message welcome-auth__message--info">{info}</p>}
      </form>
    </div>
  );
}

export function consumeOAuthLoginIntent(): boolean {
  try {
    if (sessionStorage.getItem(OAUTH_FLAG)) {
      sessionStorage.removeItem(OAUTH_FLAG);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
