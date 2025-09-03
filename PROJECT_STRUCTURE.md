# Bench Sales CRM - Project Structure Overview

**Created by Balaji Koneti**

This document provides a detailed overview of the project structure and architecture.

## 📁 Root Directory Structure

```
38. CRM_BenchSales_AI_Integration/
├─ docker-compose.yml          # Docker infrastructure configuration
├─ README.md                   # Main project documentation
├─ PROJECT_STRUCTURE.md        # This file - detailed structure overview
├─ start.bat                   # Windows batch startup script
├─ start.ps1                   # PowerShell startup script
├─ Bench_sales                 # Original documentation file
├─ api/                        # NestJS API backend
└─ web/                        # Next.js web frontend
```

## 🔧 Infrastructure (Root Level)

### `docker-compose.yml`
- **Purpose**: Defines local development infrastructure
- **Services**: 
  - PostgreSQL database (port 5432)
  - Mailhog email testing (ports 1025, 8025)
- **Volumes**: Persistent database storage

### Startup Scripts
- **`start.bat`**: Windows batch script for automated setup
- **`start.ps1`**: PowerShell script with better error handling
- **Function**: Automate the entire startup process

## 🚀 API Backend (`/api`)

### Configuration Files
```
api/
├─ package.json                # Dependencies and scripts
├─ tsconfig.json              # TypeScript configuration
└─ .env                       # Environment variables
```

### Database Layer (`/api/prisma`)
```
api/prisma/
├─ schema.prisma              # Database schema definition
└─ seed.ts                    # Initial data seeding
```

**Key Models**:
- `Company`: Staffing companies
- `User`: Company employees
- `Consultant`: Available consultants

### Source Code (`/api/src`)
```
api/src/
├─ main.ts                    # Application entry point
├─ app.module.ts              # Root module configuration
├─ prisma/                    # Database connectivity
│  ├─ prisma.module.ts        # Global Prisma module
│  └─ prisma.service.ts       # Database service
└─ consultants/               # Consultants feature module
    ├─ consultants.module.ts   # Module configuration
    ├─ consultants.service.ts  # Business logic
    ├─ consultants.controller.ts # HTTP endpoints
    ├─ dto/                   # Data transfer objects
    │  ├─ create-consultant.dto.ts
    │  └─ update-consultant.dto.ts
    └─ entities/              # Data models
        └─ consultant.entity.ts
```

## 🌐 Web Frontend (`/web`)

### Configuration Files
```
web/
├─ package.json               # Dependencies and scripts
├─ next.config.mjs            # Next.js configuration
├─ tailwind.config.mjs        # Tailwind CSS configuration
├─ postcss.config.mjs         # PostCSS configuration
├─ tsconfig.json              # TypeScript configuration
└─ .env.local                 # Environment variables
```

### Application Structure (`/web/app`)
```
web/app/
├─ layout.tsx                 # Root layout component
├─ page.tsx                   # Home page
├─ globals.css                # Global styles
└─ consultants/               # Consultants page
    └─ page.tsx               # Consultants management
```

## 🔄 Data Flow Architecture

### 1. Database Layer
```
PostgreSQL ←→ Prisma Client ←→ Prisma Service
```

### 2. API Layer
```
HTTP Request → Controller → Service → Prisma Service → Database
```

### 3. Frontend Layer
```
User Action → React Component → API Call → Backend → Database
```

## 🎯 Key Features Implementation

### Consultant Management
- **Create**: Form input → API POST → Database insert
- **Read**: Page load → API GET → Database query → Display
- **Update**: Edit form → API PATCH → Database update
- **Delete**: Delete action → API DELETE → Database removal

### Search & Filtering
- **Implementation**: Query parameter → Prisma OR filter
- **Search Fields**: Name (case-insensitive), Skills array
- **Performance**: Database-level filtering

## 🛠️ Technology Stack

### Backend
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: class-validator decorators
- **Architecture**: Modular, dependency injection

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **State**: React hooks (useState, useEffect)
- **TypeScript**: Full type safety

### Infrastructure
- **Containerization**: Docker Compose
- **Database**: PostgreSQL 15
- **Email Testing**: Mailhog
- **Development**: Hot reload, TypeScript compilation

## 🔐 Security & Best Practices

### API Security
- **CORS**: Configured for web app origin
- **Validation**: Input validation with DTOs
- **Error Handling**: Graceful error responses

### Database Security
- **Environment Variables**: No hardcoded credentials
- **Connection Pooling**: Managed by Prisma
- **SQL Injection**: Prevented by ORM

### Frontend Security
- **Type Safety**: TypeScript compilation
- **Input Sanitization**: Form validation
- **API Communication**: Secure fetch requests

## 📊 Development Workflow

### 1. Setup Phase
```bash
# Start infrastructure
docker compose up -d

# Setup API
cd api
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed

# Setup Web
cd ../web
npm install
```

### 2. Development Phase
```bash
# API development (Terminal 1)
cd api
npm run dev

# Web development (Terminal 2)
cd web
npm run dev
```

### 3. Database Operations
```bash
cd api
npm run prisma:generate    # After schema changes
npm run prisma:migrate     # Apply migrations
npm run seed               # Reset sample data
```

## 🚀 Deployment Considerations

### Production Readiness
- **Environment Variables**: Secure configuration
- **Database**: Production PostgreSQL instance
- **Email**: SendGrid or similar service
- **Hosting**: Vercel (web) + Railway/Heroku (API)

### Scaling Considerations
- **Database**: Connection pooling, indexing
- **API**: Load balancing, caching
- **Frontend**: CDN, static optimization

## 🔍 Code Quality Features

### Backend Quality
- **TypeScript**: Strict type checking
- **Decorators**: Clean, readable code
- **Dependency Injection**: Testable architecture
- **Error Handling**: Comprehensive error management

### Frontend Quality
- **Component Structure**: Logical separation
- **State Management**: React hooks best practices
- **Styling**: Utility-first CSS with Tailwind
- **Responsiveness**: Mobile-first design

## 📈 Monitoring & Debugging

### Development Tools
- **API**: NestJS built-in logging
- **Database**: Prisma query logging
- **Frontend**: React DevTools, console logging
- **Infrastructure**: Docker container logs

### Production Monitoring
- **Logging**: Structured logging implementation
- **Metrics**: Performance monitoring
- **Health Checks**: Database connectivity
- **Error Tracking**: Sentry integration ready

---

This structure provides a solid foundation for a production CRM system with clear separation of concerns, maintainable code, and scalable architecture.
