import { Alert, Button, Box, Typography, Stack } from '@mui/material';

interface CountdownDeleteItem {
  itemId: string;
  message: string;
  countdown: number;
}

interface CountdownDeleteSnackbarProps {
  deletingItems: CountdownDeleteItem[];
  onCancel: (itemId: string) => void;
}

export const CountdownDeleteSnackbar = ({
  deletingItems,
  onCancel,
}: CountdownDeleteSnackbarProps) => {
  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        bottom: { xs: 80, sm: 24 },
        left: '50%',
        transform: 'translateX(-50%)',
        width: { xs: 'calc(100% - 32px)', sm: 'auto' },
        minWidth: { sm: 400 },
        maxWidth: { xs: '100%', sm: 500 },
        zIndex: 1400,
      }}
    >
      {deletingItems.map((item) => (
        <Alert
          key={item.itemId}
          severity="warning"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => onCancel(item.itemId)}
            >
              UNDO
            </Button>
          }
          sx={{ width: '100%', alignItems: 'center' }}
        >
          <Box>
            <Typography variant="body2">{item.message}</Typography>
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
              Deleting in {item.countdown} second{item.countdown !== 1 ? 's' : ''}...
            </Typography>
          </Box>
        </Alert>
      ))}
    </Stack>
  );
};
