import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { client, type CoachProfile } from '../amplifyClient';

interface AppData {
  email: string;
  isAdmin: boolean;
  /** Perfil de coach vinculado por email (null si aún no fue cargado). */
  profile: CoachProfile | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AppData | null>(null);

export function useApp(): AppData {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp debe usarse dentro de <AppDataProvider>');
  return v;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthenticator((c) => [c.user]);
  const [email, setEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const session = await fetchAuthSession();
      const groups =
        (session.tokens?.accessToken.payload['cognito:groups'] as
          | string[]
          | undefined) ?? [];
      setIsAdmin(groups.includes('ADMIN'));

      const mail =
        (session.tokens?.idToken?.payload.email as string | undefined) ??
        user?.signInDetails?.loginId ??
        '';
      setEmail(mail);

      if (mail) {
        const { data } = await client.models.CoachProfile.list({
          filter: { email: { eq: mail } },
        });
        setProfile(data[0] ?? null);
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Ctx.Provider value={{ email, isAdmin, profile, loading, refresh: load }}>
      {children}
    </Ctx.Provider>
  );
}
