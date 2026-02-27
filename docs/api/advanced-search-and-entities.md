# Advanced Search and Entity API (Epic 9)

Base path: `/api/v1`

## `GET /authors`

Returns paginated authors for admin UI and filter dropdown population.

### Query params

- `page` (optional, default `1`)
- `limit` (optional, default `20`, max `100`)
- `search` (optional, author name substring)

### Success response

```json
{
  "success": true,
  "data": [
    {"id": 1, "name": "Author A", "book_count": 4}
  ],
  "pagination": {"page": 1, "limit": 20, "total": 1, "pages": 1}
}
```

### Errors

- `400 VALIDATION_ERROR` (invalid id/value for detail/update/delete)
- `404 AUTHOR_NOT_FOUND`
- `409 AUTHOR_EXISTS`
- `409 AUTHOR_IN_USE`
- `500 DATABASE_ERROR`

## `GET /categories`

Returns paginated categories for admin UI and filter dropdown population.

### Query params

- `page` (optional, default `1`)
- `limit` (optional, default `20`, max `100`)
- `search` (optional, category name substring)

### Success response

```json
{
  "success": true,
  "data": [
    {"id": 10, "name": "Fiction", "book_count": 12}
  ],
  "pagination": {"page": 1, "limit": 20, "total": 1, "pages": 1}
}
```

### Errors

- `400 VALIDATION_ERROR`
- `404 CATEGORY_NOT_FOUND`
- `409 CATEGORY_EXISTS`
- `409 CATEGORY_IN_USE`
- `500 DATABASE_ERROR`

## `GET /books/search`

Advanced search endpoint. Filters are combined using AND logic.

### Query params

- `text` (optional): title/description/author text match
- `author_ids` (optional): comma-separated author IDs (`1,3,9`)
- `category_ids` (optional): comma-separated category IDs (`2,4`)
- `duration_range` (optional): one of `<30`, `30-60`, `60-120`, `120-300`, `300+`
- `page` (optional, default `1`)
- `limit` (optional, default `20`, max `100`)

If all filters are empty, endpoint returns the default search listing.

### Example

`GET /api/v1/books/search?text=history&author_ids=5&category_ids=2,8&duration_range=300+&page=1&limit=20`

### Success response

```json
{
  "success": true,
  "data": {
    "books": [],
    "total": 0,
    "page": 1,
    "limit": 20,
    "pagination": {"page": 1, "limit": 20, "total": 0, "pages": 0}
  }
}
```

### Error handling

- Invalid or non-numeric IDs in `author_ids` / `category_ids` are ignored.
- Special characters in `text` are treated as text input; query remains safe and returns `200`.
- Unexpected failures return `500 DATABASE_ERROR`.
