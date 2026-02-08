import { Alert, Button, Slide } from '@mui/material';
import { useVersionCheck } from '../hooks/useVersionCheck';

export const UpdateBanner = () => {
  const { hasUpdate, refreshPage, dismissUpdate } = useVersionCheck();

  return (
    <Slide direction="down" in={hasUpdate} mountOnEnter unmountOnExit>
      <Alert
        severity="info"
        onClose={dismissUpdate}
        action={
          <Button color="inherit" size="small" onClick={refreshPage}>
            Update
          </Button>
        }
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.tooltip + 1,
          borderRadius: 0,
        }}
      >
        A new version of the application is available
      </Alert>
    </Slide>
  );
};
