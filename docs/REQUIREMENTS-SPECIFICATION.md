# AutoMade Requirements Specification

**Project:** AutoMade
**Version:** 1.0
**Date:** 2025-12-30
**Author:** Fractionate LLC
**Status:** Approved

---

## 1. Executive Summary

AutoMade is an AI-powered project discovery and management platform that facilitates real-time voice/video sessions between clients and AI agents. The system manages the complete project lifecycle from discovery through deployment, with integrated document management, milestone tracking, and cost analytics.

---

## 2. Functional Requirements

### 2.1 Document Management (Phase 1)

#### FR-DOC-001: Document Upload
| ID | FR-DOC-001 |
|----|------------|
| **Priority** | High |
| **Description** | Users can upload documents to projects with drag-and-drop or file picker |
| **Acceptance Criteria** | - Support files up to 100MB<br>- Progress indicator during upload<br>- Preview before upload confirmation<br>- Multi-file batch upload |
| **Dependencies** | Storage service (local/S3) |

#### FR-DOC-002: Document Versioning
| ID | FR-DOC-002 |
|----|------------|
| **Priority** | High |
| **Description** | System maintains version history for all documents |
| **Acceptance Criteria** | - Auto-increment version on upload<br>- Version comment support<br>- SHA-256 checksum for integrity<br>- View/restore previous versions |
| **Dependencies** | FR-DOC-001 |

#### FR-DOC-003: Document Preview
| ID | FR-DOC-003 |
|----|------------|
| **Priority** | Medium |
| **Description** | In-browser preview for common file types |
| **Acceptance Criteria** | - PDF viewer<br>- Image viewer (PNG, JPG, GIF, WebP)<br>- Text/code viewer with syntax highlighting<br>- Fallback download for unsupported types |
| **Dependencies** | FR-DOC-001 |

#### FR-DOC-004: Document Metadata
| ID | FR-DOC-004 |
|----|------------|
| **Priority** | Medium |
| **Description** | Tag and categorize documents |
| **Acceptance Criteria** | - Custom tags<br>- Document state (draft/review/approved/published/archived)<br>- Search by metadata<br>- Filter by type, date, tag |
| **Dependencies** | FR-DOC-001 |

---

### 2.2 Milestone Management (Phase 1)

#### FR-MIL-001: Milestone CRUD
| ID | FR-MIL-001 |
|----|------------|
| **Priority** | High |
| **Description** | Create, read, update, delete project milestones |
| **Acceptance Criteria** | - Title and description<br>- Due date<br>- Completion status<br>- Link to project |
| **Dependencies** | Projects module |

#### FR-MIL-002: Milestone Timeline
| ID | FR-MIL-002 |
|----|------------|
| **Priority** | High |
| **Description** | Visual timeline view of milestones |
| **Acceptance Criteria** | - Chronological display<br>- Color-coded status<br>- Clickable for details<br>- Responsive layout |
| **Dependencies** | FR-MIL-001 |

#### FR-MIL-003: Drag-Drop Reordering
| ID | FR-MIL-003 |
|----|------------|
| **Priority** | Medium |
| **Description** | Reorder milestones via drag-and-drop |
| **Acceptance Criteria** | - Smooth drag animation<br>- Order persisted to database<br>- Works on touch devices<br>- Keyboard accessible |
| **Dependencies** | FR-MIL-001, @dnd-kit library |

#### FR-MIL-004: Completion Tracking
| ID | FR-MIL-004 |
|----|------------|
| **Priority** | High |
| **Description** | Track and display milestone completion |
| **Acceptance Criteria** | - Mark complete with timestamp<br>- Completion percentage on timeline<br>- Link time entries to milestones<br>- Progress visualization |
| **Dependencies** | FR-MIL-001 |

---

### 2.3 Progress/Cost Tracking (Phase 1)

#### FR-TRK-001: Time Entry Logging
| ID | FR-TRK-001 |
|----|------------|
| **Priority** | High |
| **Description** | Log time entries against projects |
| **Acceptance Criteria** | - Date, hours, description<br>- Billable/non-billable flag<br>- Link to milestone (optional)<br>- User attribution |
| **Dependencies** | Projects module |

#### FR-TRK-002: Progress Visualization
| ID | FR-TRK-002 |
|----|------------|
| **Priority** | High |
| **Description** | Visual charts showing project progress |
| **Acceptance Criteria** | - Hours logged vs estimated<br>- Burndown chart<br>- Progress ring/bar<br>- Weekly/monthly breakdown |
| **Dependencies** | FR-TRK-001, Recharts library |

#### FR-TRK-003: Cost Tracking
| ID | FR-TRK-003 |
|----|------------|
| **Priority** | High |
| **Description** | Track project costs with budget comparison |
| **Acceptance Criteria** | - Budget vs actual<br>- Cost breakdown by source<br>- AI/LLM usage costs<br>- Export to CSV |
| **Dependencies** | FR-TRK-001, Provider usage logs |

#### FR-TRK-004: Dashboard Metrics
| ID | FR-TRK-004 |
|----|------------|
| **Priority** | Medium |
| **Description** | Project dashboard with key metrics |
| **Acceptance Criteria** | - Metric cards (hours, cost, completion %)<br>- Charts in overview tab<br>- Refresh on data change<br>- Print/export support |
| **Dependencies** | FR-TRK-002, FR-TRK-003 |

---

### 2.4 LiveKit Integration (Phase 2)

#### FR-LIV-001: Room Connection
| ID | FR-LIV-001 |
|----|------------|
| **Priority** | High |
| **Description** | Connect to LiveKit rooms for voice/video sessions |
| **Acceptance Criteria** | - Secure token generation<br>- Connection state management<br>- Reconnection handling<br>- Error state feedback |
| **Dependencies** | LiveKit server, @livekit/components-react |

#### FR-LIV-002: Video Grid
| ID | FR-LIV-002 |
|----|------------|
| **Priority** | High |
| **Description** | Display participant video tiles |
| **Acceptance Criteria** | - Adaptive grid layout<br>- Dominant speaker highlight<br>- Screenshare support<br>- Quality indicators |
| **Dependencies** | FR-LIV-001 |

#### FR-LIV-003: Session Controls
| ID | FR-LIV-003 |
|----|------------|
| **Priority** | High |
| **Description** | Audio/video controls for participants |
| **Acceptance Criteria** | - Mute/unmute audio<br>- Enable/disable camera<br>- Screen share toggle<br>- Leave session<br>- Device selection |
| **Dependencies** | FR-LIV-001 |

#### FR-LIV-004: AI Voice Agent
| ID | FR-LIV-004 |
|----|------------|
| **Priority** | High |
| **Description** | ElevenLabs voice integration for AI agent |
| **Acceptance Criteria** | - Real-time voice synthesis<br>- Configurable voice ID<br>- Latency < 500ms<br>- Voice activity detection |
| **Dependencies** | FR-LIV-001, ElevenLabs API |

---

### 2.5 Recording Playback (Phase 2)

#### FR-REC-001: Recording Storage
| ID | FR-REC-001 |
|----|------------|
| **Priority** | High |
| **Description** | Store session recordings |
| **Acceptance Criteria** | - WebM format<br>- Combined and separate tracks<br>- Metadata (duration, participants)<br>- Secure storage |
| **Dependencies** | FR-LIV-001, Storage service |

#### FR-REC-002: Recording Player
| ID | FR-REC-002 |
|----|------------|
| **Priority** | High |
| **Description** | HTML5 video player for recordings |
| **Acceptance Criteria** | - Play/pause/seek<br>- Playback speed (0.5x-2x)<br>- Volume control<br>- Fullscreen mode |
| **Dependencies** | FR-REC-001 |

#### FR-REC-003: Track Switching
| ID | FR-REC-003 |
|----|------------|
| **Priority** | Medium |
| **Description** | Switch between participant tracks |
| **Acceptance Criteria** | - Track selector UI<br>- Sync playback position<br>- Combined view option<br>- Audio-only track support |
| **Dependencies** | FR-REC-001, FR-REC-002 |

#### FR-REC-004: Timeline Markers
| ID | FR-REC-004 |
|----|------------|
| **Priority** | Medium |
| **Description** | Display transcript markers on timeline |
| **Acceptance Criteria** | - Click to seek<br>- Tooltip preview<br>- Color-coded by speaker<br>- Search markers |
| **Dependencies** | FR-REC-002, Session transcripts |

---

### 2.6 Calendar Scheduling (Phase 3)

#### FR-CAL-001: Calendar View
| ID | FR-CAL-001 |
|----|------------|
| **Priority** | Medium |
| **Description** | Calendar interface for session scheduling |
| **Acceptance Criteria** | - Month/week/day views<br>- Session event display<br>- Color-coded by type<br>- Responsive layout |
| **Dependencies** | FullCalendar library |

#### FR-CAL-002: Session Scheduling
| ID | FR-CAL-002 |
|----|------------|
| **Priority** | Medium |
| **Description** | Schedule new sessions from calendar |
| **Acceptance Criteria** | - Click/drag to create<br>- Participant selection<br>- Time zone support<br>- Confirmation email |
| **Dependencies** | FR-CAL-001, Sessions module |

#### FR-CAL-003: Availability Display
| ID | FR-CAL-003 |
|----|------------|
| **Priority** | Low |
| **Description** | Show busy/available times |
| **Acceptance Criteria** | - User availability grid<br>- Conflict detection<br>- Suggested times |
| **Dependencies** | FR-CAL-001 |

---

### 2.7 Global Search (Phase 3)

#### FR-SRC-001: Search Bar
| ID | FR-SRC-001 |
|----|------------|
| **Priority** | Medium |
| **Description** | Global search in header |
| **Acceptance Criteria** | - Keyboard shortcut (Cmd/Ctrl+K)<br>- Debounced input<br>- Real-time dropdown<br>- Recent searches |
| **Dependencies** | None |

#### FR-SRC-002: Full-Text Search
| ID | FR-SRC-002 |
|----|------------|
| **Priority** | Medium |
| **Description** | PostgreSQL full-text search backend |
| **Acceptance Criteria** | - Search clients, projects, sessions, documents<br>- Relevance ranking<br>- Result highlighting<br>- Type filtering |
| **Dependencies** | PostgreSQL tsvector |

#### FR-SRC-003: Search Results Page
| ID | FR-SRC-003 |
|----|------------|
| **Priority** | Low |
| **Description** | Dedicated search results page |
| **Acceptance Criteria** | - Grouped by type<br>- Pagination<br>- Filter sidebar<br>- Sort options |
| **Dependencies** | FR-SRC-002 |

---

### 2.8 AI Provider Configuration

#### FR-AI-001: Provider Selection
| ID | FR-AI-001 |
|----|------------|
| **Priority** | High |
| **Description** | Configure AI providers per use case |
| **Acceptance Criteria** | - Select provider per feature (transcription, document creation, real-time agent)<br>- Model selection within provider<br>- Priority/fallback ordering |
| **Dependencies** | Service providers table |

#### FR-AI-002: API Key Management
| ID | FR-AI-002 |
|----|------------|
| **Priority** | High |
| **Description** | Secure API key storage and validation |
| **Acceptance Criteria** | - Encrypted storage (AES-256)<br>- Key validation on save<br>- Masked display<br>- Key rotation support |
| **Dependencies** | Config module |

#### FR-AI-003: Model Configuration
| ID | FR-AI-003 |
|----|------------|
| **Priority** | High |
| **Description** | Configure model-specific parameters |
| **Acceptance Criteria** | - Model ID selection<br>- Temperature/max tokens<br>- Custom prompts<br>- Rate limit settings |
| **Dependencies** | FR-AI-001 |

#### FR-AI-004: Usage Monitoring
| ID | FR-AI-004 |
|----|------------|
| **Priority** | Medium |
| **Description** | Track and display AI usage |
| **Acceptance Criteria** | - Token usage per provider<br>- Cost calculation<br>- Usage alerts<br>- Historical charts |
| **Dependencies** | Provider usage logs |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| API response time (p95) | < 200ms | Application metrics |
| Video latency | < 150ms | LiveKit metrics |
| Voice synthesis latency | < 500ms | ElevenLabs metrics |
| Document upload speed | > 10 MB/s | Transfer tests |
| Search response time | < 100ms | Query timing |

### 3.2 Scalability

| Dimension | Current Target | Future Target |
|-----------|----------------|---------------|
| Concurrent users | 100 | 10,000 |
| Active sessions | 20 | 500 |
| Documents per project | 100 | 10,000 |
| Storage capacity | 100 GB | 10 TB |

### 3.3 Availability

| Metric | Target |
|--------|--------|
| Uptime | 99.9% |
| RTO (Recovery Time Objective) | 4 hours |
| RPO (Recovery Point Objective) | 1 hour |
| Planned maintenance window | Sunday 02:00-06:00 UTC |

### 3.4 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | JWT with refresh tokens |
| MFA | TOTP (Google Authenticator compatible) |
| Data encryption at rest | AES-256-GCM |
| Data encryption in transit | TLS 1.3 |
| API rate limiting | 100 req/min per user |
| Audit logging | All data access logged |

### 3.5 Compliance

| Standard | Status | Notes |
|----------|--------|-------|
| GDPR | Planned | Data retention policies |
| SOC 2 | Future | Audit controls in place |
| HIPAA | Optional | Configurable compliance mode |

---

## 4. Technical Constraints

### 4.1 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React | 18.x |
| Build Tool | Vite | 6.x |
| Styling | Tailwind CSS | 3.x |
| Backend | Express.js | 4.x |
| Database | PostgreSQL | 16.x |
| Cache/Queue | Redis + BullMQ | 7.x / 5.x |
| ORM | Drizzle | 0.35.x |
| WebRTC | LiveKit | 2.x |

### 4.2 Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 90+ |
| Safari | 15+ |
| Edge | 90+ |

### 4.3 External Service Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| LiveKit | WebRTC video/voice | None (required) |
| ElevenLabs | Voice synthesis | OpenAI TTS |
| Anthropic | LLM (primary) | OpenAI, Google AI |
| OpenAI | LLM (fallback) | Google AI |
| Google AI | LLM (fallback) | None |

---

## 5. User Stories

### 5.1 Document Management

```
As a project manager
I want to upload documents to a project
So that all project assets are centralized

Acceptance Criteria:
- Given I am on the project detail page
- When I drag a file to the upload zone
- Then the file is uploaded with progress indicator
- And it appears in the document list with metadata
```

```
As a team member
I want to view previous document versions
So that I can compare changes or restore old content

Acceptance Criteria:
- Given I am viewing a document
- When I click "Version History"
- Then I see a list of all versions with dates and uploaders
- And I can preview or download any version
```

### 5.2 LiveKit Sessions

```
As a client
I want to join a discovery session via video call
So that I can discuss my project requirements with the AI agent

Acceptance Criteria:
- Given I have a scheduled session
- When I click "Join Session"
- Then I am connected to the LiveKit room
- And I can see/hear the AI agent and other participants
```

```
As an administrator
I want to configure which AI model powers the voice agent
So that I can optimize for quality, cost, or latency

Acceptance Criteria:
- Given I am in the provider settings
- When I select ElevenLabs for real-time agent
- Then I can choose voice ID and model
- And the next session uses that configuration
```

### 5.3 Progress Tracking

```
As a project manager
I want to see project progress in a visual dashboard
So that I can quickly assess project health

Acceptance Criteria:
- Given I am on the project overview
- When the dashboard loads
- Then I see hours logged vs estimated in a chart
- And I see budget spent vs allocated
- And I see milestone completion percentage
```

---

## 6. Data Requirements

### 6.1 New Database Tables

#### session_recordings
```sql
CREATE TABLE session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id),
  filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  duration INTEGER, -- milliseconds
  mime_type VARCHAR(100) NOT NULL,
  track_type VARCHAR(20) NOT NULL, -- 'combined', 'video', 'audio'
  participant_id VARCHAR(100),
  storage_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### time_entries
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  user_id UUID NOT NULL REFERENCES users(id),
  milestone_id UUID REFERENCES project_milestones(id),
  entry_date DATE NOT NULL,
  hours DECIMAL(5,2) NOT NULL,
  description TEXT,
  billable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### search_index
```sql
CREATE TABLE search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID NOT NULL,
  content TSVECTOR NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX search_index_content_idx ON search_index USING GIN(content);
```

---

## 7. Integration Requirements

### 7.1 LiveKit Integration

| Aspect | Requirement |
|--------|-------------|
| SDK | @livekit/components-react v2.x |
| Token Generation | Server-side with livekit-server-sdk |
| Room Events | Webhook for participant events |
| Recording | Egress API for cloud recording |

### 7.2 ElevenLabs Integration

| Aspect | Requirement |
|--------|-------------|
| API | WebSocket streaming API |
| Latency Target | < 500ms first byte |
| Voice Selection | Configurable per session |
| Fallback | OpenAI TTS on error |

### 7.3 AI Provider Chain

```
Primary: Anthropic Claude (claude-sonnet-4)
    ↓ (on error)
Fallback 1: OpenAI GPT-4o
    ↓ (on error)
Fallback 2: Google Gemini 1.5 Pro
```

---

## 8. Acceptance Criteria Summary

| Feature | Phase | Critical Path | Dependencies |
|---------|-------|---------------|--------------|
| Document Upload | 1 | Yes | Storage service |
| Document Versioning | 1 | Yes | Document upload |
| Milestone Timeline | 1 | Yes | Projects module |
| Progress Charts | 1 | No | Recharts library |
| LiveKit Room | 2 | Yes | LiveKit server |
| Video Grid | 2 | Yes | LiveKit room |
| Recording Playback | 2 | No | Recordings stored |
| Calendar View | 3 | No | FullCalendar library |
| Global Search | 3 | No | PostgreSQL FTS |
| AI Provider Config | 1 | Yes | Providers module |

---

## 9. Glossary

| Term | Definition |
|------|------------|
| Discovery Session | Real-time voice/video meeting between client and AI agent |
| LiveKit | Open-source WebRTC infrastructure for video/voice |
| ElevenLabs | Voice AI platform for text-to-speech synthesis |
| Milestone | Project checkpoint with due date and completion status |
| Provider | Third-party service (LLM, voice, storage) |
| TOTP | Time-based One-Time Password for MFA |
| Egress | LiveKit feature for recording/streaming out of rooms |

---

## 10. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-30 | Fractionate LLC | Initial specification |

---

*Document maintained by Fractionate LLC. Last updated: December 2025*
