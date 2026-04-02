import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface Props {
  onBack: () => void;
}

export function AccountPanel({ onBack }: Props) {
  const { user, signOut } = useAuth();
  const email = user?.email ?? '—';
  const via = user?.identities?.[0]?.provider;

  return (
    <section className="account-panel">
      <header className="account-panel__header">
        <button type="button" className="account-panel__back" onClick={onBack}>
          <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          <span>К чатам</span>
        </button>
      </header>
      <div className="account-panel__body">
        <h1 className="account-panel__title">Личный кабинет</h1>
        <div className="account-panel__card">
          <span className="account-panel__label">Эл. почта</span>
          <p className="account-panel__value">{email}</p>
          {via ? (
            <>
              <span className="account-panel__label">Способ входа</span>
              <p className="account-panel__value account-panel__value--muted">{via}</p>
            </>
          ) : null}
        </div>
        <button
          type="button"
          className="account-panel__sign-out"
          onClick={() => void signOut()}
        >
          Выйти из аккаунта
        </button>
      </div>
    </section>
  );
}
