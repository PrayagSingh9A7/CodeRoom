# CodeRoom

CodeRoom is a collaborative coding workspace for pair programming, technical interviews and team exercises.

## What this room contains

- `main.py` — the executable solution workspace for the current room.
- `README.md` — notes, instructions and room context. It is intentionally kept separate from the solution file.

## Typical session flow

1. Open the active challenge, if the room has one.
2. Read the description, examples and constraints.
3. Edit the solution file together in the shared editor.
4. Run the solution against public and hidden tests.
5. Review test results, stdout/stderr and comments.
6. Use the replay timeline to inspect the session afterward.

## Collaboration

Multiple room members can edit the same file in real time. Presence and cursor awareness are shown while collaborators are connected.

## Execution

Code runs in disposable Docker sandboxes through an asynchronous queue. The runner applies CPU, memory, process and network controls before returning results to the room.

## Challenges

Curated problems include the problem statement, starter code, examples, constraints and test cases. Interviewers can also create custom problems and private tests.

## Notes

Keep room-specific documentation in this file. Keep executable code in the relevant source file so the workspace remains easy to understand.
