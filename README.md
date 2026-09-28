
# ⚡ CodeRoom

<p align="center">
  <b>Collaborative Coding & Cloud Execution Platform</b>
  <br/>
  Real-time pair programming, technical interviews, challenge evaluation, and isolated code execution — in one engineering-focused workspace.
</p>

<p align="center">
  <a href="https://github.com/PrayagSingh9A7/CodeRoom">
    <img src="https://img.shields.io/badge/GitHub-CodeRoom-181717?style=for-the-badge&logo=github" alt="GitHub"/>
  </a>
  <img src="https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL"/>
  <img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis"/>
  <img src="https://img.shields.io/badge/Docker-Isolated%20Execution-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-execution-flow">Execution Flow</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-local-development">Local Setup</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

---

## 🚀 Overview

**CodeRoom** is a collaborative coding platform built for:

- 👨‍💻 Pair programming
- 🎯 Technical interviews
- 👥 Team coding sessions
- 🧪 Coding challenge evaluation
- 🔁 Replayable coding sessions

Instead of treating coding as a simple **editor + API + database** application, CodeRoom is designed around three separate engineering concerns:

> **Real-time collaboration + asynchronous execution + isolated code sandboxes**

The result is a workspace where multiple users can work on the same coding session, solve structured challenges, run their code against public and hidden tests, and review the session afterward.

---

## ✨ Key Features

### ⚡ Real-Time Collaborative Coding

CodeRoom allows multiple participants to work inside the same room.

- Shared code editor
- Real-time document synchronization
- Live collaborator presence
- Cursor awareness
- Multi-file workspace
- Role-aware room access
- Collaborative interview workflow

### 🧩 Coding Challenge System

The platform includes a structured challenge experience inspired by modern coding platforms.

Each challenge can contain:

- Problem statement
- Difficulty
- Tags
- Examples
- Constraints
- Starter code
- Public test cases
- Hidden test cases
- Custom challenges

Example:

```text
Challenge
   ├── Problem Statement
   ├── Difficulty
   ├── Constraints
   ├── Examples
   ├── Starter Code
   ├── Public Tests
   └── Hidden Tests
````

### 🧪 Test Execution

Users can run their solution directly from the workspace.

The system evaluates:

* Compilation/runtime status
* Public test cases
* Hidden test cases
* Expected output
* Actual output
* Execution failures
* Recent execution history

Example result:

```text
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
```

### 🐳 Isolated Code Execution

One of the core engineering ideas behind CodeRoom is that **user-submitted code should not execute directly inside the application server**.

Instead:

```text
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
```

The execution environment is designed around controls such as:

* CPU limits
* Memory limits
* Process limits
* Execution timeouts
* Network restrictions
* Source-size limits
* Disposable execution environments

This creates a clear boundary between the **application layer** and the **untrusted execution layer**.

---

## 🏗️ Architecture

CodeRoom separates the major responsibilities instead of placing everything inside one process.

```text
                         ┌─────────────────────┐
                         │      Next.js UI     │
                         │                     │
                         │  Dashboard          │
                         │  Room Workspace     │
                         │  Challenge Panel    │
                         │  Test Console       │
                         │  Replay             │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    API / Control    │
                         │                     │
                         │ Auth                │
                         │ Rooms               │
                         │ Files               │
                         │ Challenges          │
                         │ Permissions         │
                         │ Run Requests        │
                         └──────┬───────┬──────┘
                                │       │
                    ┌───────────┘       └────────────┐
                    ▼                                ▼
             ┌─────────────┐                  ┌─────────────┐
             │    Redis    │                  │ PostgreSQL  │
             │             │                  │             │
             │ Queue       │                  │ Users       │
             │ Jobs        │                  │ Rooms       │
             │ Fast State  │                  │ Files       │
             └──────┬──────┘                  │ Challenges  │
                    │                         │ Test Cases  │
                    ▼                         │ Run History │
             ┌─────────────┐                  └─────────────┘
             │   Executor  │
             │    Worker   │
             └──────┬──────┘
                    │
                    ▼
             ┌─────────────┐
             │    Docker   │
             │   Sandbox   │
             │             │
             │ Restricted  │
             │ Execution   │
             └─────────────┘
```

### Core separation

**Web / Control Plane**

Handles normal application traffic:

* Authentication
* Rooms
* Files
* Challenges
* Permissions
* Persistence
* Run creation

**Collaboration Plane**

Handles low-latency shared editing:

* Shared document state
* Presence
* Cursor awareness
* Concurrent editing

**Execution Plane**

Handles expensive and untrusted workloads:

* Queue consumption
* Sandbox preparation
* Code execution
* Test evaluation
* Result persistence

---

## 🔄 Execution Flow

A typical "Run Tests" request follows this lifecycle:

```text
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
```

This prevents code execution from becoming normal synchronous application work.

---

## 🔐 Security Model

Code execution is the most security-sensitive component of CodeRoom.

The design principle is:

> **Never execute arbitrary user source directly inside the web/API process.**

Instead:

```text
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
```

Production hardening areas include:

* Network isolation
* Capability restrictions
* Resource quotas
* Process limits
* Execution timeouts
* Input/source size limits
* Rate limiting
* Executor monitoring
* Separate execution infrastructure

---

## 🎯 Product Workflow

### Technical Interview

```text
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
```

### Pair Programming

```text
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
```

---

## 🔁 Session Replay

CodeRoom includes a replay-oriented session workflow.

A completed session can be reviewed to understand how the solution evolved over time.

Useful for:

* Technical interview review
* Pair-programming retrospectives
* Debugging sessions
* Understanding implementation decisions
* Reviewing coding behavior

The replay model turns the coding session into more than a final source snapshot.

---

## 👥 Room Roles

The room model is designed around collaborative access rather than a single-user workspace.

Supported concepts include:

| Role            | Purpose                             |
| --------------- | ----------------------------------- |
| **Owner**       | Full room control                   |
| **Interviewer** | Interview-oriented room interaction |
| **Editor**      | Can collaborate on the workspace    |
| **Viewer**      | Read-only participation             |

Rooms can also support collaborator invitations and room-level actions.

---

## 🧱 Workspace Model

A room separates executable code from documentation.

```text
Workspace
│
├── README.md
│   └── Notes / context / instructions
│
└── main.py
    └── Executable solution
```

This keeps documentation and executable source separate instead of mixing them into a single editor state.

---

## 🛠️ Tech Stack

| Layer                  | Technology                          |
| ---------------------- | ----------------------------------- |
| **Frontend**           | Next.js, React, TypeScript          |
| **Editor**             | Monaco Editor                       |
| **Real-Time Sync**     | WebSockets, Yjs-based collaboration |
| **Backend**            | Node.js, TypeScript                 |
| **API**                | HTTP + real-time communication      |
| **Database**           | PostgreSQL                          |
| **ORM**                | Prisma                              |
| **Queue / Fast State** | Redis + BullMQ                      |
| **Execution**          | Docker                              |
| **Styling**            | Tailwind CSS                        |
| **Infrastructure**     | Docker Compose                      |
| **Tooling**            | Git, npm, VS Code                   |

---

## 📁 Project Structure

```text
CodeRoom/
│
├── app/
│   └── Next.js application routes and pages
│
├── components/
│   └── Shared UI and collaborative editor components
│
├── docs/
│   └── Project documentation
│
├── executor/
│   └── Queue worker and sandbox execution logic
│
├── lib/
│   └── Shared utilities and application logic
│
├── prisma/
│   └── Database schema and Prisma configuration
│
├── scripts/
│   └── Development / utility scripts
│
├── server/
│   └── API, authentication, rooms and persistence
│
├── docker-compose.yml
│   └── Local PostgreSQL + Redis infrastructure
│
├── package.json
│   └── Dependencies and scripts
│
├── .env.example
│   └── Environment configuration template
│
└── README.md
```

---

## 💻 Local Development

### Prerequisites

Make sure you have:

* **Node.js 20+**
* **npm**
* **Docker Desktop**
* **Git**

### 1. Clone the repository

```bash
git clone https://github.com/PrayagSingh9A7/CodeRoom.git
cd CodeRoom
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example environment file.

#### Windows

```powershell
Copy-Item .env.example .env
```

#### macOS / Linux

```bash
cp .env.example .env
```

### 4. Start PostgreSQL and Redis

```bash
docker compose up -d postgres redis
```

### 5. Initialize the database

```bash
npm run db:push
```

### 6. Start CodeRoom

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## ⚙️ Environment Variables

Example configuration:

```env
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
```

### 🔒 Important

Do **not** commit:

```text
.env
```

to GitHub.

Commit:

```text
.env.example
```

instead.

Never expose:

* Production database passwords
* Session secrets
* API keys
* Private tokens
* Cloud credentials

---

## 🧠 Important Engineering Decisions

### Why Redis?

Redis provides a fast coordination and queue layer for workloads that should not block normal application requests.

### Why BullMQ?

Code execution is asynchronous and potentially expensive.

A queue provides:

* Job isolation
* Worker-based execution
* Retry possibilities
* Better concurrency control
* Separation from normal HTTP traffic

### Why PostgreSQL?

CodeRoom contains strongly related entities:

```text
Users
Rooms
Files
Challenges
Test Cases
Permissions
Execution History
```

A relational database provides structured persistence and consistency for these relationships.

### Why Docker?

The application must treat submitted source code as **untrusted workload**.

Docker provides a practical isolation boundary for the execution layer and enables resource restrictions around execution.

### Why Separate the Execution Layer?

A slow or malicious execution job should not consume resources of the main application process.

Separating execution gives the system a path toward:

* Independent scaling
* Dedicated execution workers
* Failure isolation
* Resource control
* Multiple executor hosts

---

## 📊 Engineering Concepts Demonstrated

CodeRoom brings together several backend and systems concepts:

* **Real-time collaboration**
* **Concurrent state synchronization**
* **WebSocket communication**
* **Asynchronous job processing**
* **Queue-based architecture**
* **Worker processes**
* **Container isolation**
* **Resource limiting**
* **Relational data modeling**
* **Authentication & authorization**
* **Challenge/test orchestration**
* **Persistent execution history**
* **Session replay**
* **Dockerized development infrastructure**
* **Separation of control and execution workloads**

---

## 📸 Screenshots

> Add production screenshots here after deployment.

Recommended screenshots:

```text
1. Landing / Authentication
2. Dashboard
3. Collaborative Coding Room
4. Challenge + Editor + Console
5. Accepted Test Results
6. Session Replay
```

Example:

```markdown
![CodeRoom Workspace](./docs/screenshots/workspace.png)
```

---

## 🚧 Roadmap

### Phase 1 — Core Platform

* [x] Authentication
* [x] Room-based workspace
* [x] Collaborative editing
* [x] Challenge library
* [x] Public tests
* [x] Hidden tests
* [x] Custom challenges
* [x] Execution queue
* [x] Docker sandbox
* [x] Execution results
* [x] Room roles
* [x] Collaborator invitations
* [x] Replay timeline

### Phase 2 — Production Engineering

* [ ] Production deployment
* [ ] Separate API and executor services
* [ ] Dedicated executor workers
* [ ] CI/CD pipeline
* [ ] Automated test suite
* [ ] Rate limiting
* [ ] Observability
* [ ] Structured logging
* [ ] Metrics and tracing

### Phase 3 — Scaling

* [ ] Multiple executor workers
* [ ] Executor autoscaling
* [ ] Artifact storage
* [ ] Execution result retention
* [ ] Horizontal scaling
* [ ] Stronger sandbox isolation
* [ ] Multi-region execution strategy

---

## 🌐 Deployment Architecture

The intended production architecture separates the public application from the execution infrastructure.

```text
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
```

This creates a foundation for independently scaling the application and execution workloads.

---

## 🔮 Future Direction

CodeRoom is intentionally structured so the execution layer can evolve independently from the product layer.

Potential future improvements include:

* Multi-language execution
* Dedicated execution clusters
* Stronger sandboxing
* Execution artifact storage
* Observability dashboards
* Worker autoscaling
* Interview analytics
* Public interview rooms
* Session analytics
* Collaborative debugging tools

---

## ⭐ Why This Project?

CodeRoom was built to explore what happens when a coding platform has to solve more than just CRUD.

The interesting part is the combination of:

```text
Real-Time Systems
        +
Distributed Workload Processing
        +
Code Execution Isolation
        +
Persistent Application State
```

The product UI is only one part of the system.

The real engineering challenge is making these components work together reliably:

```text
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
```

---

## 📌 Repository

**GitHub:**
[https://github.com/PrayagSingh9A7/CodeRoom](https://github.com/PrayagSingh9A7/CodeRoom)

---

## 👨‍💻 Author

### Prayag Singh

**B.Tech Data Science | Full-Stack & Cloud Engineering**

I build full-stack systems with an interest in:

* Distributed systems
* Cloud computing
* Backend engineering
* Real-time applications
* Developer tooling
* System design

**GitHub:**
[https://github.com/PrayagSingh9A7](https://github.com/PrayagSingh9A7)

**LinkedIn:**
[https://www.linkedin.com/in/prayag-singh9/](https://www.linkedin.com/in/prayag-singh9/)

**Portfolio:**
[https://prayag-singh-portfolio.vercel.app/](https://prayag-singh-portfolio.vercel.app/)

---

## ⭐ Support

If you find the project interesting, consider giving the repository a **star** ⭐

---

<p align="center">
  <b>CodeRoom</b>
  <br/>
  Collaborative coding • Real-time synchronization • Isolated execution
</p>
