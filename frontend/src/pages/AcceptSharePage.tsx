import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Container, Paper } from '@mui/material';
import { groceryListService } from '../services/groceryListService';
import { useAuth } from '../hooks/useAuth';

export const AcceptSharePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: isAuthLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const acceptShare = async () => {
      if (isAuthLoading || !user || !token) {
        return;
      }

      try {
        const result = await groceryListService.acceptMagicLink(token);
        // Successfully accepted, redirect to the list
        navigate(`/lists/${result.listId}`, { 
          replace: true,
          state: { message: `You now have access to "${result.listName}" shared by ${result.ownerName}` }
        });
      } catch (err) {
        console.error('Failed to accept share:', err);
        setError('Invalid share link. Please check the link or ask the list owner for a new one.');
      }
    };

    // Wait for authentication to complete
    if (!isAuthLoading) {
      if (!user) {
        // User is not authenticated, redirect to login with returnUrl
        // The AuthContext will handle the redirect back after login
        navigate(`/login?returnUrl=/share/${token}`, { replace: true });
      } else {
        acceptShare();
      }
    }
  }, [token, user, isAuthLoading, navigate]);

  if (error) {
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
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" color="error" gutterBottom>
              Unable to Access List
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {error}
            </Typography>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Accepting share invitation...
        </Typography>
      </Box>
    </Container>
  );
};
