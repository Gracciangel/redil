import { createTheme } from '@mui/material/styles'

export const appTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#c084fc',
      light: '#e9d5ff',
      dark: '#9333ea',
      contrastText: '#1b0a1e',
    },
    secondary: {
      main: '#f0abfc',
    },
    background: {
      default: '#000000',
      paper: '#171219',
    },
    error: {
      main: '#ff8fa0',
    },
    success: {
      main: '#4ade80',
    },
    text: {
      primary: '#f5eef8',
      secondary: '#b6a8bf',
    },
    divider: 'rgba(255,255,255,0.09)',
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "'Roboto', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
  },
})