import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
};

export function IconButton({ icon, label, ...props }: Props) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {icon}
    </button>
  );
}
