# Security Spec

1. Data Invariants:
- A user document can only be read or written by the user themselves.
- All documents (subjects, tasks, calendarEvents, extracurriculars) have a `userId` field that must strictly match `request.auth.uid`.
- `userId` is immortal and cannot be updated.

2. The "Dirty Dozen" Payloads:
- Payload 1: Create a subject with missing `userId`. (Reject)
- Payload 2: Create a task with someone else's `userId`. (Reject)
- Payload 3: Create a task with valid `userId` but an extra phantom field `isAdmin: true`. (Reject)
- Payload 4: Update a calendarEvent to change `userId`. (Reject)
- Payload 5: Update a task changing workload to "Extreme". (Reject)
- Payload 6: Unauthenticated user trying to read any data. (Reject)
- Payload 7: Update task without sending `userId`, relying on implicit existing. (Accept if valid keys provided)
- Payload 8: Create an extracurricular with an array of objects. (Reject, no such schema)
- Payload 9: Modify a field that doesn't belong to the action. (Reject)
- Payload 10: Create subject with size of `name` > 128. (Reject)
- Payload 11: Attempt to list queries without where clause matching `userId == request.auth.uid`. (Reject)
- Payload 12: Inject large string for document ID. (Reject)
