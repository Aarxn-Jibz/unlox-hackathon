import type { Context } from 'hono';
import {
  getTasksByUserId,
  createTask,
  updateTask,
  deleteTask,
  getAttendanceByUserId,
  upsertAttendance,
  getPlacementAttemptsByUserId,
  createPlacementAttempt,
  getDeadlinesByUserId,
  createDeadline,
} from '../models/academic';
import type { BunkCalcInput, BunkCalcOutput, NoticePayload, NoticeSummary } from '../../types';

// n8n webhook URL for Google Calendar automation
const N8N_WEBHOOK_URL = 'https://campusflow-n8n.onrender.com/webhook/create-event';

// Tasks Controllers
export async function handleGetTasks(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string };
    const tasks = await getTasksByUserId(db, userPayload.id);
    return c.json({ tasks });
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

export async function handleCreateTask(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string };
    const body = await c.req.json();

    if (!body.title || !body.status || !body.priority) {
      return c.json({ error: 'Title, status, and priority are required' }, 400);
    }

    const task = await createTask(db, userPayload.id, body);
    return c.json({ task }, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

export async function handleUpdateTask(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string };
    const taskId = c.req.param('id') as string;
    const body = await c.req.json();

    const success = await updateTask(db, userPayload.id, taskId, body);
    if (!success) {
      return c.json({ error: 'Task not found or update failed' }, 404);
    }

    return c.json({ message: 'Task updated successfully' });
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

export async function handleDeleteTask(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string };
    const taskId = c.req.param('id') as string;

    const success = await deleteTask(db, userPayload.id, taskId);
    if (!success) {
      return c.json({ error: 'Task not found or deletion failed' }, 404);
    }

    return c.json({ message: 'Task deleted successfully' });
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

// Attendance / Bunk Calculator Controllers
export async function handleGetAttendance(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string };
    const attendance = await getAttendanceByUserId(db, userPayload.id);
    return c.json({ attendance });
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

export async function handleCalculateBunk(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string };
    const body: BunkCalcInput = await c.req.json();

    if (!body.subjects || !Array.isArray(body.subjects)) {
      return c.json({ error: 'Subjects array is required' }, 400);
    }

    // Process and upsert each subject attendance
    for (const sub of body.subjects) {
      await upsertAttendance(db, userPayload.id, sub);
    }

    // Retrieve full calculated list
    const updatedAttendance = await getAttendanceByUserId(db, userPayload.id);

    let totalAttended = 0;
    let totalClasses = 0;
    for (const sub of updatedAttendance) {
      totalAttended += sub.attended;
      totalClasses += sub.total;
    }

    const overallPercentage = totalClasses > 0 ? (totalAttended / totalClasses) * 100 : 0;

    const response: BunkCalcOutput = {
      subjects: updatedAttendance,
      overallPercentage,
    };

    return c.json(response);
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

// Notice Summarizer Controller
export async function handleSummarizeNotice(c: Context) {
  try {
    const body: NoticePayload = await c.req.json();

    if (!body.title || !body.content) {
      return c.json({ error: 'Title and content are required' }, 400);
    }

    const contentLower = body.content.toLowerCase();

    // Simple heuristic parser for mock notice summarization
    const actionItems: string[] = [];
    const keyDates: { event: string; date: string }[] = [];
    let urgency: 'low' | 'medium' | 'high' = 'low';

    if (
      contentLower.includes('exam') ||
      contentLower.includes('test') ||
      contentLower.includes('quiz')
    ) {
      urgency = 'high';
      actionItems.push('Review syllabus and prepare study schedule.');
      keyDates.push({ event: 'Exam Commencement', date: 'Refer to exam timetable' });
    }

    if (
      contentLower.includes('fee') ||
      contentLower.includes('payment') ||
      contentLower.includes('fine')
    ) {
      urgency = 'high';
      actionItems.push('Submit academic fee to prevent late charges.');
      keyDates.push({ event: 'Fee Payment Deadline', date: 'Check financial portal' });
    }

    if (
      contentLower.includes('assignment') ||
      contentLower.includes('submission') ||
      contentLower.includes('project')
    ) {
      urgency = 'medium';
      actionItems.push('Complete and submit assignment deliverables.');
      keyDates.push({ event: 'Submission Due Date', date: 'Within 7 days' });
    }

    if (
      contentLower.includes('holiday') ||
      contentLower.includes('vacation') ||
      contentLower.includes('closed')
    ) {
      urgency = 'low';
      actionItems.push('Plan personal schedules around university holiday dates.');
    }

    if (actionItems.length === 0) {
      actionItems.push('Read the original notice details and follow any specified guidelines.');
    }

    const summary: NoticeSummary = {
      originalTitle: body.title,
      summary: `Automated summary of: "${body.title}". This notice discusses guidelines or events regarding academic activities. Details mention: ${body.content.slice(0, 100)}...`,
      actionItems,
      keyDates,
      urgency,
    };

    return c.json(summary);
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

// Placement Attempts Controllers
export async function handleGetPlacementAttempts(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string };
    const attempts = await getPlacementAttemptsByUserId(db, userPayload.id);
    return c.json({ attempts });
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

export async function handleCreatePlacementAttempt(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string };
    const body = await c.req.json();

    if (!body.companyName || !body.role || !body.stage || !body.date) {
      return c.json({ error: 'CompanyName, role, stage, and date are required' }, 400);
    }

    const attempt = await createPlacementAttempt(db, userPayload.id, body);
    return c.json({ attempt }, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

// Academic Deadlines
export async function handleGetDeadlines(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string };
    const deadlines = await getDeadlinesByUserId(db, userPayload.id);
    return c.json({ deadlines });
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}

export async function handleCreateDeadline(c: Context) {
  try {
    const db = c.env.DB as D1Database;
    const userPayload = c.get('jwtPayload') as { id: string; email?: string; googleAccount?: string };
    const body = await c.req.json();

    if (!body.subject || !body.title || !body.dueDate) {
      return c.json({ error: 'subject, title, and dueDate are required' }, 400);
    }

    // 1. Save deadline to D1 database
    const deadline = await createDeadline(db, userPayload.id, {
      subject: body.subject,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
      dueTime: body.dueTime || '12:00',
    });

    // 2. Fire n8n webhook to create a Google Calendar event (non-blocking, best-effort)
    const calendarId = body.calendarId || userPayload.googleAccount || userPayload.email || 'primary';
    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        calendarId,
        subject: body.subject,
        title: body.title,
        date: body.dueDate,
        time: body.dueTime || '12:00',
      }),
    }).catch((err) => console.warn('[n8n] Calendar webhook failed:', err));

    return c.json({ deadline }, 201);
  } catch (error) {
    return c.json({ error: (error as Error).message || 'Internal Server Error' }, 500);
  }
}
