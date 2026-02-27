# Epic 9: Advanced Book Search and Data Normalization - Quick Reference

**Status:** ✅ Ready for Implementation  
**Priority:** High  
**Estimated Effort:** 3-4 weeks (1 developer)

---

## 📋 Quick Overview

### What We're Building

1. **Database Normalization** - Separate tables for authors and categories
2. **Advanced Search** - Multi-filter search with AND logic
3. **Admin Tools** - Manage authors/categories in books-admin-app
4. **Mobile UI** - Advanced search screen in GrqaserApp
5. **Home Page** - Redesign (requirements pending)

### Key Features

✅ **Multi-select** author filter  
✅ **Multi-select** category filter  
✅ **Single-select** duration filter (5 ranges)  
✅ **Text search** across title, description, author  
✅ **AND logic** - all filters work together  
✅ **No filter = show all** - empty selections ignored

---

## 🗂️ Stories Breakdown

### Story 9.1: Database Schema Normalization (6 tasks)
**Goal:** Create normalized tables for authors and categories

**New Tables:**
- `authors` (id, name, created_at, updated_at)
- `book_categories` (id, name, created_at, updated_at)

**Books Table Updates:**
- Add `author_id` foreign key
- Add `category_id` foreign key
- Keep original columns temporarily

**Migration:**
- Extract unique authors → populate authors table
- Extract unique categories → populate book_categories table
- Update foreign keys in books table

---

### Story 9.2: Advanced Search Backend (6 tasks)
**Goal:** Build API endpoints and search logic

**New Endpoints:**
```
GET /api/v1/authors
GET /api/v1/categories
GET /api/v1/books/search?author_ids=1,2&category_ids=3&duration_range=60-120&text=search
```

**Duration Ranges:**
- `<30` = Less than 30 minutes (duration < 30)
- `30-60` = Less than 1 hour (30 ≤ duration < 60)
- `60-120` = 1-2 hours (60 ≤ duration < 120)
- `120-300` = 2-5 hours (120 ≤ duration < 300)
- `300+` = 5+ hours (duration ≥ 300)

**Filter Logic:**
- Multi-select: author_ids, category_ids (use SQL IN clause)
- Single-select: duration_range
- Text search: LIKE pattern in title, description, author name
- All filters use AND logic

---

### Story 9.3: Advanced Search UI - GrqaserApp (9 tasks)
**Goal:** Create mobile app search interface

**Screen:** `AdvancedSearchScreen.tsx`

**Components:**
- Author multi-select dropdown (checkboxes)
- Category multi-select dropdown (checkboxes)
- Duration single-select (radio buttons)
- Text search input
- Results grid

**Data Layer Updates:**
- `catalogRepository.ts` - Local SQLite queries
- `booksApi.ts` - API integration
- `booksSlice.ts` - Redux state management

**Navigation:**
- Add link from HomeScreen
- Add link from SearchScreen

---

### Story 9.4: Home Page Redesign (6 tasks)
**Status:** ⚠️ Requirements Pending

**Current:** Shows 6 books in "Featured Books" section

**Questions:**
1. How many books to display?
2. What sections? (Featured, By Category, By Author, New, Popular?)
3. Pagination or "Load More"?
4. Layout preference? (grid, carousel, list?)

**Proposed Sections:**
- Featured Books (configurable count)
- Recently Played (4-6 books, horizontal scroll)
- Browse by Category
- Browse by Author
- New Arrivals

---

### Story 9.5: Books Admin App Integration (7 tasks)
**Goal:** Admin tools for managing normalized data

**Authors Management:**
- List view with search/pagination
- Add/Edit/Delete authors
- Show book count per author

**Categories Management:**
- List view with search/pagination
- Add/Edit/Delete categories
- Show book count per category

**Book Edit Form:**
- Replace author text input → searchable dropdown
- Replace category text input → searchable dropdown

**Book List Filters:**
- Author multi-select
- Category multi-select
- Duration range
- Text search

**Crawler Updates:**
- Auto-populate authors table
- Auto-populate categories table
- Lookup or create on new books

---

### Story 9.6: Testing and Documentation (8 tasks)
**Goal:** Ensure quality and maintainability

**Tests:**
- Migration tests (data integrity, constraints)
- API endpoint tests (all filter combinations)
- UI component tests (filters, search)
- Integration tests (end-to-end flow)

**Documentation:**
- API documentation (endpoints, examples)
- Architecture documentation (schema, diagrams)
- User guide (how to use advanced search)
- Epic 9 PRD (comprehensive spec)

---

## 🎯 Implementation Order

### Phase 1: Foundation
1. ✅ Create database schema
2. ✅ Write migration script
3. ✅ Test migration
4. ✅ Update documentation

### Phase 2: Backend
1. ✅ Implement authors/categories endpoints
2. ✅ Update search API
3. ✅ Add indexes
4. ✅ Test APIs

### Phase 3: Admin Tools
1. ✅ Authors/categories management UI
2. ✅ Update book edit form
3. ✅ Add filters to book list
4. ✅ Update crawler

### Phase 4: Mobile UI
1. ✅ Create AdvancedSearchScreen
2. ✅ Implement filters
3. ✅ Update data layer
4. ✅ Add navigation

### Phase 5: Home Page
1. ⚠️ Gather requirements
2. ⚠️ Design layout
3. ⚠️ Implement

### Phase 6: Testing & Docs
1. ✅ Write tests (ongoing)
2. ✅ Update docs
3. ✅ Create guides

---

## 📊 Task Summary

| Story | Tasks | Status |
|-------|-------|--------|
| 9.1 Database Schema | 6 | Not Started |
| 9.2 Backend API | 6 | Not Started |
| 9.3 Mobile UI | 9 | Not Started |
| 9.4 Home Page | 6 | Pending Requirements |
| 9.5 Admin App | 7 | Not Started |
| 9.6 Testing & Docs | 8 | Not Started |
| **Total** | **48** | **Ready** |

---

## 🔧 Technical Details

### Database Schema
```sql
CREATE TABLE authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(200) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE book_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE books ADD COLUMN author_id INTEGER REFERENCES authors(id);
ALTER TABLE books ADD COLUMN category_id INTEGER REFERENCES book_categories(id);
```

### API Request Example
```http
GET /api/v1/books/search?author_ids=1,2,3&category_ids=5,7&duration_range=60-120&text=mystery&page=1&limit=20
```

### API Response Example
```json
{
  "books": [
    {
      "id": 1,
      "title": "Book Title",
      "author_id": 1,
      "author_name": "Author Name",
      "category_id": 5,
      "category_name": "Mystery",
      "duration": 90,
      ...
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

## ⚠️ Important Notes

### Multi-Select Filters
- **Authors:** Can select multiple authors (OR within authors, AND with other filters)
- **Categories:** Can select multiple categories (OR within categories, AND with other filters)
- **Duration:** Single-select only (one range at a time)

### Filter Logic
```
Results = Books WHERE
  (author_id IN [selected_authors] OR no_authors_selected) AND
  (category_id IN [selected_categories] OR no_categories_selected) AND
  (duration IN range OR no_duration_selected) AND
  (text LIKE '%search%' OR no_text_entered)
```

### Migration Safety
- ✅ Backup database before migration
- ✅ Keep original columns during transition
- ✅ Test migration on copy first
- ✅ Verify data integrity after migration
- ✅ Have rollback plan ready

---

## 📁 Files to Create/Modify

### New Files
- `docs/prd/epic-9.md` ✅ Created
- `GrqaserApp/src/screens/AdvancedSearchScreen.tsx`
- `books-admin-app/scripts/migrate-authors-categories.js`
- `books-admin-app/public/authors.html`
- `books-admin-app/public/categories.html`

### Modified Files
- `books-admin-app/src/models/database.js`
- `books-admin-app/src/routes/books.js`
- `books-admin-app/src/crawler/schema/books-table.js`
- `GrqaserApp/src/database/catalogRepository.ts`
- `GrqaserApp/src/services/booksApi.ts`
- `GrqaserApp/src/state/slices/booksSlice.ts`
- `GrqaserApp/src/navigation/types.ts`
- `docs/architecture/data-models-and-schema.md`

---

## 🚀 Next Steps

1. **Review this epic** with stakeholders
2. **Clarify home page requirements** (Story 9.4)
3. **Start with Story 9.1** (Database Schema)
4. **Create feature branch:** `feature/epic-9-advanced-search`
5. **Set up development database** for testing migration

---

**Full Documentation:** See `docs/prd/epic-9.md` for complete specifications, acceptance criteria, and technical details.
