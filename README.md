# BenchCRM - Production-Ready SaaS Platform

BenchCRM is an enterprise-grade bench sales CRM platform with AI-powered matching, multi-tenant architecture, and comprehensive security features.

## Key Features

- Multi-tenant SaaS architecture with row-level security
- AI-powered consultant-requirement matching with explainability
- Real-time vector search using OpenAI embeddings and pgvector
- Comprehensive RBAC with Auth0/OIDC integration
- Production-grade observability with OpenTelemetry
- Automated CI/CD pipeline with Docker deployment
- Enterprise security with input validation and rate limiting
- High-performance database with optimized indexes
- Distributed caching with Redis
- Background job processing with BullMQ
- Automated backups and disaster recovery
- Full audit trail with tamper-evident logging

## Tech Stack

### Backend
- NestJS 10 with TypeScript
- Prisma ORM with PostgreSQL 15
- Redis for caching and queues
- BullMQ for background jobs
- OpenTelemetry for observability
- Auth0 for authentication

### Frontend
- Next.js 14 with App Router
- React 18 with TypeScript
- TanStack Query for data fetching
- Tailwind CSS for styling

### Infrastructure
- Docker and Docker Compose
- PostgreSQL 15 with pgvector
- Redis 7
- GitHub Actions for CI/CD
- AWS (RDS, S3, ElastiCache) for production

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 9.0.0
- Docker Desktop
- PostgreSQL 15 with pgvector extension

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/benchcrm.git
cd benchcrm

# Install dependencies
pnpm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Start infrastructure
docker compose up -d postgres redis otel-collector

# Run database migrations
pnpm --filter prisma migrate deploy

# Seed demo data
pnpm --filter prisma seed

# Start development servers
pnpm dev:api    # Backend on http://localhost:4000
pnpm dev:web    # Frontend on http://localhost:3000
```

### Environment Variables

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/benchcrm

# Redis
REDIS_URL=redis://localhost:6379

# Auth0
AUTH0_ISSUER_URL=https://your-domain.auth0.com/
AUTH0_AUDIENCE=your-api-audience

# OpenAI
OPENAI_API_KEY=your-openai-api-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMENSIONS=1536

# Observability
OTLP_ENDPOINT=http://localhost:4318
LOG_LEVEL=info

# Application
NODE_ENV=development
PORT=4000
```

## Development

### Project Structure

```
apps/
  api/                          # NestJS backend
    src/
      infrastructure/           # Core infrastructure
        cache/                  # Caching services
        circuit-breaker/        # Circuit breaker pattern
        context/                # Request context
        error-handling/         # Global error handling
        monitoring/             # Health checks and metrics
        prisma/                 # Database service
        queue/                  # Background jobs
        rate-limiting/          # Rate limiting
        security/               # Security services
      modules/                  # Business modules
        consultants/            # Consultant management
        requirements/           # Job requirements
        matching/               # AI matching engine
        analytics/              # Analytics and reporting
        [50+ other modules]
      telemetry/                # OpenTelemetry setup
  web/                          # Next.js frontend
    app/                        # App router pages
    components/                 # React components
    lib/                        # Utilities and helpers

packages/
  prisma/                       # Prisma schema and migrations
    prisma/
      schema.prisma             # Database schema
      migrations/               # Migration files

docs/                           # Documentation
infrastructure/                 # Terraform configs
observability/                  # Monitoring configs
```

### Running Tests

```bash
# Backend tests with coverage
pnpm --filter api test --coverage

# Frontend tests
pnpm --filter web test

# E2E tests
pnpm test:e2e

# Run specific test file
pnpm --filter api test consultants.service.spec.ts
```

### Linting and Formatting

```bash
# Lint all packages
pnpm lint

# Lint specific package
pnpm --filter api lint
pnpm --filter web lint

# Type checking
pnpm --filter api tsc --noEmit
```

### Database Management

```bash
# Create new migration
pnpm --filter prisma migrate:dev --name migration_name

# Apply migrations
pnpm --filter prisma migrate deploy

# Reset database (development only)
pnpm --filter prisma migrate:reset

# Seed database
pnpm --filter prisma seed

# Open Prisma Studio
pnpm --filter prisma studio
```

## API Documentation

API documentation is available at:
- Development: http://localhost:4000/docs
- Swagger UI with interactive testing
- OpenAPI 3.0 specification

### Key Endpoints

#### Consultants
- `GET /api/tenants/:tenantId/consultants` - List consultants (paginated)
- `GET /api/tenants/:tenantId/consultants/:id` - Get consultant details
- `POST /api/tenants/:tenantId/consultants` - Create consultant
- `PATCH /api/tenants/:tenantId/consultants/:id` - Update consultant

#### Requirements
- `GET /api/tenants/:tenantId/requirements` - List requirements (paginated)
- `GET /api/tenants/:tenantId/requirements/:id` - Get requirement details
- `POST /api/tenants/:tenantId/requirements` - Create requirement
- `PATCH /api/tenants/:tenantId/requirements/:id` - Update requirement

#### Matching
- `POST /api/tenants/:tenantId/requirements/:id/match` - Generate matches
- `POST /api/tenants/:tenantId/matches/:id/feedback` - Submit match feedback

#### Vector Search
- `POST /api/tenants/:tenantId/search/hybrid` - Hybrid BM25 + vector search
- `POST /api/tenants/:tenantId/search/index` - Index entity for search
- `POST /api/tenants/:tenantId/search/index/all` - Bulk reindex

## Production Deployment

### Docker Build

```bash
# Build API image
docker build -f apps/api/Dockerfile -t benchcrm-api:latest .

# Build Web image
docker build -f apps/web/Dockerfile -t benchcrm-web:latest .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### CI/CD Pipeline

GitHub Actions workflow automatically:
1. Runs tests and linting
2. Performs security scans
3. Builds Docker images
4. Deploys to staging (develop branch)
5. Deploys to production (main branch)

### Infrastructure Requirements

#### Production Minimum
- PostgreSQL 15 with pgvector (AWS RDS)
- Redis 7 (AWS ElastiCache)
- 2x Application servers (t3.medium)
- S3 bucket for document storage
- CloudFront CDN
- Application Load Balancer

#### Scaling Recommendations
- Use read replicas for database scaling
- Implement horizontal pod autoscaling
- Configure Redis cluster for high availability
- Use CDN for static assets
- Enable database connection pooling

## Security

### Authentication & Authorization
- Auth0 integration with JWT tokens
- Role-based access control (RBAC)
- Tenant isolation enforced at database level
- Row-level security (RLS) in PostgreSQL

### Security Features
- Input validation on all endpoints
- SQL injection prevention via Prisma
- Rate limiting per tenant and endpoint
- XSS protection headers
- CORS configuration
- Secrets management
- Audit logging with tamper-evident chains

### Best Practices
- All secrets in environment variables
- No sensitive data in logs
- Encrypted data at rest
- TLS/HTTPS in production
- Regular security updates
- Dependency scanning

## Monitoring & Observability

### Metrics
- Prometheus metrics exposed at `/metrics`
- Request duration histograms
- Database query performance
- Cache hit rates
- Active connections

### Logging
- Structured JSON logs with pino
- Distributed tracing with OpenTelemetry
- Correlation IDs for request tracking
- Log levels: error, warn, info, debug

### Health Checks
- `/health` - Overall system health
- `/health/ready` - Readiness probe
- `/health/live` - Liveness probe
- Dependency health checks (DB, Redis, S3)

## Performance Optimization

### Database
- Comprehensive indexes on frequently queried columns
- Connection pooling with Prisma
- Query optimization with EXPLAIN ANALYZE
- Materialized views for analytics
- Partitioning for large tables

### Caching Strategy
- Multi-level caching (L1: memory, L2: Redis)
- Cache invalidation on mutations
- TTL-based expiration
- Cache warming for critical data

### API Performance
- Response compression
- Pagination on all list endpoints
- Field selection to reduce payload
- Rate limiting to prevent abuse
- Circuit breaker for external services

## Troubleshooting

### Common Issues

#### Database connection errors
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Verify connection string
psql $DATABASE_URL -c "SELECT 1"

# Check migrations
pnpm --filter prisma migrate status
```

#### Redis connection errors
```bash
# Check Redis is running
docker ps | grep redis

# Test Redis connection
redis-cli -u $REDIS_URL ping
```

#### Build failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules
pnpm install

# Regenerate Prisma client
pnpm --filter prisma generate
```

## Contributing

### Development Workflow
1. Create feature branch from `develop`
2. Make changes with tests
3. Ensure tests pass and coverage meets threshold
4. Submit pull request
5. Code review and approval
6. Merge to develop
7. Deploy to staging for QA
8. Merge to main for production

### Code Standards
- TypeScript strict mode enabled
- ESLint and Prettier configured
- 80%+ test coverage required
- All public APIs documented
- Meaningful commit messages

### Pull Request Guidelines
- Clear description of changes
- Link to related issues
- Screenshots for UI changes
- Test coverage maintained
- No breaking changes without migration plan

## License

Proprietary - All rights reserved

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/benchcrm/issues
- Email: support@benchcrm.com
- Documentation: https://docs.benchcrm.com

## Changelog

See CHANGELOG.md for version history and release notes.
