import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, CircularProgress, Typography, Container, Paper } from '@mui/material';
import { groceryListService } from '../services/groceryListService';
import { useAuth } from '../hooks/useAuth';

export const AcceptSharePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const acceptShare = async () => {
      if (authLoading || !user || !token || accepting) {
        return;
      }

      setAccepting(true);
      try {
        const result = await groceryListService.acceptMagicLink(token);
        // Successfully accepted, redirect to the list
        navigate(`/lists/${result.listId}`, { 
          replace: true,
          state: { message: `You now have access to "${result.listName}" shared by ${result.ownerName}` }
        });
      } catch (err) {
        console.error('Failed to accept share:', err);
        setError('Invalid or expired share link. Please ask the list owner to send you a new link.');
      } finally {
        setAccepting(false);
      }
    };

    // Wait for authentication to complete
    if (!authLoading) {
      if (!user) {
        // User is not authenticated, redirect to login with returnUrl
        // The AuthContext will handle the redirect back after login
        navigate(`/login?returnUrl=/share/${token}`, { replace: true });
      } else {
        acceptShare();
      }
    }
  }, [token, user, authLoading, navigate, accepting]);

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
