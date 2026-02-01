import { Box, Button, Container, Typography, Paper, Stack, CircularProgress } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../services/api';

export const LoginPage = () => {
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/lists';
  const [availableProviders, setAvailableProviders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await api.get<{ providers: string[] }>('/auth/providers');
        setAvailableProviders(response.providers);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch available providers:', err);
        setError('Failed to load authentication providers. Please check your connection and refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, []);

  const handleGoogleLogin = () => {
    // Store returnUrl in sessionStorage before redirecting to OAuth
    sessionStorage.setItem('returnUrl', returnUrl);
    // Redirect to backend Google OAuth endpoint
    window.location.href = '/api/auth/google';
  };

  const handleFacebookLogin = () => {
    // Store returnUrl in sessionStorage before redirecting to OAuth
    sessionStorage.setItem('returnUrl', returnUrl);
    // Redirect to backend Facebook OAuth endpoint
    window.location.href = '/api/auth/facebook';
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
              Koplista
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Your smart grocery list companion. Sign in to get started.
            </Typography>

            {loading ? (
              <CircularProgress />
            ) : error ? (
              <Typography variant="body2" color="error" textAlign="center">
                {error}
              </Typography>
            ) : availableProviders.length === 0 ? (
              <Typography variant="body2" color="error" textAlign="center">
                Authentication is not configured. Please contact your administrator.
              </Typography>
            ) : (
              <Stack spacing={2} sx={{ width: '100%', mt: 3 }}>
                {availableProviders.includes('google') && (
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
                )}

                {availableProviders.includes('facebook') && (
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
                )}
              </Stack>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
              By signing in, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Stack>
        </Paper>
      </Box>
    </Container>
  );
};
