# OneFlow Backend - Database Setup Guide

## 🐳 Docker Database Setup

### Prerequisites
- Docker Desktop installed
- Docker Compose installed
- Node.js and npm installed

### 1. Start Database Services

```powershell
# Navigate to project directory
cd Backend\OneFlow

# Start PostgreSQL and Redis containers
docker-compose up -d

# Check if containers are running
docker-compose ps
```

### 2. Database Configuration

The Docker setup includes:
- **PostgreSQL 15**: Primary application database
- **Redis 7**: For caching/session storage (optional for MVP but available)
- **Persistent volumes**: Data survives container restarts

### 3. Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=oneflow_db
DB_USER=oneflow_user
DB_PASSWORD=oneflow_password
DB_DIALECT=postgres

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=8007
NODE_ENV=development
```

### 4. Database Connection Commands

```bash
# Connect to PostgreSQL directly
docker exec -it oneflow_postgres psql -U oneflow_user -d oneflow_db

# Connect to Redis
docker exec -it oneflow_redis redis-cli

# View PostgreSQL logs
docker logs oneflow_postgres

# View Redis logs
docker logs oneflow_redis
```

### 5. Sequelize Commands

```bash
# Install dependencies
npm install

# Create the database (if it does not already exist)
npm run db:create

# Run database migrations
npm run db:migration

# Undo last migration
npm run db:migration:undo
```

### 6. Development Workflow

```bash
# Start development server with auto-rebuild
npm run dev

# Start production build (runs migrations first)
npm start
```

### 7. Database Management

```bash
# Backup database
docker exec oneflow_postgres pg_dump -U oneflow_user oneflow_db > backup.sql

# Restore database
docker exec -i oneflow_postgres psql -U oneflow_user oneflow_db < backup.sql

# Reset database (WARNING: This deletes all data)
docker-compose down -v
docker-compose up -d
```

### 8. Troubleshooting

#### Container Issues
```bash
# Restart containers
docker-compose restart

# Rebuild containers
docker-compose up --build

# Remove all containers and volumes
docker-compose down -v
docker system prune -a
```

#### Connection Issues
```bash
# Check if PostgreSQL is accepting connections
docker exec oneflow_postgres pg_isready -U oneflow_user

# Check container logs
docker logs oneflow_postgres
docker logs oneflow_redis
```

#### Port Conflicts
If ports 5432 or 6379 are already in use:
```bash
# Find process using port
lsof -i :5432
lsof -i :6379

# Kill process
kill -9 <PID>

# Or change ports in docker-compose.yml
```

### 9. Production Considerations

For production deployment:

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USERNAME}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M

volumes:
  postgres_data:
    driver: local
```

### 10. Useful Docker Commands

```bash
# View all containers
docker ps -a

# View all images
docker images

# Clean up unused resources
docker system prune

# View container resource usage
docker stats

# Execute commands in running container
docker exec -it oneflow_postgres bash
docker exec -it oneflow_redis sh
```

## 📊 Database Schema

The MVP focuses on the following core tables:
- `users` - Authentication, role management, and basic profile data
- `contacts` - Client and vendor directories
- `projects` - Project planning metadata
- `tasks` - Task execution tracking
- `timesheets` - Logged billable/non-billable hours
- `sales_orders`, `invoices`, `purchase_orders`, `vendor_bills`, `expenses` - Financial documents linked to projects

## 🔧 Development Tips

1. **Always use transactions** for data consistency
2. **Use migrations** for schema changes
3. **Test with fresh database** regularly
4. **Backup before major changes**
5. **Use environment variables** for configuration

## 📝 Next Steps

1. Configure environment variables (see `.env` template above)
2. Start the Docker containers
3. Run database migrations
4. Start the development server
5. Test the authentication endpoints

Happy coding! 🚀
