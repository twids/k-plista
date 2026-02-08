import { createTheme, type Theme } from "@mui/material/styles";

// Default theme - clean and simple MUI default styling
export const defaultTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { margin: 0, padding: 0 },
      },
    },
  },
});

// Modern theme - sophisticated light theme with rounded corners and custom styling
export const modernTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: "#f6f7f9",
      paper: "#ffffff",
    },
    primary: {
      main: "#111827",
    },
    secondary: {
      main: "#6366f1",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
    },
    divider: "rgba(0,0,0,0.08)",
  },

  typography: {
    fontFamily: `"Inter", "SF Pro Text", system-ui, sans-serif`,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600 },
  },

  shape: {
    borderRadius: 14,
  },

  shadows: [
    "none",
    "0px 2px 6px rgba(0,0,0,0.04)",
    "0px 4px 12px rgba(0,0,0,0.06)",
    "0px 6px 18px rgba(0,0,0,0.08)",
    ...Array(21).fill("0px 8px 30px rgba(0,0,0,0.08)"),
  ] as Theme['shadows'],

  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: "10px 18px",
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18,
        },
      },
    },
  },
});

// Dark theme - dark mode variant with similar styling to modern theme
export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0f172a",
      paper: "#1e293b",
    },
    primary: {
      main: "#60a5fa",
    },
    secondary: {
      main: "#818cf8",
    },
    text: {
      primary: "#f1f5f9",
      secondary: "#cbd5e1",
    },
    divider: "rgba(255,255,255,0.12)",
  },

  typography: {
    fontFamily: `"Inter", "SF Pro Text", system-ui, sans-serif`,
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    button: { textTransform: "none", fontWeight: 600 },
  },

  shape: {
    borderRadius: 14,
  },

  shadows: [
    "none",
    "0px 2px 6px rgba(0,0,0,0.3)",
    "0px 4px 12px rgba(0,0,0,0.4)",
    "0px 6px 18px rgba(0,0,0,0.5)",
    ...Array(21).fill("0px 8px 30px rgba(0,0,0,0.6)"),
  ] as Theme['shadows'],

  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: "10px 18px",
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 12,
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18,
        },
      },
    },
  },
});

// Theme registry
export const THEMES = {
  default: defaultTheme,
  modern: modernTheme,
  dark: darkTheme,
} as const;

// Type for theme names
export type ThemeName = keyof typeof THEMES;

// Theme options for UI dropdowns
export const THEME_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'modern', label: 'Modern' },
  { value: 'dark', label: 'Dark' },
] as const;

// Helper function to get theme with fallback
export const getTheme = (themeName?: string | null): Theme => {
  if (!themeName || !(themeName in THEMES)) {
    return THEMES.default;
  }
  return THEMES[themeName as ThemeName];
};
