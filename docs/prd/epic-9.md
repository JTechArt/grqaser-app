# Epic 9: Advanced Book Search and Data Normalization

**Goal:** Normalize the database schema by extracting authors and categories into separate tables, and implement a comprehensive advanced search feature with multi-select filters for authors/categories, duration ranges, and text search. All filters work together using AND logic.

---

## Overview

This epic addresses three main requirements:
1. **Database Normalization** - Separate authors and book_categories tables
2. **Advanced Search** - Multi-filter search with author, category, duration, and text filters
3. **Home Page Redesign** - (Requirements pending clarification)

**Affected Applications:**
- `books-admin-app` - Admin panel for managing books, authors, and categories
- `GrqaserApp` - Mobile app with advanced search UI

---

## Story 9.1: Database Schema Normalization

**As a** developer,  
**I want** to normalize the database schema by creating separate tables for authors and categories,  
**so that** we eliminate data duplication, ensure data integrity, and enable efficient filtering.

### Acceptance Criteria

1. ✅ `authors` table created with unique author names
2. ✅ `book_categories` table created with unique category names
3. ✅ Books table updated with foreign key references to authors and categories
4. ✅ Migration script successfully migrates all existing data
5. ✅ No data loss during migration
6. ✅ Schema documentation updated

### Database Schema

```sql
-- Authors table
CREATE TABLE authors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(200) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Book categories table
CREATE TABLE book_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Books table updates
ALTER TABLE books ADD COLUMN author_id INTEGER REFERENCES authors(id);
ALTER TABLE books ADD COLUMN category_id INTEGER REFERENCES book_categories(id);

-- Indexes for performance
CREATE INDEX idx_books_author_id ON books(author_id);
CREATE INDEX idx_books_category_id ON books(category_id);
CREATE INDEX idx_books_duration ON books(duration);
CREATE INDEX idx_authors_name ON authors(name);
CREATE INDEX idx_categories_name ON book_categories(name);
```

### Migration Strategy

1. Keep original `author` and `category` columns temporarily
2. Extract unique authors → populate `authors` table
3. Extract unique categories → populate `book_categories` table
4. Update `author_id` and `category_id` in books table via JOIN
5. Verify data integrity
6. (Optional future) Drop original columns after verification period

### Tasks (6)
- Create authors table schema
- Create book_categories table schema
- Add foreign keys to books table
- Create migration script
- Update schema documentation
- Update books-table.js schema

---

## Story 9.2: Advanced Search Backend

**As a** developer,  
**I want** to implement backend APIs for advanced search with multiple filter types,  
**so that** users can search books by author, category, duration, and text.

### Acceptance Criteria

1. ✅ GET /api/v1/authors endpoint returns all unique authors
2. ✅ GET /api/v1/categories endpoint returns all unique categories
3. ✅ Search API supports multi-select author filter (author_ids array)
4. ✅ Search API supports multi-select category filter (category_ids array)
5. ✅ Search API supports single-select duration filter
6. ✅ Search API supports text search (title, description, author name)
7. ✅ All filters use AND logic when combined
8. ✅ Empty/null filters are ignored (show all)

### API Endpoints

**GET /api/v1/authors**
```
Response: [
  { id: 1, name: "Author Name", book_count: 5 },
  ...
]
```

**GET /api/v1/categories**
```
Response: [
  { id: 1, name: "Category Name", book_count: 12 },
  ...
]
```

**GET /api/v1/books/search**
```
Query Parameters:
- author_ids: string (comma-separated IDs) or array
- category_ids: string (comma-separated IDs) or array
- duration_range: enum ("<30", "30-60", "60-120", "120-300", "300+")
- text: string (search in title, description, author name)
- page: number (default: 1)
- limit: number (default: 20)

Response: {
  books: [...],
  total: number,
  page: number,
  limit: number
}
```

### Duration Filter Mapping

| UI Label | Range (minutes) | SQL Condition |
|----------|----------------|---------------|
| Less than 30 minutes | 0-29 | `duration < 30` |
| Less than 1 hour | 30-59 | `duration >= 30 AND duration < 60` |
| 1-2 hours | 60-119 | `duration >= 60 AND duration < 120` |
| 2-5 hours | 120-299 | `duration >= 120 AND duration < 300` |
| 5+ hours | 300+ | `duration >= 300` |

### Tasks (6)
- Create GET /api/v1/authors endpoint
- Create GET /api/v1/categories endpoint
- Update search API with filters
- Implement duration filter logic
- Update database.js search methods
- Add search indexes

---

## Story 9.3: Advanced Search UI (GrqaserApp)

**As a** user,  
**I want** an advanced search screen with multiple filter options,  
**so that** I can find books by author, category, duration, or text search.

### Acceptance Criteria

1. ✅ Advanced search screen accessible from Home and Search screens
2. ✅ Author multi-select filter displays all authors
3. ✅ Category multi-select filter displays all categories
4. ✅ Duration single-select filter with 5 range options
5. ✅ Text search input for title/description/author
6. ✅ All filters work together (AND logic)
7. ✅ Empty filters show all books (no filter applied)
8. ✅ Search results display in grid layout
9. ✅ Filter state persists during session

### UI Components

**Filter Controls:**
- Author Filter: Multi-select dropdown/modal with checkboxes
- Category Filter: Multi-select dropdown/modal with checkboxes
- Duration Filter: Single-select radio buttons or picker
- Text Search: Text input with search icon

### UX Guidelines (Story 9.3)

**Design System Alignment:** Use design tokens from `docs/design/README.md` (slate + teal, Plus Jakarta Sans). Filter chips/buttons: 8px radius; cards: 12px radius on mobile.

**Mobile-First Filter UX:**
- **Progressive disclosure:** On small screens, use bottom sheet or modal for multi-select filters; avoid crowding the search bar.
- **Touch targets:** Filter controls minimum 44×44pt for thumb reach.
- **Visual feedback:** Selected filters show checkmarks and teal accent; active state distinct from default.
- **Filter badges:** Show selection count (e.g., "Authors (3 selected)") per filter; badge on "Apply" if any filter active.
- **Clear all:** Always provide a visible "Clear filters" control when 2+ filters are active.
- **Persistent summary:** When filters applied, show a one-line summary above results (e.g., "3 authors · Fiction · 30–60 min").

**States:**
- **Loading:** Skeleton cards or inline spinner for results; filter lists load without blocking.
- **Empty results:** "No books match your filters. Try adjusting or clear filters." with clear CTA.
- **Error:** "Search unavailable. Check connection and try again." with retry button.
- **Initial:** Placeholder in text input: "Search by title, author, or description."

**Accessibility:** Filter controls must have labels for screen readers; multi-select supports "Select all" and "None" for long lists.

**Layout:**
```
┌─────────────────────────────┐
│  Advanced Search            │
├─────────────────────────────┤
│  [Text Search Input]        │
│                             │
│  Authors: [Multi-Select ▼]  │
│  Categories: [Multi-Select ▼]│
│  Duration: [Single-Select ▼] │
│                             │
│  [Apply Filters Button]     │
├─────────────────────────────┤
│  Results (X books found)    │
│  ┌────┐ ┌────┐             │
│  │Book│ │Book│  ...        │
│  └────┘ └────┘             │
└─────────────────────────────┘
```

### Tasks (9)
- Create AdvancedSearchScreen component
- Add author dropdown filter (multi-select)
- Add category dropdown filter (multi-select)
- Add duration single-select filter
- Add text search input
- Update catalogRepository for filters
- Update booksApi for advanced search
- Update Redux slice for filters
- Add navigation to advanced search

---

## Story 9.4: Home Page Redesign

**As a** user,
**I want** an improved home page experience,
**so that** I can discover books more easily.

### Status: ⚠️ Requirements Pending

**Current State:** Home page displays 6 books in "Featured Books" section.

**Questions for Clarification:**
1. How many books should be displayed on the home page?
2. What sections should be included? (Featured, By Category, By Author, New Arrivals, Popular?)
3. Should there be pagination or "Load More" functionality?
4. Any specific layout preferences? (grid, carousel, list, horizontal scroll?)

### Proposed Sections (Pending Approval)
- Featured Books (configurable count)
- Recently Played (4-6 books, horizontal scroll)
- Browse by Category (category chips/cards)
- Browse by Author (author chips/cards)
- New Arrivals (latest additions)

### UX Design Direction (when requirements are finalized)

**Section layout:** Vertical scroll; each section with section header (e.g., "Browse by Category"). Use horizontal scroll for book rows; cards follow design system (12px radius, teal accent on tap).

**Recently Played:** Show 4–6 book cards; horizontal scroll; tap opens book detail. Empty state: "No playback yet" with subtle CTA to explore.

**Browse by Category / Author:** Chips or compact cards; tap navigates to filtered search (reuse Story 9.3 Advanced Search with pre-applied filter).

**New Arrivals:** Same card grid as elsewhere; "New" badge optional on recent titles.

**Visual hierarchy:** Section spacing 24px; card spacing 12px. Use muted text (slate-500) for labels; primary text (slate-900) for titles.

**Above-the-fold priority:** Featured or Recently Played first; browse sections below. Avoid more than 2 full-width hero elements before scroll.

### Tasks (6)
- Gather home page requirements
- Design home page layout
- Update HomeScreen component
- Add category browsing section
- Add author browsing section
- Update home page data fetching

---

## Story 9.5: Books Admin App Integration

**As an** administrator,
**I want** to manage authors and categories separately and use advanced filters,
**so that** I can maintain data quality and find books efficiently.

### Acceptance Criteria

1. ✅ Authors management UI (list, add, edit, delete)
2. ✅ Categories management UI (list, add, edit, delete)
3. ✅ Book edit form uses dropdowns for author/category selection
4. ✅ Book list has advanced filters (author, category, duration, text)
5. ✅ Crawler automatically populates authors and categories tables
6. ✅ API routes for authors/categories CRUD operations

### Admin UI Features

**Authors Management:**
- List view with search and pagination
- Add new author form
- Edit author name
- Delete author (with cascade handling or prevention if books exist)
- Show book count per author

**Categories Management:**
- List view with search and pagination
- Add new category form
- Edit category name
- Delete category (with cascade handling or prevention if books exist)
- Show book count per category

**Book Edit Form Updates:**
- Replace author text input with searchable dropdown
- Replace category text input with searchable dropdown
- Support creating new author/category inline (optional)

**Book List Filters:**
- Author multi-select filter
- Category multi-select filter
- Duration range filter
- Text search
- Match mobile app filter behavior

**Admin UX:** Follow `docs/design/` mockups and design system. List views: compact rows, sticky filter bar. Inline create for author/category: typeahead with "Create new" option. Delete: confirmation modal with cascade warning (e.g., "3 books use this author").

### Tasks (7)
- Update admin database model
- Create authors management UI
- Create categories management UI
- Update book edit form
- Add advanced filters to admin UI
- Update crawler integration
- Add API routes for authors/categories

---

## Story 9.6: Testing and Documentation

**As a** developer,
**I want** comprehensive tests and documentation,
**so that** the new features are reliable and maintainable.

### Acceptance Criteria

1. ✅ Migration script tested with existing data
2. ✅ API endpoints have unit tests
3. ✅ UI components have component tests
4. ✅ End-to-end tests for search flow
5. ✅ API documentation updated
6. ✅ Architecture documentation updated
7. ✅ User guide created

### Test Coverage

**Migration Tests:**
- Data integrity verification
- Unique constraint handling
- Foreign key relationships
- Rollback capability

**API Tests:**
- GET /api/v1/authors (pagination, sorting)
- GET /api/v1/categories (pagination, sorting)
- GET /api/v1/books/search (all filter combinations)
- Edge cases (empty filters, invalid IDs, special characters)

**UI Tests:**
- Filter component rendering
- Multi-select behavior
- Filter state management
- Search results display

**Integration Tests:**
- Complete search flow (select filters → API call → display results)
- Filter combinations (AND logic verification)
- Performance with large datasets

### Documentation Updates

**API Documentation:**
- New endpoint specifications
- Request/response examples
- Error codes and handling

**Architecture Documentation:**
- Updated data model diagrams
- Schema migration guide
- Search architecture

**User Documentation:**
- Advanced search user guide
- Filter usage examples
- Screenshots/mockups

### Tasks (8)
- Write migration tests
- Write API endpoint tests
- Write UI component tests
- Write integration tests
- Update API documentation
- Create Epic 9 PRD document (this file)
- Update architecture documentation
- Create user guide for advanced search

---

## Implementation Order

**Recommended sequence:**

### Phase 1: Foundation (Story 9.1)
1. Create database schema for authors and categories
2. Write and test migration script
3. Run migration on development database
4. Update schema documentation

### Phase 2: Backend (Story 9.2)
1. Implement authors and categories API endpoints
2. Update search API with filter support
3. Add database indexes
4. Test API endpoints

### Phase 3: Admin Tools (Story 9.5)
1. Update admin database model
2. Create authors/categories management UI
3. Update book edit form
4. Add filters to book list
5. Update crawler integration

### Phase 4: Mobile UI (Story 9.3)
1. Create AdvancedSearchScreen
2. Implement filter components
3. Update data layer (catalogRepository, booksApi)
4. Update Redux state management
5. Add navigation

### Phase 5: Home Page (Story 9.4)
1. Gather and finalize requirements
2. Design layout
3. Implement new sections
4. Update data fetching

### Phase 6: Testing & Docs (Story 9.6)
1. Write tests (throughout all phases)
2. Update documentation
3. Create user guides

---

## Technical Considerations

### Database Migration

**Backward Compatibility:**
- Keep original `author` and `category` columns during transition
- Use triggers or application logic to sync old/new columns
- Plan deprecation timeline

**Data Quality:**
- Handle duplicate authors with different spellings
- Normalize author names (trim, case)
- Handle books with missing authors/categories

### Performance

**Indexes:**
- `books.author_id`, `books.category_id`, `books.duration`
- `authors.name`, `book_categories.name`
- Composite index on `(author_id, category_id)` if needed

**Query Optimization:**
- Use JOIN instead of subqueries
- Limit result sets with pagination
- Cache author/category lists

### Mobile App Considerations

**Offline Support:**
- Cache author/category lists locally
- Sync filters with local SQLite database
- Handle network errors gracefully

**UX (aligned with Story 9.3 UX Guidelines):**
- Show filter count badges (e.g., "Authors (3 selected)")
- Clear all filters button
- Save recent filter combinations (optional: "Recent searches" or last-used filter preset)
- Progressive loading: show results as they arrive; debounce text search (~300ms)
- Skeleton or placeholder cards while loading; avoid layout shift

### API Design

**Query Parameter Formats:**
```
# Comma-separated
?author_ids=1,2,3

# Array notation
?author_ids[]=1&author_ids[]=2&author_ids[]=3

# JSON (POST request)
{ "author_ids": [1, 2, 3] }
```

**Recommendation:** Use comma-separated for GET requests, support both formats.

---

## Success Metrics

1. **Data Quality:** Zero data loss during migration
2. **Performance:** Search response time < 500ms for 2000+ books
3. **Usability:** Users can find books 50% faster with advanced search
4. **Adoption:** 30%+ of searches use advanced filters within first month

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Backup database, test migration script thoroughly, rollback plan |
| Performance degradation | Medium | Add indexes, optimize queries, implement pagination |
| Complex UI on mobile | Medium | User testing, progressive disclosure, clear labels |
| Backward compatibility | Low | Keep old columns, gradual migration, feature flags |

---

## Dependencies

- **Epic 8:** Local SQLite catalog (GrqaserApp) - Already implemented
- **Books table schema:** Must support foreign keys
- **Existing search:** Will be enhanced, not replaced

---

## Out of Scope

- Fuzzy search or full-text search
- Author/category aliases or synonyms
- Advanced analytics or recommendations
- Bulk import/export of authors/categories
- Multi-language support for categories

---

## Appendix: SQL Examples

### Migration Query
```sql
-- Extract unique authors
INSERT INTO authors (name)
SELECT DISTINCT author FROM books
WHERE author IS NOT NULL AND author != ''
ORDER BY author;

-- Update books with author_id
UPDATE books
SET author_id = (
  SELECT id FROM authors WHERE authors.name = books.author
);
```

### Advanced Search Query
```sql
SELECT b.*, a.name as author_name, c.name as category_name
FROM books b
LEFT JOIN authors a ON b.author_id = a.id
LEFT JOIN book_categories c ON b.category_id = c.id
WHERE
  (? IS NULL OR b.author_id IN (?))  -- author_ids filter
  AND (? IS NULL OR b.category_id IN (?))  -- category_ids filter
  AND (? IS NULL OR (b.duration >= ? AND b.duration < ?))  -- duration filter
  AND (? IS NULL OR (
    b.title LIKE ? OR
    b.description LIKE ? OR
    a.name LIKE ?
  ))  -- text search
ORDER BY b.title
LIMIT ? OFFSET ?;
```

---

**Epic Status:** Ready for Implementation
**Total Stories:** 6
**Total Tasks:** 48
**Estimated Effort:** 3-4 weeks (1 developer)
**Priority:** High

