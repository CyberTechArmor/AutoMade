# AutoMade Feature Implementation Plan

This document outlines the implementation plan for remaining frontend features. Each feature is broken down into backend requirements, frontend components, and integration steps.

---

## Storage Architecture

All storage features will use a **local-first approach with S3 compatibility layer** for future scalability.

### Storage Service Design

```
src/lib/storage/
├── storage.interface.ts   # Abstract storage interface
├── local.storage.ts       # Local filesystem implementation
├── s3.storage.ts          # S3-compatible implementation (MinIO, AWS, etc.)
└── index.ts               # Factory pattern for storage selection
```

**Interface:**
```typescript
interface StorageProvider {
  upload(key: string, data: Buffer | Stream, metadata?: Record<string, string>): Promise<StorageResult>;
  download(key: string): Promise<Buffer | Stream>;
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<StorageItem[]>;
  exists(key: string): Promise<boolean>;
}
```

**Configuration:**
```typescript
// Environment variables
STORAGE_PROVIDER=local|s3
STORAGE_LOCAL_PATH=/data/uploads
STORAGE_S3_ENDPOINT=http://localhost:9000
STORAGE_S3_BUCKET=automade
STORAGE_S3_ACCESS_KEY=...
STORAGE_S3_SECRET_KEY=...
STORAGE_S3_REGION=us-east-1
```

---

## 1. LiveKit Voice/Video Integration UI

### Overview
Real-time voice/video sessions using LiveKit WebRTC infrastructure.

### Backend Requirements

**Already Exists:**
- LiveKit integration in `src/modules/sessions/`
- Room token generation
- Session state management

**Additions Needed:**
- `POST /api/sessions/:id/livekit-token` - Generate participant token
- Webhook endpoint for LiveKit events (participant joined/left, recording started, etc.)

### Frontend Components

```
frontend/src/components/session/
├── LiveKitRoom.tsx           # Main room wrapper using @livekit/components-react
├── VideoGrid.tsx             # Participant video tiles
├── AudioVisualizer.tsx       # Voice activity indicator
├── SessionControls.tsx       # Mute/unmute, camera, share screen, leave
├── ParticipantList.tsx       # List of participants with status
├── ChatPanel.tsx             # In-session text chat
└── RecordingIndicator.tsx    # Shows when recording is active
```

### Dependencies
```json
{
  "@livekit/components-react": "^2.x",
  "livekit-client": "^2.x"
}
```

### Implementation Steps

1. **Install LiveKit React SDK**
   ```bash
   npm install @livekit/components-react livekit-client
   ```

2. **Create LiveKit Room Component**
   - Use `LiveKitRoom` provider from SDK
   - Handle connection states (connecting, connected, disconnected)
   - Manage local/remote participant tracks

3. **Build Session UI**
   - Integrate room into `SessionDetailPage`
   - Add controls for audio/video toggle
   - Display participant grid

4. **Recording Integration**
   - Display recording status
   - Recordings saved as WebM files (separate audio/video tracks)
   - Store in local storage with S3-compatible path structure

### File Structure for Recordings
```
/data/recordings/
└── sessions/
    └── {session-id}/
        ├── recording-{timestamp}.webm      # Combined recording
        ├── track-video-{participant}.webm  # Individual video tracks
        └── track-audio-{participant}.webm  # Individual audio tracks
```

---

## 2. Session Recording Playback

### Overview
Playback of recorded session WebM files with seek, speed control, and track selection.

### Backend Requirements

**New Endpoints:**
- `GET /api/sessions/:id/recordings` - List available recordings
- `GET /api/recordings/:id` - Get recording metadata
- `GET /api/recordings/:id/stream` - Stream recording file (supports range requests)

**Database Schema:**
```typescript
// New table: session_recordings
{
  id: uuid,
  sessionId: uuid,
  filename: string,
  fileSize: number,
  duration: number,       // in milliseconds
  mimeType: string,       // 'video/webm'
  trackType: 'combined' | 'video' | 'audio',
  participantId?: string,
  storagePath: string,
  createdAt: timestamp
}
```

### Frontend Components

```
frontend/src/components/recordings/
├── RecordingPlayer.tsx       # Main video player with custom controls
├── PlaybackControls.tsx      # Play/pause, seek, speed, volume
├── TrackSelector.tsx         # Switch between participant tracks
├── TimelineMarkers.tsx       # Show transcript timestamps on timeline
└── RecordingsList.tsx        # List of recordings for a session
```

### Implementation Steps

1. **Create Recording Player Component**
   - Native HTML5 video element with custom controls
   - Support for playback speed (0.5x, 1x, 1.5x, 2x)
   - Keyboard shortcuts (space, arrow keys)

2. **Add Track Switching**
   - Allow switching between combined/individual tracks
   - Sync playback position when switching

3. **Timeline Integration**
   - Display transcript markers on timeline
   - Click marker to seek to that point

---

## 3. Document Versioning/Management

### Overview
Document storage, versioning, and management for project assets.

### Backend Requirements

**New Module:** `src/modules/documents/`

**Database Schema:**
```typescript
// Table: documents
{
  id: uuid,
  projectId: uuid,
  name: string,
  description?: string,
  mimeType: string,
  currentVersionId: uuid,
  tags: string[],
  createdById: uuid,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt?: timestamp
}

// Table: document_versions
{
  id: uuid,
  documentId: uuid,
  version: number,         // Auto-incrementing
  filename: string,
  fileSize: number,
  storagePath: string,
  checksum: string,        // SHA-256 hash
  uploadedById: uuid,
  comment?: string,
  createdAt: timestamp
}
```

**Endpoints:**
- `GET /api/projects/:projectId/documents` - List documents
- `POST /api/projects/:projectId/documents` - Upload new document
- `GET /api/documents/:id` - Get document with current version
- `GET /api/documents/:id/versions` - List all versions
- `POST /api/documents/:id/versions` - Upload new version
- `GET /api/documents/:id/versions/:version/download` - Download specific version
- `PATCH /api/documents/:id` - Update metadata
- `DELETE /api/documents/:id` - Soft delete

### Frontend Components

```
frontend/src/components/documents/
├── DocumentList.tsx          # Grid/list view of documents
├── DocumentUpload.tsx        # Drag-drop upload with progress
├── DocumentPreview.tsx       # Preview for images, PDFs, text
├── VersionHistory.tsx        # Version timeline with restore
├── DocumentActions.tsx       # Download, share, delete
└── DocumentFilters.tsx       # Filter by type, date, tag
```

**New Page:**
```
frontend/src/pages/
└── DocumentsPage.tsx         # Project documents view
```

### Implementation Steps

1. **Backend Module**
   - Create Drizzle schema for documents/versions
   - Implement storage service integration
   - Add upload with streaming for large files

2. **Frontend Upload**
   - Drag-drop zone with progress indicator
   - Support multi-file upload
   - Preview before upload

3. **Version Management**
   - Timeline view of versions
   - Diff view for text documents (optional)
   - Restore previous version

### File Structure
```
/data/documents/
└── projects/
    └── {project-id}/
        └── {document-id}/
            ├── v1/
            │   └── {original-filename}
            ├── v2/
            │   └── {original-filename}
            └── thumbnails/
                └── preview.png
```

---

## 4. Progress/Cost Tracking Visualization

### Overview
Dashboard widgets showing project progress, hours, and costs.

### Backend Requirements

**New Endpoints:**
- `GET /api/projects/:id/metrics` - Get project metrics
- `GET /api/projects/:id/time-entries` - List time entries
- `POST /api/projects/:id/time-entries` - Log time

**Database Schema:**
```typescript
// Table: time_entries
{
  id: uuid,
  projectId: uuid,
  userId: uuid,
  date: date,
  hours: decimal,
  description?: string,
  billable: boolean,
  milestoneId?: uuid,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Frontend Components

```
frontend/src/components/metrics/
├── ProgressRing.tsx          # Circular progress indicator
├── BurndownChart.tsx         # Hours remaining over time
├── CostBreakdown.tsx         # Budget vs actual
├── HoursChart.tsx            # Bar chart of hours by week/month
├── TimeEntryForm.tsx         # Log time modal
└── MetricCard.tsx            # Reusable stat card
```

### Implementation Steps

1. **Install Chart Library**
   ```bash
   npm install recharts
   ```

2. **Create Metrics Dashboard**
   - Add to `ProjectDetailPage` overview tab
   - Show hours logged vs estimated
   - Cost tracking with percentage

3. **Time Entry Feature**
   - Quick log modal
   - Weekly timesheet view
   - Integration with milestones

---

## 5. Milestone Management UI

### Overview
Full CRUD for project milestones with progress tracking.

### Backend Requirements

**Endpoints Already Exist in Projects Module:**
- Milestones included in project details

**Add:**
- `POST /api/projects/:id/milestones` - Create milestone
- `PATCH /api/milestones/:id` - Update milestone
- `DELETE /api/milestones/:id` - Delete milestone
- `POST /api/milestones/:id/complete` - Mark complete

### Frontend Components

```
frontend/src/components/milestones/
├── MilestoneTimeline.tsx     # Visual timeline view
├── MilestoneCard.tsx         # Individual milestone with actions
├── MilestoneForm.tsx         # Create/edit modal
├── MilestoneProgress.tsx     # Completion indicator
└── DraggableMilestones.tsx   # Reorder via drag-drop
```

### Implementation Steps

1. **Install DnD Library**
   ```bash
   npm install @dnd-kit/core @dnd-kit/sortable
   ```

2. **Create Milestone UI**
   - Add to `ProjectDetailPage` milestones tab
   - Drag to reorder
   - Click to edit inline
   - Visual timeline view

3. **Progress Integration**
   - Link milestones to time entries
   - Show completion percentage

---

## 6. Session Scheduling with Calendar

### Overview
Calendar view for scheduling and viewing sessions.

### Frontend Components

```
frontend/src/components/calendar/
├── CalendarView.tsx          # Month/week/day views
├── SessionEvent.tsx          # Event card on calendar
├── ScheduleModal.tsx         # Schedule new session
├── DatePicker.tsx            # Date/time selection
└── AvailabilityGrid.tsx      # Show busy times
```

**New Page:**
```
frontend/src/pages/
└── CalendarPage.tsx          # Full calendar view
```

### Implementation Steps

1. **Install Calendar Library**
   ```bash
   npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
   ```

2. **Create Calendar Page**
   - Month, week, day views
   - Drag to create events
   - Click session to view details

3. **Integration**
   - Sync with sessions API
   - Show different colors by session type
   - Filter by project/client

---

## 7. Search Functionality

### Overview
Global search across clients, projects, sessions, and documents.

### Backend Requirements

**New Endpoint:**
- `GET /api/search?q={query}&types={types}` - Global search

**Implementation Options:**

1. **PostgreSQL Full-Text Search** (Recommended for MVP)
   - Use `tsvector` columns
   - Create GIN indexes
   - Simple to implement

2. **Elasticsearch/Typesense** (Future)
   - Better for large scale
   - More complex setup

### Frontend Components

```
frontend/src/components/search/
├── GlobalSearch.tsx          # Search bar with dropdown
├── SearchResults.tsx         # Grouped results by type
├── SearchFilters.tsx         # Filter by type, date range
├── SearchResultCard.tsx      # Individual result with highlight
└── RecentSearches.tsx        # Search history
```

### Implementation Steps

1. **Add Search to Layout**
   - Search bar in header (already partially implemented)
   - Keyboard shortcut (Cmd/Ctrl + K)

2. **Create Search Backend**
   - PostgreSQL tsvector for each searchable table
   - Combine results from multiple tables
   - Rank by relevance

3. **Build Search UI**
   - Debounced search input
   - Real-time results dropdown
   - Full results page

---

## Implementation Priority

### Phase 1: Core Features
1. **Document Management** - Essential for project assets
2. **Milestone Management** - Complete project tracking
3. **Progress/Cost Tracking** - Business value visibility

### Phase 2: Real-Time Features
4. **LiveKit Integration** - Enable live sessions
5. **Recording Playback** - Access session history

### Phase 3: UX Enhancements
6. **Calendar View** - Better scheduling
7. **Search** - Improved navigation

---

## Technical Considerations

### State Management
- Continue using React Context for auth
- Add Zustand for complex features (calendar, document uploads)

### Optimistic Updates
- Use React Query for data fetching
- Implement optimistic updates for better UX

### Offline Support (Future)
- Service worker for caching
- IndexedDB for offline document access

### Performance
- Virtual scrolling for large lists
- Image lazy loading
- Code splitting per route

---

## File Storage Paths

```
/data/
├── recordings/
│   └── sessions/
│       └── {session-id}/
│           └── *.webm
├── documents/
│   └── projects/
│       └── {project-id}/
│           └── {document-id}/
│               └── v{n}/
│                   └── {filename}
└── uploads/
    └── temp/
        └── {upload-id}/
            └── {filename}
```

---

## Environment Variables

```bash
# Storage
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=/data
STORAGE_S3_ENDPOINT=
STORAGE_S3_BUCKET=
STORAGE_S3_ACCESS_KEY=
STORAGE_S3_SECRET_KEY=
STORAGE_S3_REGION=

# LiveKit
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
LIVEKIT_WS_URL=wss://your-livekit-server

# Search (if using external)
SEARCH_PROVIDER=postgres
ELASTICSEARCH_URL=
```

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@livekit/components-react": "^2.x",
    "livekit-client": "^2.x",
    "recharts": "^2.x",
    "@fullcalendar/react": "^6.x",
    "@fullcalendar/daygrid": "^6.x",
    "@fullcalendar/timegrid": "^6.x",
    "@fullcalendar/interaction": "^6.x",
    "@dnd-kit/core": "^6.x",
    "@dnd-kit/sortable": "^8.x",
    "zustand": "^4.x",
    "@tanstack/react-query": "^5.x"
  }
}
```
