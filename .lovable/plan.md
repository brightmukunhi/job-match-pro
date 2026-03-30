

# Job Profile Manager & CV Auto-Ranker

## Overview

Build a web-based recruitment tool that replaces the hardcoded Python desktop app with a dynamic, database-driven system. Users can create/edit/delete job position profiles (departments, keywords, scoring criteria), upload CVs, and rank candidates — all through a web UI backed by Supabase.

## Architecture

```text
┌─────────────────────────────────────────────────┐
│                   Frontend (React)               │
│                                                  │
│  ┌──────────────┐  ┌───────────┐  ┌───────────┐ │
│  │ Job Profile   │  │ CV Upload │  │ Rankings  │ │
│  │ Manager CRUD  │  │ & Parse   │  │ Dashboard │ │
│  └──────┬───────┘  └─────┬─────┘  └─────┬─────┘ │
│         │                │               │       │
│         ▼                ▼               ▼       │
│     ┌──────────────────────────────────────┐     │
│     │  Scoring Engine (TypeScript port)     │     │
│     │  7-point rubric, keyword matching     │     │
│     └──────────────────────────────────────┘     │
└───────────────────────┬─────────────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   Supabase DB    │
              │                  │
              │  departments     │
              │  position_profiles│
              │  candidates      │
              │  ranking_results │
              └──────────────────┘
```

## Database Schema

**departments** — id, name, created_at

**position_profiles** — id, department_id (FK), name, key (unique slug), relevant_fields (text[]), must_have_keywords (text[]), skill_keywords (text[]), certification_keywords (text[]), created_at, updated_at

**candidates** — id, file_name, name, surname, age, gender, email, phone, qualifications (text[]), certifications (text[]), skills_extracted (text[]), experience_months (int), raw_text (text), created_at

**ranking_results** — id, candidate_id (FK), position_profile_id (FK), qualification_points, skills_points, certification_points, attachment_points, total_score, skills_matched (text), certs_matched (text), must_haves_missing (text), notes (text), created_at

RLS policies: all tables open to authenticated users initially (can be locked down later).

## Implementation Steps

### Step 1: Set up Supabase & create tables
- Enable Supabase (Lovable Cloud)
- Create migrations for all 4 tables with proper foreign keys and RLS
- Seed departments and position profiles from the Python script's `PROFILES` dict (13 positions across 4 departments)

### Step 2: Build the Job Profile Manager UI
- **Page: `/profiles`** — CRUD interface for managing position profiles
- Department selector/creator (add new departments)
- Form to create/edit a position profile: name, relevant fields, must-have keywords, skill keywords, certification keywords (all as tag inputs)
- Table listing all profiles grouped by department
- Delete with confirmation

### Step 3: Port the scoring engine to TypeScript
- `src/lib/scoring.ts` — Direct port of `score_against_profile()`, `count_matches()`, `detect_qualification_level()`, `qualification_points()`, `extract_experience_months()`, fuzzy matching, section splitting
- Same 7-point rubric: Qualification (0-3) + Skills (0-2) + Certification (0-1) + Attachment (0-1)
- Auto-detect best-fit position logic

### Step 4: Build CV Upload & Processing
- **Page: `/upload`** — File upload zone (PDF/DOCX, multiple files)
- Client-side text extraction using `pdfjs-dist` (PDF) and `mammoth` (DOCX)
- Client-side candidate info extraction via regex (name, email, phone, age, gender, experience) — same patterns from the Python script
- Store parsed candidates in Supabase

### Step 5: Build Rankings Dashboard
- **Page: `/rankings`** — View and filter ranking results
- Mode selector: Auto-detect best fit / Filter by department / Rank against specific position
- Results table with sorting, score breakdown columns
- Export to CSV/Excel functionality
- Per-position tabs (mirroring the Python Excel output)

### Step 6: Navigation & Layout
- Sidebar or top nav with: Profiles, Upload CVs, Rankings
- Landing page with system overview

## Technical Details

- **PDF parsing**: `pdfjs-dist` library for client-side PDF text extraction
- **DOCX parsing**: `mammoth` library for client-side Word document parsing
- **Scoring**: All scoring logic runs client-side in TypeScript — no AI/LLM dependency for MVP (the Python script's Ollama integration is optional; regex-based extraction covers the core flow)
- **Tag input**: Reusable component for entering keyword arrays (skill_keywords, etc.)
- **Export**: Use `xlsx` library for Excel export matching the Python output format

## What This Solves

1. **No more hardcoded positions** — departments and profiles are fully dynamic via the database
2. **Dynamic ingestion** — add/edit/remove job requirements through the UI at any time
3. **Frontend-backend alignment** — single source of truth in Supabase, consumed by the React frontend
4. **Same scoring logic** — faithful port of the 7-point rubric from the Python script

