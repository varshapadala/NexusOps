# NexusOps — AI-Powered IT Operations & Incident Management

Starter project aligned with the supplied syllabus: React + Vite, Spring Boot, MySQL/JPA, REST APIs, JWT/Spring Security (next stage), AI/RAG (next stage), testing, Docker, Swagger and deployment.

## Requirements
- Java 21
- Node.js and npm
- MySQL Server
- VS Code (recommended)

## 1. Create the database
Log in to MySQL:
```sql
CREATE DATABASE IF NOT EXISTS nexusops;
```

## 2. Backend
This folder contains a Spring Boot Maven project. From PowerShell:
```powershell
cd backend
.\mvnw.cmd spring-boot:run
```
If the Maven wrapper is missing on your system, use `mvn spring-boot:run`.

Configure MySQL credentials using environment variables:
```powershell
$env:DB_USERNAME="root"
$env:DB_PASSWORD="YOUR_MYSQL_PASSWORD"
```
Then start the backend in that same terminal.

Backend URL: http://localhost:8080
Health check: http://localhost:8080/api/health
Incidents API: http://localhost:8080/api/incidents

## 3. Frontend
Open a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open the URL Vite prints, usually http://localhost:5173.

## Notes
- This is a runnable educational starter, not yet a production-secure finished application.
- The incident CRUD API is the first milestone. Authentication/JWT, role-based authorization, AI/RAG, testing, Docker and deployment are intentionally staged next so you can verify each part.
- Do not commit real passwords or API keys to source control.


## Demo accounts (local development only)

The backend seeds these accounts when they do not already exist:

| Role | Email | Initial password |
|---|---|---|
| Administrator | `admin@nexusops.com` | `admin123` |
| DevOps Engineer | `devops@nexusops.com` | `DevOps@12345` |
| Standard engineer/member (legacy seed) | `engineer@nexusops.com` | `engineer123` (only when created by the seed) |

**Security:** these are demo credentials, not production credentials. Change them after first login. Existing database accounts keep their current password; the seed does not reset it. Do not publish these credentials in a public production deployment. Set `JWT_SECRET`, `DB_USERNAME`, and `DB_PASSWORD` as environment variables in production.

## Role support

- `ADMIN`: workspace administration and user/role management.
- `DEVOPS_ENGINEER`: operations engineer account for incident workflows.
- `USER`: standard member account.

Administrators can assign the roles from User Management.

## Local run overview

1. Start MySQL and ensure the configured database credentials match your local setup.
2. In `backend`, run `mvn spring-boot:run` (or `./mvnw spring-boot:run` if a Maven wrapper is present).
3. In `frontend`, run `npm install` and `npm run dev`.
4. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Production deployment notes

Deploy the frontend and backend separately, provision a production MySQL database, configure the frontend API base URL and backend CORS allowed origin for your deployed frontend, and set strong secret environment variables. Never use the local fallback secrets in production.
