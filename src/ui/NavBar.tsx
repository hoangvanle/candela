import type { ReactNode } from 'react';

type Props = {
  title: string;
  sub?: string | undefined;
  left?: ReactNode;
  right?: ReactNode;
};

export function NavBar({ title, sub, left, right }: Props) {
  return (
    <div className="navbar">
      {left ?? <div className="navspacer" />}
      <h1>
        {title}
        {sub ? <small>{sub}</small> : null}
      </h1>
      {right ?? <div className="navspacer" />}
    </div>
  );
}
