import { Box, Button, Container, Typography, Paper, Stack } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import FacebookIcon from '@mui/icons-material/Facebook';
import AppleIcon from '@mui/icons-material/Apple';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { authService } from '../services/authService';
import { useAuth } from '../hooks/useAuth';

export const LoginPage = () => {
  const { login } = useAuth();

  const handleGoogleLogin = async () => {
    // In a real app, this would integrate with Google OAuth
    // For demo purposes, we'll create a mock user and call the backend
    try {
      const mockGoogleUser = {
        provider: 'Google',
        externalUserId: 'google-' + crypto.randomUUID(),
        email: 'demo.user@gmail.com',
        name: 'Demo User',
        profilePictureUrl: 'https://via.placeholder.com/150'
      };
      
      const response = await authService.login(
        mockGoogleUser.provider,
        mockGoogleUser.externalUserId,
        mockGoogleUser.email,
        mockGoogleUser.name,
        mockGoogleUser.profilePictureUrl
      );
      
      await login(mockGoogleUser.provider, response.token);
      window.location.href = '/';
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleFacebookLogin = async () => {
    // Similar implementation for Facebook
    try {
      const mockFacebookUser = {
        provider: 'Facebook',
        externalUserId: 'facebook-' + crypto.randomUUID(),
        email: 'demo.user@facebook.com',
        name: 'Demo User',
        profilePictureUrl: 'https://via.placeholder.com/150'
      };
      
      const response = await authService.login(
        mockFacebookUser.provider,
        mockFacebookUser.externalUserId,
        mockFacebookUser.email,
        mockFacebookUser.name,
        mockFacebookUser.profilePictureUrl
      );
      
      await login(mockFacebookUser.provider, response.token);
      window.location.href = '/';
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleAppleLogin = async () => {
    // Similar implementation for Apple
    try {
      const mockAppleUser = {
        provider: 'Apple',
        externalUserId: 'apple-' + crypto.randomUUID(),
        email: 'demo.user@icloud.com',
        name: 'Demo User',
        profilePictureUrl: 'https://via.placeholder.com/150'
      };
      
      const response = await authService.login(
        mockAppleUser.provider,
        mockAppleUser.externalUserId,
        mockAppleUser.email,
        mockAppleUser.name,
        mockAppleUser.profilePictureUrl
      );
      
      await login(mockAppleUser.provider, response.token);
      window.location.href = '/';
    } catch (error) {
      console.error('Login failed:', error);
    }
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
