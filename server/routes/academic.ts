import { Hono } from 'hono';
import { jwt } from 'hono/jwt';
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
} from '../controllers/academic';

const academicRouter = new Hono();
const JWT_SECRET = 'campusflow-secret-key-12345';

const authMiddleware = jwt({ secret: JWT_SECRET, alg: 'HS256' });

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

// Notice Summarizer (Can be public or protected; let's keep it public for easy integration/testing)
academicRouter.post('/notices/summarize', handleSummarizeNotice);

export default academicRouter;
