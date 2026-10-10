import { Router } from 'express';
import { AuthService } from './service';
import { authMiddleware } from './middleware';

export const authRoutes = Router();

authRoutes.post('/register', async (req, res) => {
  try {
    const { email, password, nickname, avatarPreset } = req.body;
    const result = await AuthService.register({ email, password, nickname, avatarPreset });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

authRoutes.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

authRoutes.get('/me', authMiddleware, async (req, res) => {
  try {
    // @ts-ignore
    const user = await AuthService.getUser(req.user!.userId);
    res.json(user);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});
