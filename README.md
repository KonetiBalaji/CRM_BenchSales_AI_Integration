# Bench Sales CRM — Complete Project

A production-ready CRM system for bench sales and consultant management, built with modern technologies.

**Created by Balaji Koneti**

## 🚀 Features

- **Full-stack CRM application** with API and web interface
- **Consultant management** with CRUD operations
- **Search and filtering** by skills and location
- **Modern UI** built with Next.js and Tailwind CSS
- **RESTful API** built with NestJS and Prisma
- **PostgreSQL database** with Docker containerization
- **Email testing** with Mailhog integration

## 🏗️ Architecture

```
bench-sales-crm/
├─ docker-compose.yml          # Local infrastructure
├─ README.md                   # This file
├─ api/                        # NestJS API backend
│  ├─ package.json            # API dependencies
│  ├─ tsconfig.json           # TypeScript config
│  ├─ .env                    # Environment variables
│  ├─ prisma/
│  │  ├─ schema.prisma        # Database schema
│  │  └─ seed.ts              # Database seeding
│  └─ src/
│     ├─ main.ts              # Application entry point
│     ├─ app.module.ts        # Root module
│     ├─ prisma/
│     │  ├─ prisma.module.ts  # Database module
│     │  └─ prisma.service.ts # Database service
│     └─ consultants/
│        ├─ consultants.module.ts
│        ├─ consultants.service.ts
│        ├─ consultants.controller.ts
│        ├─ dto/
│        │  ├─ create-consultant.dto.ts
│        │  └─ update-consultant.dto.ts
│        └─ entities/
│           └─ consultant.entity.ts
└─ web/                        # Next.js frontend
   ├─ package.json            # Web dependencies
   ├─ next.config.mjs         # Next.js config
   ├─ postcss.config.mjs      # PostCSS config
   ├─ tailwind.config.mjs     # Tailwind config
   ├─ tsconfig.json           # TypeScript config
   ├─ .env.local              # Environment variables
   └─ app/
      ├─ layout.tsx           # Root layout
      ├─ page.tsx             # Home page
      ├─ globals.css          # Global styles
      └─ consultants/
         └─ page.tsx          # Consultants page
```

## 📋 Prerequisites

- **Node.js 18+** and npm
- **Docker Desktop** (or Docker Engine)
- **Git** for version control

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Navigate to project directory
cd "38. CRM_BenchSales_AI_Integration"

# Start local infrastructure (PostgreSQL + Mailhog)
docker compose up -d
```

### 2. Setup API Backend

```bash
# Navigate to API directory
cd api

# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed database with sample data
npm run seed

# Start development server
npm run dev
```

The API will be available at: **http://localhost:4000**

### 3. Setup Web Frontend

```bash
# Open new terminal and navigate to web directory
cd ../web

# Install dependencies
npm install

# Start development server
npm run dev
```

The web app will be available at: **http://localhost:3000**

### 4. Access the Application

- **Web App**: http://localhost:3000
- **API Docs**: http://localhost:4000
- **Mailhog**: http://localhost:8025 (for email testing)
- **Database**: localhost:5432 (PostgreSQL)

## 🎯 Usage

### Viewing Consultants
1. Navigate to **http://localhost:3000/consultants**
2. View the seeded consultant data
3. See skills, locations, and hourly rates

### Adding New Consultants
1. Use the "Add New Consultant" form
2. Enter consultant name and primary skill
3. Click "Add" to create the consultant
4. The list will automatically refresh

### API Endpoints

- `GET /v1/consultants` - List all consultants
- `GET /v1/consultants?q=skill` - Search consultants
- `POST /v1/consultants` - Create new consultant
- `GET /v1/consultants/:id` - Get consultant by ID
- `PATCH /v1/consultants/:id` - Update consultant
- `DELETE /v1/consultants/:id` - Delete consultant

## 🛠️ Development

### API Development
```bash
cd api
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run start        # Start production build
```

### Web Development
```bash
cd web
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run start        # Start production build
```

### Database Operations
```bash
cd api
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run seed               # Seed database
```

## 🔧 Configuration

### Environment Variables

**API (.env)**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/benchcrm?schema=public"
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

**Web (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Docker Services

- **PostgreSQL**: Port 5432
- **Mailhog**: Ports 1025 (SMTP), 8025 (Web UI)

## 🐛 Troubleshooting

### Quick Fix Scripts

I've created automated scripts to fix all common errors:

**PowerShell (Recommended):**
```powershell
.\fix-errors.ps1
```

**Windows Batch:**
```cmd
fix-errors.bat
```

**Manual Setup:**
```powershell
.\setup-env.ps1
```

### Common Issues

1. **API can't connect to database**
   - Ensure Docker is running
   - Check if port 5432 is available
   - Verify database container is healthy

2. **Database connection errors**
   - Reset database: `docker compose down -v && docker compose up -d`
   - Re-run migrations: `npm run prisma:migrate`
   - Re-seed data: `npm run seed`

3. **Port conflicts**
   - Check if ports 3000, 4000, 5432 are available
   - Modify docker-compose.yml if needed

4. **Dependencies issues**
   - Delete node_modules and package-lock.json
   - Run `npm install` again

5. **Missing environment files**
   - Run `.\setup-env.ps1` to create .env files
   - Or manually create `api\.env` and `web\.env.local`

### Reset Everything
```bash
# Stop and remove all containers
docker compose down -v

# Remove node_modules
rm -rf api/node_modules web/node_modules

# Restart from scratch
docker compose up -d
cd api && npm install && npm run prisma:generate && npm run prisma:migrate && npm run seed
cd ../web && npm install
```

## 🚀 Next Steps

This MVP provides a solid foundation. Consider adding:

1. **Requirements Management** - Job requirements and matching
2. **Submissions System** - Consultant submissions to requirements
3. **Task Management** - Follow-ups and reminders
4. **Email Integration** - SendGrid for production emails
5. **Authentication** - Auth0 integration with multi-tenancy
6. **Advanced Search** - Filters, sorting, and pagination
7. **Reporting** - Analytics and insights dashboard

## 📝 License

This project is created for educational and portfolio purposes by Balaji Koneti.

## 🤝 Support

For questions or issues:
1. Check the troubleshooting section
2. Review the code comments (each file has detailed explanations)
3. Check Docker and database logs

---

**Happy coding! 🎉**
