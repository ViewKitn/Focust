import { Router } from 'express';
import { db } from '../db';
import { focusSessions } from '../db/schema';
import { eq, and, gte, desc, isNull } from 'drizzle-orm';
import { AuthRequest } from '../auth/middleware';
import { SessionSummary } from '@connecta-focus/shared';

export const historyHandler = async (req: AuthRequest, res: any) => {
  try {
    const userId = req.user!.userId;
    const { range } = req.query; 
    
    let startDate = new Date(0);
    const now = new Date();
    
    if (range === 'today') {
      const offset = 7 * 60 * 60 * 1000; // Demo calendar: Asia/Bangkok.
      startDate = new Date(Math.floor((now.getTime() + offset) / 86400000) * 86400000 - offset);
    } else if (range === 'week') {
      const offset = 7 * 60 * 60 * 1000;
      startDate = new Date(Math.floor((now.getTime() + offset) / 86400000) * 86400000 - offset - 6 * 86400000);
    }
    
    const sessions = await db.select()
      .from(focusSessions)
      .where(
        and(
          eq(focusSessions.userId, userId),
          gte(focusSessions.createdAt, startDate)
        )
      )
      .orderBy(desc(focusSessions.createdAt));
      
    const summary: SessionSummary = {
      totalFocusTimeMs: 0,
      completedSessions: 0,
      endedEarlySessions: 0,
      goalAchieved: 0,
      goalPartial: 0,
      goalNotAchieved: 0,
      pendingReflections: 0
    };

    for (const s of sessions) {
      if (s.status === 'ended') {
        summary.totalFocusTimeMs += s.focusDurationMs || 0;
        if (s.endReason === 'completed') summary.completedSessions++;
        if (s.endReason === 'ended_early') summary.endedEarlySessions++;
        
        if (s.goalOutcome === 'achieved') summary.goalAchieved++;
        else if (s.goalOutcome === 'partial') summary.goalPartial++;
        else if (s.goalOutcome === 'not_achieved') summary.goalNotAchieved++;
        
        if (!s.reflectionSubmittedAt) {
          summary.pendingReflections++;
        }
      }
    }
      
    res.json({ sessions, summary });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const reflectionHandler = async (req: AuthRequest, res: any) => {
  try {
    const userId = req.user!.userId;
    const sessionId = req.params.sessionId;
    const { goalOutcome, obstacles, nextSteps } = req.body;
    
    const [session] = await db.select().from(focusSessions).where(eq(focusSessions.id, sessionId));
    
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
    
    const [updated] = await db.update(focusSessions).set({
      goalOutcome,
      reflectionObstacles: obstacles,
      reflectionNextSteps: nextSteps,
      reflectionSubmittedAt: new Date(),
    }).where(eq(focusSessions.id, sessionId)).returning();
    
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
