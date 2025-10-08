import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Button } from "./button"

const navigationVariants = cva(
  "flex flex-col space-y-1",
  {
    variants: {},
    defaultVariants: {},
  }
)

export interface NavigationProps
  extends React.HTMLAttributes<HTMLNavElement>,
    VariantProps<typeof navigationVariants> {}

const Navigation = React.forwardRef<HTMLNavElement, NavigationProps>(
  ({ className, ...props }, ref) => (
    <nav
      ref={ref}
      className={cn(navigationVariants(), className)}
      {...props}
    />
  )
)
Navigation.displayName = "Navigation"

const navigationItemVariants = cva(
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "text-muted-foreground hover:text-foreground hover:bg-accent",
        active: "bg-accent text-accent-foreground",
        disabled: "text-muted-foreground/50 cursor-not-allowed",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface NavigationItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof navigationItemVariants> {
  icon?: React.ReactNode
  badge?: React.ReactNode
  isActive?: boolean
}

const NavigationItem = React.forwardRef<HTMLButtonElement, NavigationItemProps>(
  ({ className, variant, icon, badge, isActive, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        navigationItemVariants({ 
          variant: isActive ? "active" : variant 
        }),
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1 text-left">{children}</span>
      {badge && <span className="flex-shrink-0">{badge}</span>}
    </button>
  )
)
NavigationItem.displayName = "NavigationItem"

const NavigationGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title?: string
  }
>(({ className, title, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-1", className)}
    {...props}
  >
    {title && (
      <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
    )}
    {children}
  </div>
))
NavigationGroup.displayName = "NavigationGroup"

const NavigationSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("h-px bg-border my-2", className)}
    {...props}
  />
))
NavigationSeparator.displayName = "NavigationSeparator"

export { 
  Navigation, 
  NavigationItem, 
  NavigationGroup, 
  NavigationSeparator, 
  navigationVariants,
  navigationItemVariants 
}


