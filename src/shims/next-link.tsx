import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

export const Link: React.FC<LinkProps> = ({ href, children, ...props }) => {
  return (
    <RouterLink to={href} {...(props as any)}>
      {children}
    </RouterLink>
  );
};

export default Link;
