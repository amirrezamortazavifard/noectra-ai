import {
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
  useNavigate,
  useLocation,
} from 'react-router-dom';

export function useParams<T extends Record<string, string | string[]> = Record<string, string>>(): T {
  return useRouterParams() as unknown as T;
}

export function useSearchParams() {
  const [params] = useRouterSearchParams();
  return params;
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function useSelectedLayoutSegments(): string[] {
  const location = useLocation();
  return location.pathname.split('/').filter(Boolean);
}

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
  };
}
