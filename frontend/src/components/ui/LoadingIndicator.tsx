import type { HTMLAttributes } from "react";

type LoadingIndicatorProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
  size?: "sm" | "md" | "lg";
  inline?: boolean;
};

const sizes = { sm: "size-4 border-2", md: "size-7 border-[3px]", lg: "size-10 border-4" };

export function LoadingIndicator({ label = "Loading", size = "md", inline = false, className = "", ...props }: LoadingIndicatorProps) {
  return (
    <div role="status" aria-label={label} className={`${inline ? "inline-flex" : "flex flex-col"} items-center justify-center gap-2.5 text-center text-muted ${className}`} {...props}>
      <span aria-hidden="true" className={`${sizes[size]} animate-spin rounded-full border-primary/20 border-t-primary motion-reduce:animate-none`} />
      {!inline && <span className="text-sm">{label}</span>}
      {inline && <span className="sr-only">{label}</span>}
    </div>
  );
}
