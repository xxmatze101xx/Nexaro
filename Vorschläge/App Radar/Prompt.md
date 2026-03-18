You are given a task to integrate an existing React component into the Nexaro codebase.

Nexaro is a Unified Inbox SaaS application for CEOs and Executives. The application uses a modern tech stack (Next.js App Router, Tailwind CSS, TypeScript, Firebase) with a premium, executive-level design and dark mode support. The codebase already supports shadcn/ui.

**Integration Instructions:**
- **Placement**: Place the component in `src/components/ui/empty-state.tsx`.
- **Usage**: Integrate this into the Nexaro Landing Page (`src/app/landing/page.tsx`). It will be used to showcase an "App Radar" section displaying how the product handles empty states or radar visualizations.
- **Styling**: Ensure it perfectly fits the premium Nexaro brand identity and Dark Mode.

Copy-paste this component to the `src/components/ui/` folder:
```tsx
empty-state.tsx
import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  title: string
  description: string
  icons?: LucideIcon[]
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  title,
  description,
  icons = [],
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "bg-background border-border hover:border-border/80 text-center",
      "border-2 border-dashed rounded-xl p-14 w-full max-w-[620px]",
      "group hover:bg-muted/50 transition duration-500 hover:duration-200",
      className
    )}>
      <div className="flex justify-center isolate">
        {icons.length === 3 ? (
          <>
            <div className="bg-background size-12 grid place-items-center rounded-xl relative left-2.5 top-1.5 -rotate-6 shadow-lg ring-1 ring-border group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
              {React.createElement(icons[0], {
                className: "w-6 h-6 text-muted-foreground"
              })}
            </div>
            <div className="bg-background size-12 grid place-items-center rounded-xl relative z-10 shadow-lg ring-1 ring-border group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
              {React.createElement(icons[1], {
                className: "w-6 h-6 text-muted-foreground"
              })}
            </div>
            <div className="bg-background size-12 grid place-items-center rounded-xl relative right-2.5 top-1.5 rotate-6 shadow-lg ring-1 ring-border group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
              {React.createElement(icons[2], {
                className: "w-6 h-6 text-muted-foreground"
              })}
            </div>
          </>
        ) : (
          <div className="bg-background size-12 grid place-items-center rounded-xl shadow-lg ring-1 ring-border group-hover:-translate-y-0.5 transition duration-500 group-hover:duration-200">
            {icons[0] && React.createElement(icons[0], {
              className: "w-6 h-6 text-muted-foreground"
            })}
          </div>
        )}
      </div>
      <h2 className="text-foreground font-medium mt-6">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{description}</p>
      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          className={cn(
            "mt-4",
            "shadow-sm active:shadow-none"
          )}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

demo.tsx
import { EmptyState } from "@/components/ui/empty-state"
import { 
  FileText, 
  Link, 
  Files, 
  Search, 
  MessageSquare, 
  Mail, 
  Image,
  FileQuestion,
  Settings
} from "lucide-react"

function EmptyStateDefault() {
  return (
    <EmptyState
      title="No Forms Created"
      description="You can create a new template to add in your pages."
      icons={[FileText, Link, Files]}
      action={{
        label: "Create Form",
        onClick: () => console.log("Create form clicked")
      }}
    />
  )
}

function EmptyStateMessages() {
  return (
    <EmptyState
      title="No Messages"
      description="Start a conversation by sending a message."
      icons={[MessageSquare, Mail]}
      action={{
        label: "Send Message",
        onClick: () => console.log("Send message clicked")
      }}
    />
  )
}

function EmptyStateSearch() {
  return (
    <EmptyState
      title="No Results Found"
      description="Try adjusting your search filters."
      icons={[Search, FileQuestion]}
    />
  )
}

function EmptyStateMedia() {
  return (
    <EmptyState
      title="No Images"
      description="Upload images to get started with your gallery."
      icons={[Image]}
      action={{
        label: "Upload Images",
        onClick: () => console.log("Upload clicked")
      }}
    />
  )
}

function EmptyStateSettings() {
  return (
    <EmptyState
      title="No Settings"
      description="Configure your application settings to get started."
      icons={[Settings]}
      action={{
        label: "Configure",
        onClick: () => console.log("Configure clicked")
      }}
    />
  )
}

export {
  EmptyStateDefault,
  EmptyStateMessages,
  EmptyStateSearch,
  EmptyStateMedia,
  EmptyStateSettings,
}
```

Copy-paste these files for dependencies:
```tsx
shadcn/button
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }

```

Install NPM dependencies:
```bash
lucide-react, @radix-ui/react-slot, class-variance-authority
```
