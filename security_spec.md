# EzeCheck Cloud Firestore Security Specification

## 1. Data Invariants & Master Source of Truth

1. **Identity & Ownership Invariant**:
   - Every `/users/{userId}` document is strictly owned by `request.auth.uid == userId` and `incoming().uid == request.auth.uid`.
   - Every `/readings/{readingId}` and `/captures/{captureId}` document MUST belong to an existing user profile (`exists(/databases/$(database)/documents/users/$(request.auth.uid))`) and have `ownerId == request.auth.uid`.
2. **PII Isolation Invariant**:
   - `/users/{userId}` contains PII (`email`, `displayName`). `allow list` is strictly forbidden (`false`), and `allow get` is restricted exclusively to `request.auth.uid == userId`.
3. **Temporal & Immutability Invariant**:
   - All `createdAt` fields must equal `request.time` on `create` and remain strictly immutable (`incoming().createdAt == existing().createdAt`) on `update`.
   - All `updatedAt` fields on `/users/{userId}` must equal `request.time`.
   - `ownerId` and `uid` fields are strictly immutable after creation.
4. **Query Enforcer Invariant**:
   - `allow list` on `/readings/{readingId}` and `/captures/{captureId}` enforces `resource.data.ownerId == request.auth.uid` with zero `get()`/`exists()` calls inside `list`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Identity Spoofing on Reading Creation)**:
   ```json
   {
     "ownerId": "victim_user_123",
     "heartRate": 72,
     "spo2": 98,
     "hemoglobin": 14.2,
     "perfusionIndex": 4.1,
     "skinTemp": 36.6,
     "deviceName": "EzeCheck-ESP32-01",
     "connectionType": "BLE",
     "status": "nominal",
     "notes": "Spoofed reading",
     "recordedAtMs": 1791128000000,
     "createdAt": "SERVER_TIMESTAMP"
   }
   ```
   *Expected Result*: `PERMISSION_DENIED` (`ownerId != request.auth.uid`).

2. **Payload 2 (Shadow Field Injection on UserProfile)**:
   ```json
   {
     "uid": "user_abc",
     "displayName": "Dr. Maya Lin",
     "email": "maya@example.com",
     "deviceHardwareId": "ESP32-A4:CF:12",
     "isAdmin": true,
     "createdAt": "SERVER_TIMESTAMP",
     "updatedAt": "SERVER_TIMESTAMP"
   }
   ```
   *Expected Result*: `PERMISSION_DENIED` (`hasOnly` blocks shadow key `isAdmin`).

3. **Payload 3 (Unverified Email Write Attempt)**:
   - Auth Context: `{ uid: "user_abc", token: { email: "maya@example.com", email_verified: false } }`
   *Expected Result*: `PERMISSION_DENIED` (`request.auth.token.email_verified == true` required).

4. **Payload 4 (PII Cross-User Profile Read)**:
   - Auth Context: `{ uid: "attacker_999", token: { email_verified: true } }`
   - Operation: `get /users/victim_user_123`
   *Expected Result*: `PERMISSION_DENIED` (`isOwner(userId)` fails).

5. **Payload 5 (User Directory Scraping via List)**:
   - Auth Context: `{ uid: "attacker_999", token: { email_verified: true } }`
   - Operation: `list /users`
   *Expected Result*: `PERMISSION_DENIED` (`allow list` is `false` on `/users`).

6. **Payload 6 (Unfiltered List Query on Readings)**:
   - Auth Context: `{ uid: "attacker_999", token: { email_verified: true } }`
   - Operation: `list /readings` without `where('ownerId', '==', 'attacker_999')`
   *Expected Result*: `PERMISSION_DENIED` (`resource.data.ownerId == request.auth.uid` enforced).

7. **Payload 7 (Denial-of-Wallet 2KB String Overflow in Reading Notes)**:
   - `notes`: `"A".repeat(2048)` (exceeds `maxLength: 500`)
   *Expected Result*: `PERMISSION_DENIED` (`data.notes.size() <= 500` fails).

8. **Payload 8 (ID Poisoning Attack with Special Characters)**:
   - Path: `/readings/invalid$id#with!spaces`
   *Expected Result*: `PERMISSION_DENIED` (`isValidId(readingId)` regex check fails).

9. **Payload 9 (Orphaned Reading Creation Without User Profile)**:
   - Auth Context: `{ uid: "new_user_no_profile", token: { email_verified: true } }`
   - Operation: `create /readings/reading_01` before `/users/new_user_no_profile` exists
   *Expected Result*: `PERMISSION_DENIED` (`exists(/databases/$(database)/documents/users/$(request.auth.uid))` fails).

10. **Payload 10 (Client Timestamp Forgery on Creation)**:
    - `createdAt`: `Timestamp.fromMillis(1600000000000)` (past timestamp instead of `request.time`)
    *Expected Result*: `PERMISSION_DENIED` (`incoming().createdAt == request.time` fails).

11. **Payload 11 (Immutable Field Tampering on UserProfile Update)**:
    - Operation: `update /users/user_abc` changing `createdAt` or `uid`
    *Expected Result*: `PERMISSION_DENIED` (`affectedKeys().hasOnly(['displayName', 'deviceHardwareId', 'updatedAt'])` and immutability checks fail).

12. **Payload 12 (Out-of-Bounds Physiological Sensor Payload)**:
    - Operation: `create /readings/reading_02` with `heartRate: 9999` or `spo2: 150`
    *Expected Result*: `PERMISSION_DENIED` (`isValidHealthReading` numeric boundary checks fail).
