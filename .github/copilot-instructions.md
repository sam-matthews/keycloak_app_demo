# GitHub Copilot Instructions

## Project Overview
This is a Keycloak authentication demo application with a React frontend and Node.js backend, using PostgreSQL for data persistence.

## Architecture & Infrastructure

### Container Requirements
- **Always use containers** for all services and dependencies
- Use **PostgreSQL database in a separate container** - never use SQLite or in-memory databases
- Define services in `docker-compose.yml` with proper networking and volume management
- Each service (frontend, backend, database, Keycloak) should run in its own container
- Use multi-stage builds in Dockerfiles to minimize image size
- Pin specific image versions (avoid `latest` tag) for reproducibility

### Reverse Proxy Requirements
- Use a dedicated reverse proxy service (for example, Nginx or Traefik) in its own container
- Keep reverse proxy configuration files in a top-level `reverse-proxy/` directory
- Split configuration by concern: a main config file plus per-service or per-host includes
- Mount configuration files as read-only volumes into the reverse proxy container
- Use environment variables for hostnames and upstream targets where supported
- Include health checks and sane timeouts in the proxy configuration

### Best Practice Architecture Standards
- **Separation of Concerns**: Keep frontend, backend, authentication, and database layers separate
- **Microservices Pattern**: Each service should be independently deployable
- **API Gateway Pattern**: Backend acts as gateway between frontend and services
- **Environment-based Configuration**: Use environment variables for all configuration
- **Health Checks**: Implement health check endpoints for all services
- **Graceful Shutdown**: Handle SIGTERM signals properly in all services

## Code Quality & Standards

### General Coding Practices
- **DRY Principle**: Don't repeat yourself - extract reusable functions and components
- **SOLID Principles**: Follow single responsibility, open/closed, and dependency injection principles
- **Error Handling**: Always implement proper error handling with meaningful error messages
- **Logging**: Use structured logging with appropriate log levels (error, warn, info, debug)
- **Security First**: Never commit secrets, use environment variables, validate all inputs
- **Type Safety**: Use JSDoc comments or TypeScript for better type checking
- **Async/Await**: Prefer async/await over callbacks or raw promises for readability

### Backend (Node.js/Express)
- Use middleware for cross-cutting concerns (auth, logging, error handling)
- Implement request validation using libraries like `joi` or `express-validator`
- Use connection pooling for database connections
- Implement proper HTTP status codes (200, 201, 400, 401, 403, 404, 500, etc.)
- Use route-based organization in `src/routes/`
- Keep business logic separate from route handlers
- Use async error handling middleware

### Frontend (React)
- Use functional components with hooks
- Implement proper component composition and reusability
- Keep components focused and single-purpose
- Use Context API or state management for global state
- Implement proper loading and error states
- Use semantic HTML and accessibility best practices
- Lazy load routes and heavy components

### Database (PostgreSQL)
- Use parameterized queries to prevent SQL injection
- Implement database migrations for schema changes
- Use indexes appropriately for query performance
- Follow PostgreSQL naming conventions (snake_case for tables/columns)
- Create database constraints (foreign keys, unique, not null) at the database level
- Use transactions for multi-step operations

### Authentication & Security
- Use Keycloak for centralized authentication and authorization
- Validate JWT tokens on every protected endpoint
- Implement proper CORS configuration
- Use HTTPS in production
- Sanitize user inputs to prevent XSS attacks
- Implement rate limiting to prevent abuse
- Use secure session management

## Development Workflow

### Code Organization
- Keep configuration files in the root directory
- Keep documentation files in a `doc/` folder, except `README.md` which stays at the root
- Organize backend code in `backend/src/` with subdirectories for routes, middleware, models, services
- Organize frontend code in `frontend/src/` with subdirectories for components, contexts, services, utils
- Use meaningful file and directory names
- One component per file in frontend

### Testing
- Write unit tests for business logic
- Write integration tests for API endpoints
- Test error scenarios, not just happy paths
- Mock external dependencies in tests
- Aim for meaningful test coverage, not just high percentages

### Documentation
- Add JSDoc comments to all exported functions
- Keep README.md up-to-date with setup and running instructions
- Document API endpoints with request/response examples
- Comment complex business logic
- Use clear, descriptive variable and function names

### Version Control
- Write clear, descriptive commit messages
- Keep commits atomic and focused
- Don't commit `node_modules/`, build artifacts, or environment files
- Use `.gitignore` appropriately

## Environment Variables

Required environment variables should be documented in a `.env.example` file:

### Backend
- `DATABASE_URL` or separate `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`
- `PORT`, `NODE_ENV`

### Frontend
- `REACT_APP_KEYCLOAK_URL`, `REACT_APP_KEYCLOAK_REALM`, `REACT_APP_KEYCLOAK_CLIENT_ID`
- `REACT_APP_API_URL`

## Performance Considerations
- Use connection pooling for database connections
- Implement caching where appropriate (Redis for sessions/cache)
- Optimize database queries with proper indexes
- Use pagination for large data sets
- Minimize bundle size in frontend (code splitting, tree shaking)
- Use CDN for static assets in production

## Monitoring & Debugging
- Implement structured logging with correlation IDs
- Add performance monitoring for slow queries and endpoints
- Use debugging tools appropriate for each technology (Chrome DevTools, Node debugger)
- Log errors with stack traces and context

## Dependencies
- Keep dependencies up-to-date and audit regularly for vulnerabilities
- Use exact versions in package.json for production stability
- Minimize dependency bloat - evaluate if a dependency is truly needed
- Check license compatibility for all dependencies
