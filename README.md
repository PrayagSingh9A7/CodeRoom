<h1><strong>⚡ CodeRoom</strong></h1>

<p align="center">
   <a href="https://code-room-opal.vercel.app">
     <img src="https://img.shields.io/badge/%E2%9A%A1%20LIVE_DEMO-Open%20CodeRoom-2ea44f?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo"/>
   </a>
   <a href="https://github.com/PrayagSingh9A7/CodeRoom">
     <img src="https://img.shields.io/badge/GitHub-CodeRoom-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
   </a>
</p>
<p align="center">
   <strong>Collaborative Coding & Cloud Execution Platform</strong><br/>
   Real-time pair programming, technical interviews, challenge evaluation, and isolated code execution — in one engineering-focused workspace.
</p>
<table align="center">
   <tr>
     <td align="center"><strong>⚡ Real-Time</strong><br/>Yjs + WebSockets</td>
     <td align="center"><strong>🧪 Challenge Runner</strong><br/>Public + hidden tests</td>
     <td align="center"><strong>🐳 Isolated Execution</strong><br/>Docker sandboxing</td>
     <td align="center"><strong>🔁 Replay</strong><br/>Session history</td>
   </tr>
</table>
<p align="center">
   <img src="https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js"/>
   <img src="https://img.shields.io/badge/React-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="React TypeScript"/>
   <img src="https://img.shields.io/badge/Yjs-CRDTs-F59E0B?style=flat-square" alt="Yjs"/>
   <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
   <img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis"/>
   <img src="https://img.shields.io/badge/BullMQ-Queues-111827?style=flat-square" alt="BullMQ"/>
   <img src="https://img.shields.io/badge/Docker-Isolated%20Execution-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"/>
</p>
<p align="center">
   <a href="#-overview"><strong>Overview</strong></a> •
   <a href="#-key-features"><strong>Features</strong></a> •
   <a href="#-architecture"><strong>Architecture</strong></a> •
   <a href="#-execution-flow"><strong>Execution</strong></a> •
   <a href="#-security-model"><strong>Security</strong></a> •
   <a href="#-tech-stack"><strong>Stack</strong></a> •
   <a href="#-local-development"><strong>Setup</strong></a> •
   <a href="#-roadmap"><strong>Roadmap</strong></a>
</p>

<h2><strong>🚀 Overview</strong></h2>

CodeRoom is a collaborative coding platform built for:

Use case

What CodeRoom provides

👨‍💻 Pair Programming

Shared editing, presence, cursor awareness and collaborative execution

🎯 Technical Interviews

Interview rooms, roles, challenges, public/hidden tests and replay

👥 Team Coding

Multi-user rooms with permission-aware collaboration

🧪 Challenge Evaluation

Structured problems, tests, execution results and history

🔁 Session Review

Replay-oriented editing history and execution timelines

Instead of treating coding as a simple editor + API + database application, CodeRoom is designed around three separate engineering concerns:

Real-time collaboration + asynchronous execution + isolated code sandboxes

The result is a workspace where multiple users can work on the same coding session, solve structured challenges, run their code against public and hidden tests, and review the session afterward.

<h3><strong>🌐 Live Demo</strong></h3>

🚀 Try the production workspace: edit collaboratively, run a challenge, and inspect the execution result.

<p align="center">
   <a href="https://code-room-opal.vercel.app">
     <img src="https://img.shields.io/badge/OPEN%20CODEROOM-Live%20Demo-2ea44f?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Open CodeRoom Live Demo"/>
   </a>
</p>

<h2><strong>✨ Key Features</strong></h2>

<h3><strong>⚡ Real-Time Collaborative Coding</strong></h3>

CodeRoom allows multiple participants to work inside the same room.

Shared code editor

Real-time document synchronization

Live collaborator presence

Cursor awareness

Multi-file workspace

Role-aware room access

Collaborative interview workflow

<h3><strong>🧩 Coding Challenge System</strong></h3>

The platform includes a structured challenge experience inspired by modern coding platforms.
Each challenge can contain:

Problem statement

Difficulty

Tags

Examples

Constraints

Starter code

Public test cases

Hidden test cases

Custom challenges

Challenge
   ├── Problem Statement
   ├── Difficulty
   ├── Constraints
   ├── Examples
   ├── Starter Code
   ├── Public Tests
   └── Hidden Tests

<h3><strong>🧪 Test Execution</strong></h3>

Users can run their solution directly from the workspace.
The system evaluates:

Compilation / runtime status

Public test cases

Hidden test cases

Expected output

Actual output

Execution failures

Recent execution history

<h4><strong>Example Result</strong></h4>

✅ Accepted

3 / 3 tests passed

Overlapping
Expected → [[1, 6], [8, 10], [15, 18]]
Output   → [[1, 6], [8, 10], [15, 18]]

Touching
Expected → [[1, 5]]
Output   → [[1, 5]]

Contained
Hidden Test
✅ Passed

<h3><strong>🐳 Isolated Code Execution</strong></h3>

One of the core engineering ideas behind CodeRoom is that user-submitted code should not execute directly inside the application server.
Instead:

User Code
   ↓
Execution Request
   ↓
Redis / Queue
   ↓
Executor Worker
   ↓
Docker Sandbox
   ↓
Test Evaluation
   ↓
Execution Result
   ↓
CodeRoom UI

The execution environment is designed around controls such as:

CPU limits

Memory limits

Process limits

Execution timeouts

Network restrictions

Source-size limits

Disposable execution environments

This creates a clear boundary between the application layer and the untrusted execution layer.

<h2><strong>🏗️ Architecture</strong></h2>

CodeRoom separates the major responsibilities instead of placing everything inside one process.

                           ┌────────────────────────┐
                           │       Next.js UI       │
                           │────────────────────────│
                           │ Dashboard              │
                           │ Room Workspace         │
                           │ Challenge Panel        │
                           │ Test Console            │
                           │ Replay                  │
                           └────────────┬───────────┘
                                        │
                                        ▼
                           ┌────────────────────────┐
                           │      API / Control     │
                           │────────────────────────│
                           │ Auth                   │
                           │ Rooms                  │
                           │ Files                  │
                           │ Challenges             │
                           │ Permissions            │
                           │ Run Requests           │
                           └───────┬─────────┬──────┘
                                   │         │
                         ┌─────────┘         └───────────┐
                         ▼                               ▼
                  ┌──────────────┐                ┌──────────────┐
                  │    Redis     │                │  PostgreSQL  │
                  │──────────────│                │──────────────│
                  │ Queue        │                │ Users        │
                  │ Jobs         │                │ Rooms        │
                  │ Fast State   │                │ Files        │
                  └──────┬───────┘                │ Challenges   │
                         │                        │ Test Cases   │
                         ▼                        │ Run History  │
                  ┌──────────────┐                └──────────────┘
                  │   Executor   │
                  │    Worker    │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │    Docker    │
                  │   Sandbox    │
                  │──────────────│
                  │ Restricted   │
                  │ Execution    │
                  └──────────────┘

<h3><strong>Core separation</strong></h3>

Plane

Responsibility

Web / Control Plane

Authentication, rooms, files, challenges, permissions, persistence and run creation

Collaboration Plane

Shared document state, presence, cursor awareness and concurrent editing

Execution Plane

Queue consumption, sandbox preparation, execution, test evaluation and result persistence

<h2><strong>🔄 Execution Flow</strong></h2>

A typical Run Tests request follows this lifecycle:

1. User edits solution
        │
        ▼
2. Clicks "Run Tests"
        │
        ▼
3. Server validates request
        │
        ▼
4. Execution job enters queue
        │
        ▼
5. Executor worker consumes job
        │
        ▼
6. Temporary sandbox is created
        │
        ▼
7. Source + test data are prepared
        │
        ▼
8. Code executes with resource limits
        │
        ▼
9. stdout / stderr are collected
        │
        ▼
10. Tests are evaluated
        │
        ▼
11. Result is persisted
        │
        ▼
12. UI displays test results

Design goal: code execution stays asynchronous instead of becoming normal synchronous application work.

<h2><strong>🔐 Security Model</strong></h2>

Code execution is the most security-sensitive component of CodeRoom.

Never execute arbitrary user source directly inside the web/API process.

Instead:

                 UNTRUSTED SOURCE
                        │
                        ▼
                 Execution Queue
                        │
                        ▼
                  Executor Worker
                        │
                        ▼
                  Docker Sandbox
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
       CPU Limit     Memory Limit   Process Limit
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                  Timeout Control
                        │
                        ▼
                  Test Evaluation
                        │
                        ▼
                      Result

<h3><strong>Hardening areas</strong></h3>

Area

Purpose

Network isolation

Prevent unrestricted outbound access during execution

Capability restrictions

Reduce the sandbox's available privileges

Resource quotas

Bound CPU and memory consumption

Process limits

Restrict runaway process creation

Execution timeouts

Stop jobs that exceed allowed runtime

Input/source limits

Prevent oversized workloads

Rate limiting

Reduce abusive execution patterns

Executor monitoring

Observe execution infrastructure

Separate execution infrastructure

Keep untrusted workload away from the main app process

<h2><strong>🎯 Product Workflow</strong></h2>

<h3><strong>Technical Interview</strong></h3>

Interviewer
     │
     ▼
Creates Room
     │
     ▼
Selects Challenge
     │
     ▼
Candidate Joins
     │
     ▼
Shared Coding Workspace
     │
     ▼
Candidate Writes Solution
     │
     ▼
Run Public + Hidden Tests
     │
     ▼
Review Results
     │
     ▼
Replay Session

<h3><strong>Pair Programming</strong></h3>

Developer A ───────┐
                   │
                   ▼
             Shared Room
                   ▲
                   │
Developer B ───────┘
                   │
                   ▼
             Shared Editor
                   │
                   ▼
              Run Tests
                   │
                   ▼
             Review Session

<h2><strong>🔁 Session Replay</strong></h2>

CodeRoom includes a replay-oriented session workflow.
A completed session can be reviewed to understand how the solution evolved over time.
Useful for:

Technical interview review

Pair-programming retrospectives

Debugging sessions

Understanding implementation decisions

Reviewing coding behavior

The replay model turns the coding session into more than a final source snapshot.

<h2><strong>👥 Room Roles</strong></h2>

The room model is designed around collaborative access rather than a single-user workspace.

Role

Purpose

Owner

Full room control

Interviewer

Interview-oriented room interaction

Editor

Can collaborate on the workspace

Viewer

Read-only participation

Rooms can also support collaborator invitations and room-level actions.

<h2><strong>🧱 Workspace Model</strong></h2>

A room separates executable code from documentation.

Workspace
│
├── README.md
│   └── Notes / context / instructions
│
└── main.py
    └── Executable solution

This keeps documentation and executable source separate instead of mixing them into a single editor state.

<h2><strong>🛠️ Tech Stack</strong></h2>

Layer

Technology

Frontend

Next.js, React, TypeScript

Editor

Monaco Editor

Real-Time Sync

WebSockets, Yjs-based collaboration

Backend

Node.js, TypeScript

API

HTTP + real-time communication

Database

PostgreSQL

ORM

Prisma

Queue / Fast State

Redis + BullMQ

Execution

Docker

Styling

Tailwind CSS

Infrastructure

Docker Compose

Tooling

Git, npm, VS Code

<h2><strong>📁 Project Structure</strong></h2>

CodeRoom/
│
├── app/                     # Next.js application routes and pages
├── components/              # Shared UI + collaborative editor
├── docs/                    # Project documentation
├── executor/                # Queue worker + sandbox execution
├── lib/                     # Shared utilities and app logic
├── prisma/                  # Database schema + Prisma configuration
├── scripts/                 # Development / utility scripts
├── server/                  # API, auth, rooms and persistence
├── docker-compose.yml       # Local PostgreSQL + Redis
├── package.json             # Dependencies and scripts
├── .env.example             # Environment configuration template
└── README.md

<h2><strong>💻 Local Development</strong></h2>

<h3><strong>Prerequisites</strong></h3>

Make sure you have:

Node.js 20+

npm

Docker Desktop

Git

<h3><strong>1️⃣ Clone the repository</strong></h3>

git clone https://github.com/PrayagSingh9A7/CodeRoom.git
cd CodeRoom

<h3><strong>2️⃣ Install dependencies</strong></h3>

npm install

<h3><strong>3️⃣ Configure environment variables</strong></h3>

Copy the example environment file.
Windows

Copy-Item .env.example .env

macOS / Linux

cp .env.example .env

<h3><strong>4️⃣ Start PostgreSQL and Redis</strong></h3>

docker compose up -d postgres redis

<h3><strong>5️⃣ Initialize the database</strong></h3>

npm run db:push

<h3><strong>6️⃣ Start CodeRoom</strong></h3>

npm run dev

Open:

http://localhost:3000

<h2><strong>⚙️ Environment Variables</strong></h2>

Example configuration:

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

<h3><strong>🔒 Important</strong></h3>

Do not commit:

.env

to GitHub.
Commit:

.env.example

instead.
Never expose:

Production database passwords

Session secrets

API keys

Private tokens

Cloud credentials

<h2><strong>🧠 Important Engineering Decisions</strong></h2>

<h3><strong>Why Redis?</strong></h3>

Redis provides a fast coordination and queue layer for workloads that should not block normal application requests.

<h3><strong>Why BullMQ?</strong></h3>

Code execution is asynchronous and potentially expensive.
A queue provides:

Job isolation

Worker-based execution

Retry possibilities

Better concurrency control

Separation from normal HTTP traffic

<h3><strong>Why PostgreSQL?</strong></h3>

CodeRoom contains strongly related entities:

Users
Rooms
Files
Challenges
Test Cases
Permissions
Execution History

A relational database provides structured persistence and consistency for these relationships.

<h3><strong>Why Docker?</strong></h3>

The application must treat submitted source code as untrusted workload.
Docker provides a practical isolation boundary for the execution layer and enables resource restrictions around execution.

<h3><strong>Why Separate the Execution Layer?</strong></h3>

A slow or malicious execution job should not consume resources of the main application process.
Separating execution gives the system a path toward:

Independent scaling

Dedicated execution workers

Failure isolation

Resource control

Multiple executor hosts

<h2><strong>📊 Engineering Concepts Demonstrated</strong></h2>

Area

Concepts

Real-time systems

Yjs / CRDT-style synchronization, WebSockets, presence

Distributed workload processing

Queue-based execution, worker processes, asynchronous jobs

Containerized execution

Docker sandboxing, resource limiting, execution timeouts

Backend engineering

API design, persistence, authorization, execution orchestration

Data modeling

Relational entities, permissions, test cases, execution history

Developer tooling

Monaco editor, challenge runner, replay-oriented workflow

Infrastructure

Dockerized local development and separated execution workloads

<h2><strong>📸 Screenshots</strong></h2>

Production screenshots can be added here after the final UI pass.

<table>
   <tr>
     <td align="center"><b>01 · Landing / Authentication</b></td>
     <td align="center"><b>02 · Dashboard</b></td>
   </tr>
   <tr>
     <td align="center">Add <code>docs/screenshots/landing.png</code></td>
     <td align="center">Add <code>docs/screenshots/dashboard.png</code></td>
   </tr>
   <tr>
     <td align="center"><b>03 · Collaborative Workspace</b></td>
     <td align="center"><b>04 · Accepted Test Results</b></td>
   </tr>
   <tr>
     <td align="center">Add <code>docs/screenshots/workspace.png</code></td>
     <td align="center">Add <code>docs/screenshots/results.png</code></td>
   </tr>
   <tr>
     <td colspan="2" align="center"><b>05 · Session Replay</b></td>
   </tr>
   <tr>
     <td colspan="2" align="center">Add <code>docs/screenshots/replay.png</code></td>
   </tr>
</table>
Once screenshots are added, use:

<p align="center">
  <img src="./docs/screenshots/workspace.png" width="900" alt="CodeRoom collaborative workspace"/>
</p>

<h2><strong>🚧 Roadmap</strong></h2>

<h3><strong>Phase 1 — Core Platform ✅</strong></h3>

Authentication

Room-based workspace

Collaborative editing

Challenge library

Public tests

Hidden tests

Custom challenges

Execution queue

Docker sandbox

Execution results

Room roles

Collaborator invitations

Replay timeline

<h3><strong>Phase 2 — Production Engineering</strong></h3>

Production deployment

Separate API and executor services

Dedicated executor workers

CI/CD pipeline

Automated test suite

Rate limiting

Observability

Structured logging

Metrics and tracing

<h3><strong>Phase 3 — Scaling</strong></h3>

Multiple executor workers

Executor autoscaling

Artifact storage

Execution result retention

Horizontal scaling

Stronger sandbox isolation

Multi-region execution strategy

<h2><strong>🌐 Deployment Architecture</strong></h2>

The production architecture separates the public application from the execution infrastructure.

                         INTERNET
                             │
                             ▼
                    ┌────────────────┐
                    │   Next.js App  │
                    │   Web / UI     │
                    └───────┬────────┘
                            │
                    ┌───────▼────────┐
                    │   API / Auth   │
                    └───────┬────────┘
                            │
             ┌──────────────┼───────────────┐
             │              │               │
             ▼              ▼               ▼
        PostgreSQL       Redis          Collaboration
             │              │               │
             │              ▼               │
             │         Execution Queue      │
             │              │               │
             │              ▼               │
             │       Executor Workers       │
             │              │               │
             │              ▼               │
             │      Docker Sandboxes        │
             │                              │
             └──────────────┬───────────────┘
                            ▼
                    Execution Results

This creates a foundation for independently scaling the application and execution workloads.

<h2><strong>🔮 Future Direction</strong></h2>

CodeRoom is intentionally structured so the execution layer can evolve independently from the product layer.
Potential future improvements include:

Multi-language execution

Dedicated execution clusters

Stronger sandboxing

Execution artifact storage

Observability dashboards

Worker autoscaling

Interview analytics

Public interview rooms

Session analytics

Collaborative debugging tools

<h2><strong>⭐ Why This Project?</strong></h2>

CodeRoom was built to explore what happens when a coding platform has to solve more than just CRUD.
The interesting part is the combination of:

<table>
   <tr>
     <td align="center"><b>Real-Time Systems</b></td>
     <td align="center">+</td>
     <td align="center"><b>Distributed Workload Processing</b></td>
   </tr>
   <tr>
     <td align="center"><b>Code Execution Isolation</b></td>
     <td align="center">+</td>
     <td align="center"><b>Persistent Application State</b></td>
   </tr>
</table>
The product UI is only one part of the system.
The real engineering challenge is making these components work together reliably:

Collaboration
      ↓
Application State
      ↓
Queue
      ↓
Workers
      ↓
Sandbox
      ↓
Test Evaluation
      ↓
Persistent Results
      ↓
Replay

<h2><strong>📌 Repository</strong></h2>

<p align="center">
   <a href="https://github.com/PrayagSingh9A7/CodeRoom">
     <img src="https://img.shields.io/badge/View%20Source-GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="View Source on GitHub"/>
   </a>
</p>

<h2><strong>👨‍💻 Author</strong></h2>

<h3><strong>Prayag Singh</strong></h3>

B.Tech Data Science | Full-Stack & Cloud Engineering
I build full-stack systems with an interest in:

Distributed systems

Cloud computing

Backend engineering

Real-time applications

Developer tooling

System design



Link

GitHub

PrayagSingh9A7

LinkedIn

Prayag Singh

Portfolio

Portfolio

<h2><strong>⭐ Support</strong></h2>

If you find the project interesting, consider giving the repository a star ⭐

<p align="center">
   <b>CodeRoom</b><br/>
   Collaborative coding • Real-time synchronization • Isolated execution
</p>
