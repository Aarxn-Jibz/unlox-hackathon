import { hc } from 'hono/client';
import type { AppType } from '../../server/index';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Type-safe API Client wrapper utilizing Hono RPC.
 * This compiles route path and request/response types directly from the backend router definitions.
 */
export const api = hc<AppType>(API_URL);

/*
================================================================================
SAMPLE USAGE EXAMPLES
================================================================================

Below are examples of how frontend developers can call endpoints with full type-safety.
TypeScript will automatically validate route paths, query parameters, request bodies (JSON/Form),
and autocomplete response types.

1. Fetch tasks (GET /api/tasks):
   ---------------------------------
   async function getTasks() {
     const res = await api.api.tasks.$get();
     if (res.ok) {
       const data = await res.json();
       console.log('Tasks:', data);
     }
   }

2. Login user (POST /login - authRouter is mounted at root '/'):
   --------------------------------------------------------------
   async function handleLogin() {
     const res = await api.login.$post({
       json: {
         email: 'student@campusflow.edu',
         password: 'securepassword123'
       }
     });
     
     if (res.ok) {
       const data = await res.json();
       console.log('Login success:', data.token);
     } else {
       const errorData = await res.json();
       console.error('Login failed:', errorData.error);
     }
   }

3. Post a placement preparation query (POST /api/placement):
   ----------------------------------------------------------
   async function submitPrepQuery() {
     const res = await api.api.placement.$post({
       json: {
         topic: 'Data Structures',
         difficulty: 'medium'
       }
     });
     const data = await res.json();
   }
*/
