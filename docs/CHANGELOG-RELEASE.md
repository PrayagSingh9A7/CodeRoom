# CodeRoom release notes

## Editor and workspace UX

- Fixed per-file Yjs/Monaco initialization so switching between `README.md` and `main.py` does not leak one file's document state into another.
- Added canonical text fallback when a Yjs state is empty.
- Reworked the room into a clearer IDE-style layout with the problem statement above the editor and an output/test console below it.
- Added a draggable console divider so output height can be changed without leaving the editor.
- Moved test cases and pass/fail details below the editor.
- Made file deletion explicit and visible in the workspace tree.

## Challenge execution

- Curated problems now provide function-only starter code.
- The execution worker adds the matching problem harness at runtime for the curated Python challenge library.
- Execution results now record a human-readable failure reason and per-test output.
- Existing rooms that still contain the old `Welcome to CodeRoom.` seed are repaired when opened with an active curated challenge.

## README handling

- New rooms get a structured `README.md` that documents the room and session flow.
- Known README corruption from the earlier state-sync bug is repaired without touching normal user-authored documentation.
