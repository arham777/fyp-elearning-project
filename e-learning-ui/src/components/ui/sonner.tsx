import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-left"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md rounded-lg px-3 py-2 text-sm",
          description: "group-[.toast]:text-muted-foreground text-xs",
          actionButton:
            "group-[.toast]:bg-accent-neutral group-[.toast]:text-accent-neutral-foreground h-7 px-2 text-xs",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground h-7 px-2 text-xs",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
