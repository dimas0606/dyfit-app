// client/src/components/ui/badge.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils" // Assume que você tem essa função helper do shadcn

// Define as variantes de estilo para o badge usando class-variance-authority
const badgeVariants = cva(
  // Classes base aplicadas a todas as variantes
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      // Define as diferentes variantes visuais
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90", // Estilo padrão (geralmente azul/preto)
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-secondary dark:text-secondary-foreground dark:hover:bg-secondary/90", // Estilo secundário (geralmente cinza)
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 dark:bg-destructive dark:text-destructive-foreground dark:hover:bg-destructive/90", // Estilo destrutivo (geralmente vermelho)
        outline:
          "text-foreground border-border", // Estilo contornado
        // --- ADICIONADO VARIANTE "success" ---
        success:
          "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300", // Estilo de sucesso (verde)
        // Você pode adicionar mais variantes aqui (warning, info, etc.)
      },
    },
    // Define a variante padrão se nenhuma for especificada
    defaultVariants: {
      variant: "default",
    },
  }
)

// Define as propriedades que o componente Badge pode receber
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, // Permite passar props HTML padrão (id, className, etc.)
    VariantProps<typeof badgeVariants> {} // Herda as variantes definidas acima (variant: "default" | "secondary" | ...)

// Componente Funcional Badge
function Badge({ className, variant, ...props }: BadgeProps) {
  // Usa a função cn (classnames) para combinar as classes base e variantes com classes personalizadas (className)
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

// Exporta o componente Badge e as variantes (para uso em outros lugares, se necessário)
export { Badge, badgeVariants }