# HiveMind Backend

Express.js backend server for the HiveMind chat application with PostgreSQL and Prisma ORM.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Build and run
npm run build
npm run dev
```

The server will start on `http://localhost:3001`

## Project Structure

```
src/
├── config/              # Configuration modules
│   ├── db.ts           # Prisma client setup
│   ├── socket.ts       # Socket.io configuration
│   └── cloudinary.ts   # Cloudinary image upload config
│
├── controllers/        # Request handlers
│   ├── auth.controller.ts        # Authentication endpoints
│   ├── conversation.controller.ts # Conversation endpoints
│   ├── message.controller.ts      # Message endpoints
│   ├── search.controller.ts       # Search endpoints
│   └── upload.controller.ts       # File upload endpoints
│
├── middleware/         # Express middleware
│   ├── auth.middleware.ts   # JWT authentication
│   └── upload.ts            # File upload handler
│
├── routes/            # API route definitions
│   ├── auth.routes.ts        # /api/auth routes
│   ├── conversations.routes.ts # /api/conversations routes
│   ├── message.routes.ts      # /api/messages routes
│   ├── search.routes.ts       # /api/search routes
│   └── upload.routes.ts       # /api/upload routes
│
├── services/          # Business logic
│   ├── auth.service.ts        # User authentication logic
│   ├── conversation.service.ts # Conversation logic
│   ├── message.service.ts      # Message handling
│   └── search.service.ts       # Search logic
│
├── types/            # TypeScript type definitions
│   └── express.d.ts  # Extended Express type definitions
│
└── utils/            # Utility functions
    └── auth.ts       # Password hashing, JWT generation
```

## API Architecture

### Layered Architecture
- **Routes** - Define endpoints and request handlers
- **Controllers** - Parse requests, call services, format responses
- **Services** - Contain business logic
- **Database** - Prisma models and queries

```
Request → Routes → Controllers → Services → Database
```

## Authentication

### Password Hashing
- Algorithm: bcrypt with 10 salt rounds
- Used by: `auth.service.ts`

### JWT Tokens
- Algorithm: HS256 (HMAC with SHA-256)
- Secret: `JWT_SECRET` environment variable
- Expiration: 7 days
- Header Format: `Authorization: Bearer <token>`

### Protected Routes
Include token in request header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## API Endpoints

### Authentication
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}

Response (201):
{
  "user": {
    "id": "123",
    "username": "john_doe",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securePassword123"
}

Response (200):
{
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

```
GET /api/me
Authorization: Bearer <token>

Response (200):
{
  "user": {
    "id": "123",
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

## Database Schema

### User
```prisma
model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Conversation
Links users in chat groups/channels.

### Message
Individual messages in conversations with timestamps.

### Participant
Links users to conversations they're part of.

### MessageStatus
Tracks read/delivered status of messages.

## Environment Variables

```
# Database
DATABASE_URL              # PostgreSQL connection string

# JWT
JWT_SECRET                # Secret key for signing tokens

# Cloudinary (Optional)
CLOUDINARY_CLOUD_NAME     # Your Cloudinary cloud name
CLOUDINARY_API_KEY        # Cloudinary API key
CLOUDINARY_API_SECRET     # Cloudinary API secret

# Server
PORT                      # Server port (default: 3001)
HOST                      # Server host (default: localhost)
CORS_ORIGIN               # Comma-separated allowed origins
```

## Available Scripts

```bash
# Development
npm run dev              # Start with auto-reload (nodemon + tsx)

# Production
npm run build            # Compile TypeScript to JavaScript
npm run start            # Run compiled JavaScript

# Database
npm run migrate:dev      # Create and apply migrations
npm run migrate:reset    # Reset database
```

## Dependencies

### Core
- **express** - Web framework
- **typescript** - Type safety
- **cors** - Cross-origin resource sharing

### Database
- **@prisma/client** - ORM
- **pg** - PostgreSQL driver
- **@prisma/adapter-neon** - Neon adapter for serverless

### Security
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication

### File Upload
- **cloudinary** - Image hosting service
- **multer** - File upload middleware

### Real-time
- **socket.io** - WebSocket for real-time features

## Error Handling

### Standard Error Responses

```json
{
  "error": "Descriptive error message"
}
```

### HTTP Status Codes
- 200 - Success
- 201 - Created
- 400 - Bad Request (validation error)
- 401 - Unauthorized (invalid/missing token)
- 404 - Not Found
- 500 - Server Error

## CORS Configuration

In production, update `CORS_ORIGIN`:
```
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

For development:
```
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
```

## WebSocket (Socket.io)

Real-time features powered by Socket.io. Configure in `src/config/socket.ts`.

Events:
- `message:new` - New message broadcast
- `message:read` - Message marked as read
- `user:online` - User comes online
- `user:offline` - User goes offline

## Database Migrations

### Create Migration
```bash
npm run migrate:dev

# When prompted, enter migration name
# Migrations are saved to prisma/migrations/
```

### Apply Migration
Migrations auto-apply with `migrate:dev`

### Reset Database
```bash
npm run migrate:reset

# This will:
# 1. Drop the database
# 2. Create a new database
# 3. Apply all migrations
# 4. Run seed scripts (if any)
```

## Best Practices

### Controllers
```typescript
export async function functionName(req: Request, res: Response) {
  try {
    const { field } = req.body;
    const result = await service.doSomething(field);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
```

### Services
```typescript
export async function doSomething(data: string) {
  // Business logic here
  // No req/res objects
  // Throw errors, let controller handle
  return prisma.model.create({ data });
}
```

### Middleware
```typescript
export function customMiddleware(req: Request, res: Response, next: NextFunction) {
  // Process request
  // Add to req object
  next();
  // Or send error response
}
```

## Testing

Add test endpoints during development:
```typescript
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint' });
});
```

Use Postman or curl to test:
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"pass123"}'
```

## Troubleshooting

**Database Connection Error**
- Verify DATABASE_URL is correct
- Check PostgreSQL service is running
- Test connection with: `prisma db execute --stdin < query.sql`

**JWT Token Issues**
- Ensure JWT_SECRET is set and consistent
- Check token expiration (7 days)
- Verify token format in Authorization header

**CORS Errors**
- Update CORS_ORIGIN in .env
- Verify frontend URL is in allowed origins
- Check backend is setting proper CORS headers

**Port Already in Use**
- Change PORT in .env
- Or kill process using port 3001

## Performance Tips

1. Use Prisma query optimization (select specific fields)
2. Implement caching for frequently accessed data
3. Use indexes on frequently queried fields
4. Limit pagination results
5. Use database connection pooling

## Security Checklist

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens with expiration
- ✅ CORS restricted to allowed origins
- ✅ SQL injection prevented by Prisma
- ✅ Sensitive data in environment variables
- ✅ Input validation on all endpoints
- ✅ Authorization middleware on protected routes

## Deployment

### Environment Setup
1. Update `.env` with production values
2. Use strong JWT_SECRET
3. Set proper CORS_ORIGIN
4. Use production database URL
5. Set NODE_ENV=production

### Database Migrations
```bash
npm run build
npm run migrate:deploy  # Apply pending migrations
npm run start
```

## Next Steps

1. Implement conversation creation
2. Add real-time messaging with Socket.io
3. Implement search with full-text search
4. Add file uploads with Cloudinary
5. Implement friend management
6. Add user presence tracking
7. Implement message reactions
8. Add group chat features

## Support

For issues or questions, see the main project README.
