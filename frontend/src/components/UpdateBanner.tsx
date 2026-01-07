import { Alert, Button, Slide } from '@mui/material';
import { useVersionCheck } from '../hooks/useVersionCheck';

const BANNER_Z_INDEX = 9999;

export const UpdateBanner = () => {
  const { hasUpdate, refreshPage } = useVersionCheck();

  return (
    <Slide direction="down" in={hasUpdate} mountOnEnter unmountOnExit>
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={refreshPage}>
            Uppdatera
          </Button>
        }
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: BANNER_Z_INDEX,
          borderRadius: 0,
        }}
      >
        En ny version av applikationen är tillgänglig
      </Alert>
    </Slide>
  );
};
