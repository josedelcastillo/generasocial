import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import { I18n } from 'aws-amplify/utils';
import { translations } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import outputs from '../amplify_outputs.json';
import App from './App';
import { AppDataProvider } from './context/AppData';
import './index.css';

Amplify.configure(outputs);

// Interfaz de login en español.
I18n.putVocabularies(translations);
I18n.setLanguage('es');

function Root() {
  return (
    <Authenticator
      loginMechanisms={['email']}
      signUpAttributes={['email']}
      components={{
        Header() {
          return (
            <div className="auth-header">
              <h1>Genera Social</h1>
              <p>Gestión de coaching voluntario</p>
            </div>
          );
        },
      }}
    >
      <AppDataProvider>
        <AuthedApp />
      </AppDataProvider>
    </Authenticator>
  );
}

function AuthedApp() {
  // Garantiza que el contexto se re-renderice cuando cambia el usuario.
  useAuthenticator((c) => [c.user]);
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
