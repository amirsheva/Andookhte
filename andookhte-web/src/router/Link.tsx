import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { matchPath, useRouter } from './routerContext';

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className'> {
  to: string;
  replace?: boolean;
  exact?: boolean;
  children: ReactNode;
  className?: string | ((state: { active: boolean }) => string);
}

export function Link({ to, replace, exact = false, className, children, onClick, ...rest }: LinkProps) {
  const { path, navigate } = useRouter();
  const active = matchPath(path, to, exact);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    navigate(to, { replace });
  };

  return (
    <a
      href={to}
      onClick={handleClick}
      aria-current={active ? 'page' : undefined}
      className={typeof className === 'function' ? className({ active }) : className}
      {...rest}
    >
      {children}
    </a>
  );
}
