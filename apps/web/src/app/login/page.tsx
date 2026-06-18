'use client';

import { useEffect, useState } from 'react';
import { BrandLogo } from '../../components/brand-logo';
import { login } from '../../lib/auth-api';
import { getSession, setSession } from '../../lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@zeladoria.local');
  const [password, setPassword] = useState('secret123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);

  useEffect(() => {
    if (getSession()) {
      window.location.replace('/');
    }
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setDebugMessage(null);
    try {
      const result = await login(email, password);
      setSession({
        accessToken: result.access_token,
        user: result.user
      });
      const destination = result.user.role === 'CIDADAO' ? '/nova-ocorrencia' : '/';
      setDebugMessage(`Login OK como ${result.user.role}, redirecionando para ${destination}`);
      window.location.href = destination;
    } catch {
      setError('Não foi possível entrar. Verifique as credenciais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell login-shell--pwa">
      <aside className="login-brand-panel" aria-hidden="true">
        <div className="login-brand-content">
          <BrandLogo variant="light" size="lg" showTagline />
          <h2>Tecnologia, IA e gestão pública em uma única plataforma.</h2>
          <p>
            A i7AI Sistemas desenvolve soluções digitais de alto padrão para prefeituras,
            consórcios e instituições que exigem confiança, eficiência e inovação.
          </p>
          <div className="login-brand-features">
            <div className="login-brand-feature">Inteligência artificial aplicada à operação</div>
            <div className="login-brand-feature">Segurança e rastreabilidade institucional</div>
            <div className="login-brand-feature">Interface moderna, clara e responsiva</div>
          </div>
        </div>
      </aside>
      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-mobile-brand">
            <BrandLogo variant="dark" size="md" showTagline={false} />
          </div>
          <span className="login-product-label">Prefeitura na Mão</span>
          <p className="eyebrow">Acesso à plataforma</p>
          <h1>Entrar no sistema</h1>
          <p className="login-copy">No celular, instale o app na tela inicial para usar como aplicativo nativo.</p>
          <details className="login-demo-details">
            <summary>Usuários de teste</summary>
            <p className="login-copy login-copy--hint">
              Cidadão: <strong>cidadao@zeladoria.local</strong> · Secretaria: <strong>secretaria@zeladoria.local</strong> · Equipe: <strong>equipe@zeladoria.local</strong> · Admin: <strong>admin@zeladoria.local</strong> · Senha: <strong>secret123</strong>
            </p>
          </details>
          <form onSubmit={onSubmit} className="login-form">
            <label>
              E-mail
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <label>
              Senha
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </label>
            {error ? <p className="login-error">{error}</p> : null}
            {debugMessage ? <p className="success-message">{debugMessage}</p> : null}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
