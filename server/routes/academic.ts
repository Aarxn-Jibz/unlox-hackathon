import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import {
  handleGetTasks,
  handleCreateTask,
  handleUpdateTask,
  handleDeleteTask,
  handleGetAttendance,
  handleCalculateBunk,
  handleSummarizeNotice,
  handleGetPlacementAttempts,
  handleCreatePlacementAttempt,
  handleGetDeadlines,
  handleCreateDeadline,
} from '../controllers/academic';

const academicRouter = new Hono();

// Protected Tasks API
academicRouter.get('/tasks', authMiddleware, handleGetTasks);
academicRouter.post('/tasks', authMiddleware, handleCreateTask);
academicRouter.put('/tasks/:id', authMiddleware, handleUpdateTask);
academicRouter.delete('/tasks/:id', authMiddleware, handleDeleteTask);

// Protected Attendance & Bunk Calculator API
academicRouter.get('/attendance', authMiddleware, handleGetAttendance);
academicRouter.post('/attendance/bunk', authMiddleware, handleCalculateBunk);

// Protected Placement Attempts API
academicRouter.get('/placements', authMiddleware, handleGetPlacementAttempts);
academicRouter.post('/placements', authMiddleware, handleCreatePlacementAttempt);

// Protected Deadlines API
academicRouter.get('/deadlines', authMiddleware, handleGetDeadlines);
academicRouter.post('/deadlines', authMiddleware, handleCreateDeadline);

// Notice Summarizer (Can be public or protected; let's keep it public for easy integration/testing)
academicRouter.post('/notices/summarize', handleSummarizeNotice);

export default academicRouter;
