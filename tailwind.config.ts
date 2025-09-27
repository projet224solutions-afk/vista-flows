import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
      extend: {
        colors: {
          border: "hsl(var(--border))",
          input: "hsl(var(--input))",
          ring: "hsl(var(--ring))",
          background: "hsl(var(--background))",
          foreground: "hsl(var(--foreground))",
          primary: {
            DEFAULT: "hsl(var(--primary))",
            foreground: "hsl(var(--primary-foreground))",
          },
          secondary: {
            DEFAULT: "hsl(var(--secondary))",
            foreground: "hsl(var(--secondary-foreground))",
          },
          destructive: {
            DEFAULT: "hsl(var(--destructive))",
            foreground: "hsl(var(--destructive-foreground))",
          },
          muted: {
            DEFAULT: "hsl(var(--muted))",
            foreground: "hsl(var(--muted-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--accent))",
            foreground: "hsl(var(--accent-foreground))",
          },
          popover: {
            DEFAULT: "hsl(var(--popover))",
            foreground: "hsl(var(--popover-foreground))",
          },
          card: {
            DEFAULT: "hsl(var(--card))",
            foreground: "hsl(var(--card-foreground))",
          },
          sidebar: {
            DEFAULT: "hsl(var(--sidebar-background))",
            foreground: "hsl(var(--sidebar-foreground))",
            primary: "hsl(var(--sidebar-primary))",
            "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
            accent: "hsl(var(--sidebar-accent))",
            "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
            border: "hsl(var(--sidebar-border))",
            ring: "hsl(var(--sidebar-ring))",
          },
          // Role-based colors
          vendeur: {
            primary: "hsl(var(--vendeur-primary))",
            secondary: "hsl(var(--vendeur-secondary))",
            accent: "hsl(var(--vendeur-accent))",
          },
          livreur: {
            primary: "hsl(var(--livreur-primary))",
            secondary: "hsl(var(--livreur-secondary))",
            accent: "hsl(var(--livreur-accent))",
          },
          taxi: {
            primary: "hsl(var(--taxi-primary))",
            secondary: "hsl(var(--taxi-secondary))",
            accent: "hsl(var(--taxi-accent))",
          },
          syndicat: {
            primary: "hsl(var(--syndicat-primary))",
            secondary: "hsl(var(--syndicat-secondary))",
            accent: "hsl(var(--syndicat-accent))",
          },
          transitaire: {
            primary: "hsl(var(--transitaire-primary))",
            secondary: "hsl(var(--transitaire-secondary))",
            accent: "hsl(var(--transitaire-accent))",
          },
          admin: {
            primary: "hsl(var(--admin-primary))",
            secondary: "hsl(var(--admin-secondary))",
            accent: "hsl(var(--admin-accent))",
          },
          client: {
            primary: "hsl(var(--client-primary))",
            secondary: "hsl(var(--client-secondary))",
            accent: "hsl(var(--client-accent))",
          },
        },
        backgroundImage: {
          'vendeur-gradient': 'var(--vendeur-gradient)',
          'livreur-gradient': 'var(--livreur-gradient)',
          'taxi-gradient': 'var(--taxi-gradient)',
          'syndicat-gradient': 'var(--syndicat-gradient)',
          'transitaire-gradient': 'var(--transitaire-gradient)',
          'admin-gradient': 'var(--admin-gradient)',
          'client-gradient': 'var(--client-gradient)',
          'elegant-gradient': 'var(--gradient-elegant)',
        },
        boxShadow: {
          'elegant': 'var(--shadow-elegant)',
          'glow': 'var(--shadow-glow)',
        },
        borderRadius: {
          lg: "var(--radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
        },
        keyframes: {
          "accordion-down": {
            from: {
              height: "0",
            },
            to: {
              height: "var(--radix-accordion-content-height)",
            },
          },
          "accordion-up": {
            from: {
              height: "var(--radix-accordion-content-height)",
            },
            to: {
              height: "0",
            },
          },
          "fade-in": {
            "0%": {
              opacity: "0",
              transform: "translateY(20px)"
            },
            "100%": {
              opacity: "1",
              transform: "translateY(0)"
            }
          },
          "scale-in": {
            "0%": {
              transform: "scale(0.95)",
              opacity: "0"
            },
            "100%": {
              transform: "scale(1)",
              opacity: "1"
            }
          },
          "glow": {
            "0%, 100%": {
              boxShadow: "0 0 20px hsl(217 91% 60% / 0.1)"
            },
            "50%": {
              boxShadow: "0 0 30px hsl(217 91% 60% / 0.2)"
            }
          },
        },
        animation: {
          "accordion-down": "accordion-down 0.2s ease-out",
          "accordion-up": "accordion-up 0.2s ease-out",
          "fade-in": "fade-in 0.6s ease-out",
          "scale-in": "scale-in 0.4s ease-out",
          "glow": "glow 3s ease-in-out infinite",
        },
      },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
