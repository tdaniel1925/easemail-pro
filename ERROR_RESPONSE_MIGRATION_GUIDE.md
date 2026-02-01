# Error Response Standardization Guide

## Overview

Standardized error response format across all API routes for consistent client-side error handling.

**Status:** ✅ Infrastructure complete, ready for API route migration

---

## Problem Solved

### Before (Inconsistent error responses)
```typescript
// Route 1
return NextResponse.json({ error: 'Not found' }, { status: 404 });

// Route 2
return NextResponse.json({ message: 'User not found' }, { status: 404 });

// Route 3
return NextResponse.json({ error: { message: 'Not found', code: 404 } });

// Route 4
return new Response('Not found', { status: 404 });
```

**Issues:**
- Different error formats across routes
- Client can't reliably parse errors
- No error codes for programmatic handling
- No timestamps for debugging
- Inconsistent status codes

### After (Standardized responses)
```typescript
import { notFound, successResponse } from '@/lib/api/error-response';

// All routes use same format
export async function GET(request: NextRequest) {
  const user = await findUser();

  if (!user) {
    return notFound('User not found');
  }

  return successResponse(user);
}
```

**Benefits:**
- Consistent error structure
- Machine-readable error codes
- TypeScript type safety
- Built-in logging
- Easy client-side parsing

---

## Response Formats

### Success Response
```typescript
{
  "success": true,
  "data": { /* your data */ },
  "message": "Operation completed successfully",  // optional
  "timestamp": "2026-01-31T12:00:00.000Z"
}
```

### Error Response
```typescript
{
  "success": false,
  "error": "User-friendly error message",
  "code": "NOT_FOUND",                  // Machine-readable code
  "details": { /* optional details */ },
  "timestamp": "2026-01-31T12:00:00.000Z",
  "path": "/api/users/123"              // optional
}
```

---

## Usage Examples

### Basic Error Responses

```typescript
import {
  successResponse,
  errorResponse,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  rateLimited,
  internalError,
  ERROR_CODES,
} from '@/lib/api/error-response';

// Success
return successResponse({ user: userData });
return successResponse({ user: userData }, 'User created successfully');

// Error helpers
return badRequest('Invalid email format');
return unauthorized();  // Uses default message
return forbidden('You do not have access to this resource');
return notFound('User not found');
return conflict('Email already exists');
return rateLimited();
return internalError();

// Custom error with details
return errorResponse(
  'Payment processing failed',
  402,
  ERROR_CODES.PAYMENT_FAILED,
  { transactionId: '123' }
);
```

### Validation Errors

```typescript
import { z } from 'zod';
import { validationError } from '@/lib/api/error-response';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

const result = schema.safeParse(data);
if (!result.success) {
  return validationError(result.error);
}

// Response:
// {
//   "success": false,
//   "error": "Validation failed",
//   "code": "VALIDATION_ERROR",
//   "details": {
//     "errors": [
//       { "field": "email", "message": "Invalid email" },
//       { "field": "name", "message": "String must contain at least 2 characters" }
//     ]
//   }
// }
```

### Error Handling Wrapper

```typescript
import { withErrorHandling, successResponse } from '@/lib/api/error-response';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // Any unhandled errors are automatically caught and returned in standard format
  const data = await riskyOperation();
  return successResponse(data);
});

// Automatically handles:
// - Uncaught exceptions
// - Database errors
// - Network errors
// - Returns 500 with standard format
```

---

## Migration Examples

### Example 1: Simple GET Route

#### Before
```typescript
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
```

#### After
```typescript
import { successResponse, notFound, internalError } from '@/lib/api/error-response';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();

    if (!data) {
      return notFound('Data not found');
    }

    return successResponse(data);
  } catch (error) {
    return internalError();
  }
}
```

### Example 2: POST Route with Validation

#### Before
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.email || !body.name) {
    return NextResponse.json(
      { error: 'Missing fields' },
      { status: 400 }
    );
  }

  const user = await createUser(body);
  return NextResponse.json({ user }, { status: 201 });
}
```

#### After
```typescript
import { z } from 'zod';
import { successResponse, validationError } from '@/lib/api/error-response';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = schema.safeParse(body);
  if (!result.success) {
    return validationError(result.error);
  }

  const user = await createUser(result.data);
  return successResponse(user, 'User created successfully', 201);
}
```

### Example 3: Protected Route with Auth

#### Before
```typescript
export async function GET(request: NextRequest) {
  const { user } = await getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!hasPermission(user)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const data = await fetchData(user.id);
  return NextResponse.json({ data });
}
```

#### After
```typescript
import { successResponse, unauthorized, forbidden } from '@/lib/api/error-response';

export async function GET(request: NextRequest) {
  const { user } = await getUser();

  if (!user) {
    return unauthorized();
  }

  if (!hasPermission(user)) {
    return forbidden('You do not have permission to access this resource');
  }

  const data = await fetchData(user.id);
  return successResponse(data);
}
```

### Example 4: With Error Handling Wrapper

#### After (recommended)
```typescript
import { withErrorHandling, successResponse, unauthorized } from '@/lib/api/error-response';

export const GET = withErrorHandling(async (request: NextRequest) => {
  const { user } = await getUser();

  if (!user) {
    return unauthorized();
  }

  // No try-catch needed - withErrorHandling catches unhandled errors
  const data = await riskyDatabaseOperation(user.id);
  return successResponse(data);
});
```

---

## Error Codes Reference

### Authentication (401)
- `UNAUTHORIZED` - User not authenticated
- `TOKEN_EXPIRED` - Auth token expired
- `TOKEN_INVALID` - Invalid auth token
- `SESSION_EXPIRED` - Session expired

### Authorization (403)
- `FORBIDDEN` - Access denied
- `INSUFFICIENT_PERMISSIONS` - User lacks required permissions
- `ACCOUNT_SUSPENDED` - User account suspended
- `PLAN_LIMIT_EXCEEDED` - Subscription plan limit reached

### Validation (400)
- `VALIDATION_ERROR` - Input validation failed
- `INVALID_INPUT` - Invalid input format
- `MISSING_REQUIRED_FIELD` - Required field missing
- `INVALID_FORMAT` - Invalid data format

### Resources (404)
- `NOT_FOUND` - Resource not found
- `RESOURCE_NOT_FOUND` - Specific resource not found

### Conflicts (409)
- `CONFLICT` - Resource conflict
- `DUPLICATE_RESOURCE` - Resource already exists
- `RESOURCE_ALREADY_EXISTS` - Duplicate resource

### Rate Limiting (429)
- `RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `TOO_MANY_REQUESTS` - Too many requests

### Server Errors (500+)
- `INTERNAL_ERROR` - Internal server error
- `DATABASE_ERROR` - Database operation failed
- `EXTERNAL_SERVICE_ERROR` - External service failed
- `SERVICE_UNAVAILABLE` - Service unavailable
- `UNKNOWN_ERROR` - Unknown error occurred

---

## Client-Side Usage

### TypeScript Client

```typescript
// Type-safe error handling
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: any;
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const result: ApiResponse<User> = await response.json();

  if (!result.success) {
    // Handle specific error codes
    switch (result.code) {
      case 'NOT_FOUND':
        throw new UserNotFoundError(result.error);
      case 'UNAUTHORIZED':
        redirectToLogin();
        break;
      case 'RATE_LIMIT_EXCEEDED':
        showRateLimitMessage(result.details?.retryAfter);
        break;
      default:
        throw new Error(result.error);
    }
  }

  return result.data!;
}
```

### React Hook

```typescript
function useApiRequest<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = async () => {
    setLoading(true);
    try {
      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        setError(result.error);
        setErrorCode(result.code);
        return;
      }

      setData(result.data);
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  return { data, error, errorCode, loading, execute };
}
```

---

## Migration Priority

### Phase 1: Critical Routes
- [ ] Authentication routes (`/api/auth/**`)
- [ ] User management (`/api/user/**`)
- [ ] Payment routes (`/api/billing/**`)

### Phase 2: Public APIs
- [ ] Email operations (`/api/emails/**`, `/api/nylas/**`)
- [ ] Contact management (`/api/contacts/**`)
- [ ] Calendar operations (`/api/calendar/**`)

### Phase 3: Admin Routes
- [ ] Admin endpoints (`/api/admin/**`)

### Phase 4: Remaining Routes
- [ ] All other API routes

---

## Testing

```typescript
import { successResponse, notFound } from '@/lib/api/error-response';

describe('Error Responses', () => {
  it('should return standardized error format', () => {
    const response = notFound('User not found');
    const json = response.json();

    expect(json).toMatchObject({
      success: false,
      error: 'User not found',
      code: 'NOT_FOUND',
      timestamp: expect.any(String),
    });
  });

  it('should return success format', () => {
    const response = successResponse({ id: '123' });
    const json = response.json();

    expect(json).toMatchObject({
      success: true,
      data: { id: '123' },
      timestamp: expect.any(String),
    });
  });
});
```

---

## Files Created

- `lib/api/error-response.ts` - Core error response utilities
- `ERROR_RESPONSE_MIGRATION_GUIDE.md` - This guide

---

**Status:** Infrastructure complete, ready for gradual rollout to API routes ✅
