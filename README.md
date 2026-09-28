


CodeRoom
<p align="center"> <strong>Collaborative coding, real-time pair programming, and isolated cloud execution — built as a systems-focused engineering project.</strong> </p>

<p align="center"> <a href="https://github.com/PrayagSingh9A7/CodeRoom"> <img src="https://img.shields.io/github/stars/PrayagSingh9A7/CodeRoom?style=flat-square" alt="GitHub Stars"> </a> <a href="https://github.com/PrayagSingh9A7/CodeRoom/network/members"> <img src="https://img.shields.io/github/forks/PrayagSingh9A7/CodeRoom?style=flat-square" alt="GitHub Forks"> </a> <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js"> <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"> <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"> <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis"> <img src="https://img.shields.io/badge/Docker-Sandbox-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"> </p>

<p align="center"> <a href="#overview">Overview</a> · <a href="#key-capabilities">Capabilities</a> · <a href="#architecture">Architecture</a> · <a href="#tech-stack">Tech Stack</a> · <a href="#local-development">Run Locally</a> · <a href="#project-structure">Structure</a> </p>

Overview
CodeRoom is a collaborative coding workspace designed for pair programming, technical interviews, and team coding sessions.

The project combines three engineering-heavy problems in one product:

Real-time collaboration — multiple users can work in the same coding session with shared editor state, presence, and cursor awareness.

Asynchronous code execution — submitted code is processed through a queue instead of running directly inside the web server.

Isolated execution — untrusted source code is executed inside disposable Docker sandboxes with resource and network restrictions.

That makes CodeRoom more than a CRUD application: the product surface is a collaborative coding room, while the backend is responsible for synchronization, persistence, queuing, sandboxing, challenge evaluation, and session history.

Core idea: keep the control plane, collaboration path, and execution path separate so the system can evolve without turning the web server into the execution engine.

Key Capabilities
⚡ Real-Time Collaborative Editor
Shared coding workspace for multiple participants

Live presence and cursor awareness

Collaborative file editing

Separate documentation and solution files

Session-based room workflow

🧪 Challenge & Test Engine
Curated coding challenges

Problem statements, examples, constraints, and starter code

Public and hidden test cases

Custom challenge creation

Challenge-specific test management

Test result reporting with expected/output comparison

🐳 Isolated Code Execution
Code execution is intentionally kept outside the main application process.

The execution path uses:

Web App
   ↓
Execution Request
   ↓
Queue
   ↓
Executor Worker
   ↓
Disposable Docker Sandbox
   ↓
Test Evaluation
   ↓
Result
   ↓
Room UI
The runner applies execution controls such as:

CPU limits

Memory limits

Process limits

Network restrictions

Execution timeouts

Source-size limits

This architecture helps keep arbitrary user code away from the primary application process.

🔁 Replayable Sessions
CodeRoom records the session timeline so a completed room can be reviewed afterward.

This enables workflows such as:

interview review

pair-programming retrospectives

debugging analysis

replaying the evolution of a solution

👥 Room-Based Collaboration
Rooms support a role-aware collaborative workflow with concepts such as:

Owner

Editor

Viewer

Interviewer

collaborator invitations

room actions

session-specific challenge state

Why CodeRoom?
Most coding projects stop at:

Editor → API → Database
CodeRoom deliberately goes further:

                     ┌───────────────────┐
                     │     Next.js UI    │
                     │ Workspace / Room  │
                     └─────────┬─────────┘
                               │
                     ┌─────────▼─────────┐
                     │    Control/API    │
                     │ Auth / Rooms / DB │
                     └──────┬─────┬──────┘
                            │     │
                  ┌─────────▼┐   │
                  │   Redis  │   │
                  │ Queue    │   │
                  └────┬─────┘   │
                       │          │
                ┌──────▼──────┐   │
                │   Executor  │   │
                │    Worker   │   │
                └──────┬──────┘   │
                       │          │
                ┌──────▼──────┐   │
                │   Docker    │   │
                │   Sandbox   │   │
                └─────────────┘   │
                                  │
                           ┌──────▼──────┐
                           │ PostgreSQL  │
                           │ Persistence │
                           └─────────────┘
The interesting engineering work is in the boundaries between these components.

Architecture
CodeRoom is organized around distinct responsibilities.

1. Presentation / Workspace Layer
The Next.js application provides:

authentication flows

dashboard

room UI

collaborative editor

challenge panel

test result console

replay experience

profile/settings surfaces

2. Application / Control Layer
The server owns application-level state such as:

users and sessions

rooms

files

challenges

tests

permissions

execution requests

run history

3. Collaboration Layer
The collaboration path is optimized for low-latency shared editing rather than repeatedly saving the entire document through ordinary CRUD requests.

4. Queue / Execution Layer
Execution requests enter an asynchronous queue.

That separation prevents long-running or expensive execution jobs from blocking ordinary application traffic.

5. Sandbox Layer
The executor prepares a temporary workspace and runs submitted source inside a constrained Docker environment.

The key design rule is:

Never execute arbitrary user source directly inside the web/API process.

6. Persistence Layer
PostgreSQL stores durable application state, while Redis supports fast-changing/queued workloads.

Execution Lifecycle
A typical test run follows this lifecycle:

1. User edits code
        ↓
2. User clicks "Run tests"
        ↓
3. Server validates the request
        ↓
4. Execution job is queued
        ↓
5. Worker picks up the job
        ↓
6. Temporary sandbox is created
        ↓
7. Source + test input are prepared
        ↓
8. Code executes under limits
        ↓
9. Output is collected
        ↓
10. Tests are evaluated
        ↓
11. Result is persisted
        ↓
12. UI renders status, output and failures
This is the core systems workflow behind CodeRoom.

Tech Stack
Layer	Technology
Frontend	Next.js, React, TypeScript
Editor	Monaco Editor
Collaboration	WebSockets / Yjs-based shared state
Backend	Node.js / TypeScript
API	HTTP + real-time communication
Database	PostgreSQL
ORM	Prisma
Queue / Cache	Redis + BullMQ
Execution	Docker sandboxes
Styling	Tailwind CSS
Tooling	npm, Git, Docker Compose
Project Structure
CodeRoom/
├── app/                 # Next.js routes and application UI
├── components/          # Reusable UI and collaborative editor components
├── docs/                # Project documentation
├── executor/            # Queue worker and sandbox execution logic
├── lib/                 # Shared utilities and application logic
├── prisma/              # Database schema and Prisma configuration
├── scripts/             # Development / utility scripts
├── server/              # API, auth, room and persistence services
├── docker-compose.yml   # Local PostgreSQL + Redis services
├── package.json         # Scripts and dependencies
├── .env.example         # Environment variable template
└── README.md
Local Development
Prerequisites
Make sure the following are installed:

Node.js 20+

npm

Docker Desktop

Git

1. Clone
git clone https://github.com/PrayagSingh9A7/CodeRoom.git
cd CodeRoom
2. Install dependencies
npm install
3. Configure environment
Copy the example environment file:

Windows PowerShell

Copy-Item .env.example .env
macOS / Linux

cp .env.example .env
Update the environment values as needed for your local setup.

4. Start infrastructure
docker compose up -d postgres redis
5. Initialize the database
npm run db:push
6. Start the application
npm run dev
The development server runs at:

http://localhost:3000
Environment Variables
The repository includes an .env.example file for local configuration.

Typical configuration includes:

NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/DATABASE
REDIS_URL=redis://localhost:6379

SESSION_COOKIE=coderoom_session
SESSION_DAYS=14

EXECUTION_TIMEOUT_MS=5000
IMAGE_PULL_TIMEOUT_MS=300000
MAX_SOURCE_BYTES=600000
Security note
Never commit a real .env file, production database credentials, private tokens, or other secrets to the repository.

Design Decisions
Why Redis?
Redis provides a fast coordination layer for queue-backed execution and other short-lived system state.

Why a queue?
Code execution is inherently unpredictable. A queue makes execution asynchronous and prevents long-running jobs from becoming normal request/response work.

Why Docker sandboxes?
User-submitted code should not execute with the same privileges as the application server. Containers provide an explicit isolation boundary and make resource limits enforceable.

Why PostgreSQL?
Room state, users, files, challenges, test cases, permissions, and execution history are relational entities with clear consistency requirements.

Why a collaborative data model?
A collaborative editor should synchronize changes rather than constantly replacing the entire document. This makes concurrent editing feel immediate and provides a foundation for presence and replay features.

Example Workflow
Technical Interview
Interviewer creates room
        ↓
Selects coding challenge
        ↓
Candidate joins room
        ↓
Both see the same workspace
        ↓
Candidate writes solution
        ↓
Interviewer observes changes live
        ↓
Candidate runs tests
        ↓
Sandboxed execution returns results
        ↓
Session can be replayed afterward
Pair Programming
Developer A joins
        ↕
Shared editor
        ↕
Developer B joins
        ↓
Both edit the same workspace
        ↓
Run tests collaboratively
        ↓
Review the session timeline
Engineering Highlights
CodeRoom demonstrates practical engineering concepts across several layers:

Real-time state synchronization

Collaborative editing

Asynchronous job processing

Queue workers

Containerized execution

Resource isolation

Relational data modeling

Authentication and authorization

Challenge/test orchestration

Persistent execution history

Session replay

Docker-based local infrastructure

Separation of web traffic from untrusted workloads

Current Scope
The current repository contains the core collaborative coding workflow:

authentication

room-based workspace

shared editing

challenge library

custom challenges

public/hidden tests

queued sandbox execution

test result reporting

room roles

collaborator invitations

replay timeline

PostgreSQL persistence

Redis-backed execution

Docker-based local infrastructure

The project is intentionally structured so additional execution languages, stronger sandbox isolation, production observability, and multi-instance deployment can be added without redesigning the entire application.

Roadmap
The architecture leaves room for future improvements such as:

Production deployment with separated web/API and executor services

Multi-worker execution scaling

Stronger sandbox hardening

Artifact/log retention

Execution metrics and observability

Rate limiting and abuse controls

Autoscaling executor workers

Multi-region execution strategy

CI/CD pipeline

Automated test suite

Public room / interview links

More execution languages

Security Considerations
Code execution is the most security-sensitive part of CodeRoom.

The intended model is:

Untrusted Source
      ↓
Queue
      ↓
Isolated Executor
      ↓
Restricted Container
      ↓
Timeout / Resource Limits
      ↓
Result
Important production hardening areas include:

never executing arbitrary code inside the API process

disabling unnecessary container capabilities

restricting network access

enforcing CPU and memory limits

limiting process creation

enforcing execution timeouts

limiting source and artifact sizes

rate limiting execution requests

separating execution hosts from the application host

monitoring executor failures and abuse

Screenshots
Add project screenshots here once the production deployment is live.

Recommended showcase images:

Landing / authentication screen

Collaborative coding workspace

Challenge + editor + test console

Accepted test results

Session replay

Dashboard / room management

Repository
GitHub:
https://github.com/PrayagSingh9A7/CodeRoom

Author
Prayag Singh
B.Tech Data Science student focused on full-stack engineering, cloud computing, distributed systems, and developer tooling.

GitHub: https://github.com/PrayagSingh9A7

LinkedIn: https://www.linkedin.com/in/prayag-singh9/

Portfolio: https://prayag-singh-portfolio.vercel.app/

License
This project does not currently declare a repository license.

<p align="center"> <strong>CodeRoom — collaborative coding with real-time synchronization and isolated execution.</strong> </p>