import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'danger' | 'danger-ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** When true, hides text labels on mobile — only the icon is shown (below `sm` breakpoint). */
  compact?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", compact = false, children, ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-emerald-800 text-white hover:bg-emerald-700": variant === "default",
            "border border-emerald-800 bg-white text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900": variant === "outline",
            "text-emerald-800 hover:bg-emerald-50 hover:text-emerald-900": variant === "ghost",
            "text-emerald-800 underline-offset-4 hover:underline": variant === "link",
            "bg-red-600 text-white hover:bg-red-700": variant === "danger",
            "text-red-500 hover:text-red-700 hover:bg-red-50": variant === "danger-ghost",
            "h-10 px-4 py-2": size === "default",
            "h-9 rounded-md px-3": size === "sm",
            "h-11 rounded-md px-8": size === "lg",
            "h-10 w-10": size === "icon",
            "gap-1.5": compact,
          },
          className
        )}
        ref={ref}
        {...props}
      >
        {compact ? wrapChildrenCompact(children) : children}
      </button>
    )
  }
)
Button.displayName = "Button"

/**
 * Wraps string/text children in a `hidden sm:inline` span so only icon children
 * remain visible on mobile. Non-string children (icons) are passed through.
 */
function wrapChildrenCompact(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return <span className="hidden sm:inline">{child}</span>;
    }
    return child;
  });
}

export { Button }

