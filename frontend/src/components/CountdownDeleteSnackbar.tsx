import { Snackbar, Alert, Button, Box, Typography } from '@mui/material';

interface CountdownDeleteSnackbarProps {
  open: boolean;
  message: string;
  countdown: number;
  onCancel: () => void;
}

export const CountdownDeleteSnackbar = ({
  open,
  message,
  countdown,
  onCancel,
}: CountdownDeleteSnackbarProps) => {
  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 80, sm: 24 } }}
    >
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" onClick={onCancel}>
            UNDO
          </Button>
        }
        sx={{ width: '100%', alignItems: 'center' }}
      >
        <Box>
          <Typography variant="body2">{message}</Typography>
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
            Deleting in {countdown} second{countdown !== 1 ? 's' : ''}...
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
};
