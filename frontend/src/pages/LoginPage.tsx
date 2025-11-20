import { Box, Button, Container, Typography, Paper, Stack } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import AppleIcon from '@mui/icons-material/Apple';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

export const LoginPage = () => {

  const handleGoogleLogin = () => {
    // Redirect to backend Google OAuth endpoint
    window.location.href = '/api/auth/google';
  };

  const handleFacebookLogin = () => {
    // Redirect to backend Facebook OAuth endpoint
    window.location.href = '/api/auth/facebook';
  };

  const handleAppleLogin = () => {
    // Apple OAuth not configured in backend yet
    alert('Apple login is not configured yet. Please use Google or Facebook.');
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Stack spacing={3} alignItems="center">
            <ShoppingCartIcon sx={{ fontSize: 64, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" gutterBottom>
              K-Plista
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Your smart grocery list companion. Sign in to get started.
            </Typography>

            <Stack spacing={2} sx={{ width: '100%', mt: 3 }}>
              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<GoogleIcon />}
                onClick={handleGoogleLogin}
                sx={{
                  bgcolor: '#4285F4',
                  '&:hover': { bgcolor: '#357ABD' },
                }}
              >
                Sign in with Google
              </Button>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<FacebookIcon />}
                onClick={handleFacebookLogin}
                sx={{
                  bgcolor: '#1877F2',
                  '&:hover': { bgcolor: '#145DBF' },
                }}
              >
                Sign in with Facebook
              </Button>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<AppleIcon />}
                onClick={handleAppleLogin}
                sx={{
                  bgcolor: '#000000',
                  '&:hover': { bgcolor: '#333333' },
                }}
              >
                Sign in with Apple
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
};
