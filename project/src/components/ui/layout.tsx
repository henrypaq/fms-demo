import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const layoutVariants = cva(
  "min-h-screen bg-background",
  {
    variants: {},
    defaultVariants: {},
  }
)

export interface LayoutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof layoutVariants> {}

const Layout = React.forwardRef<HTMLDivElement, LayoutProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(layoutVariants(), className)}
      {...props}
    />
  )
)
Layout.displayName = "Layout"

const SidebarLayout = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    sidebar: React.ReactNode
    sidebarWidth?: string
  }
>(({ className, sidebar, sidebarWidth = "w-64", children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-screen", className)}
    {...props}
  >
    <aside className={cn("flex-shrink-0 border-r border-border", sidebarWidth)}>
      {sidebar}
    </aside>
    <main className="flex-1 overflow-hidden">
      {children}
    </main>
  </div>
))
SidebarLayout.displayName = "SidebarLayout"

const HeaderLayout = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    header: React.ReactNode
  }
>(({ className, header, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col h-screen", className)}
    {...props}
  >
    <header className="flex-shrink-0 border-b border-border">
      {header}
    </header>
    <main className="flex-1 overflow-auto">
      {children}
    </main>
  </div>
))
HeaderLayout.displayName = "HeaderLayout"

const Container = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    size?: "sm" | "md" | "lg" | "xl" | "full"
  }
>(({ className, size = "xl", children, ...props }, ref) => {
  const sizeClasses = {
    sm: "max-w-3xl",
    md: "max-w-4xl",
    lg: "max-w-6xl",
    xl: "max-w-7xl",
    full: "max-w-full",
  }

  return (
    <div
      ref={ref}
      className={cn("mx-auto px-4 sm:px-6 lg:px-8", sizeClasses[size], className)}
      {...props}
    >
      {children}
    </div>
  )
})
Container.displayName = "Container"

const PageHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title: string
    description?: string
    actions?: React.ReactNode
  }
>(({ className, title, description, actions, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("border-b border-border bg-background", className)}
    {...props}
  >
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  </div>
))
PageHeader.displayName = "PageHeader"

export { Layout, SidebarLayout, HeaderLayout, Container, PageHeader, layoutVariants }


