import { useMemo, useState } from 'react';
import type { Lang } from '../engine/types';
import { t } from '../i18n';

/** A simple parental gate: a multiplication a young child is unlikely to solve (PRD §21). */
export function ParentGate({ lang, onPass, onCancel }: { lang: Lang; onPass: () => void; onCancel?: () => void }) {
  const [a, b] = useMemo(() => [3 + Math.floor(Math.random() * 7), 3 + Math.floor(Math.random() * 7)], []);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(value) === a * b) onPass();
    else {
      setError(true);
      setValue('');
    }
  };

  return (
    <div className="parent gate">
      <form className="gate-card" onSubmit={submit}>
        <h1>{t('parentArea', lang)}</h1>
        <label htmlFor="gate-answer">{t('gateQuestion', lang, { a, b })}</label>
        <input id="gate-answer" inputMode="numeric" autoComplete="off" autoFocus value={value}
          onChange={(e) => { setValue(e.target.value.replace(/\D/g, '')); setError(false); }} />
        {error && <p className="gate-error" role="alert">{t('wrongAnswer', lang)}</p>}
        <div className="row">
          {onCancel && <button type="button" className="btn-quiet" onClick={onCancel}>{t('cancel', lang)}</button>}
          <button type="submit" className="btn-ink">{t('enter', lang)}</button>
        </div>
      </form>
    </div>
  );
}
