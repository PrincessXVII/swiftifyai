import { ChevronLeft } from 'lucide-react';
import { useCallback, useState } from 'react';
import { createYookassaPlusPayment } from '../../api/billing';
import { useAuth } from '../../hooks/useAuth';
import { hasSwiftifyPlus } from '../../lib/userProfile';

interface Props {
  onBack: () => void;
}

const priceLabel =
  import.meta.env.VITE_PLUS_PRICE_LABEL?.trim() || '99 ₽ за 30 дней';

export function AccountPanel({ onBack }: Props) {
  const { user, signOut } = useAuth();
  const email = user?.email ?? '—';
  const via = user?.identities?.[0]?.provider;
  const isPlus = user ? hasSwiftifyPlus(user) : false;
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const startPlusPayment = useCallback(async () => {
    setBillingError(null);
    setBillingBusy(true);
    try {
      const returnBase = `${window.location.origin}${window.location.pathname}`;
      const { confirmationUrl } = await createYookassaPlusPayment(returnBase);
      window.location.assign(confirmationUrl);
    } catch (e) {
      setBillingError(e instanceof Error ? e.message : 'Не удалось перейти к оплате');
      setBillingBusy(false);
    }
  }, []);

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
        <div className="account-panel__sheet">
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

          <div className="account-panel__card account-panel__card--plus">
            <span className="account-panel__label">Подписка</span>
            {isPlus ? (
              <p className="account-panel__value">
                SwiftifyPlus активна — без дневного лимита символов.
              </p>
            ) : (
              <>
                <p className="account-panel__value account-panel__plus-lead">
                  Оформите SwiftifyPlus и пользуйтесь чатом без ограничения по объёму текста в день.
                </p>
                <p className="account-panel__plus-price">{priceLabel}</p>
                <button
                  type="button"
                  className="account-panel__plus-pay"
                  disabled={billingBusy}
                  onClick={() => void startPlusPayment()}
                >
                  {billingBusy ? 'Переход к оплате…' : 'Оплатить через ЮKassa'}
                </button>
                {billingError ? (
                  <p className="account-panel__plus-error" role="alert">
                    {billingError}
                  </p>
                ) : null}
              </>
            )}
          </div>
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
