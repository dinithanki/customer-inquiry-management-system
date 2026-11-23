import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-end justify-between gap-5 max-[760px]:items-start">
      <div>
        <h1 className="mb-1.5 text-[28px] leading-[1.2] font-bold tracking-[-0.7px] text-slate-800 max-[760px]:text-2xl">{title}</h1>
        <p className="m-0 leading-[1.6] text-muted">{description}</p>
      </div>
      {action}
    </header>
  );
}
