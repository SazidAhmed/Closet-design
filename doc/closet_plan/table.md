# Closet Catalog Table Plan

This note describes how the Closets app should derive customer-facing tower
choices from the existing `categories`, `catalogs`, and `cabinets` tables.

The table relationship is:

```sql
categories.id = catalogs.category_id
catalogs.id = cabinets.catalog_id
```

The Closets app should not show every catalog directly. It should show one
category option, then keep the selected/active catalog in the background for
pricing and export.

## Required Catalog Columns

Add the following columns to `catalogs`. These are for the Closets app only and
are not intended for Sierra app behavior.

```sql
ALTER TABLE catalogs
  ADD COLUMN min_w DECIMAL(8,2) NULL,
  ADD COLUMN max_w DECIMAL(8,2) NULL,
  ADD COLUMN min_d DECIMAL(8,2) NULL,
  ADD COLUMN max_d DECIMAL(8,2) NULL,
  ADD COLUMN min_h DECIMAL(8,2) NULL,
  ADD COLUMN max_h DECIMAL(8,2) NULL;
```

Populate the values from existing cabinet rows:

```sql
UPDATE catalogs
JOIN (
  SELECT
    catalog_id,
    MIN(width)  AS min_w,
    MAX(width)  AS max_w,
    MIN(depth)  AS min_d,
    MAX(depth)  AS max_d,
    MIN(height) AS min_h,
    MAX(height) AS max_h
  FROM cabinets
  GROUP BY catalog_id
) cabinet_dims ON cabinet_dims.catalog_id = catalogs.id
SET
  catalogs.min_w = cabinet_dims.min_w,
  catalogs.max_w = cabinet_dims.max_w,
  catalogs.min_d = cabinet_dims.min_d,
  catalogs.max_d = cabinet_dims.max_d,
  catalogs.min_h = cabinet_dims.min_h,
  catalogs.max_h = cabinet_dims.max_h
WHERE catalogs.id IN (
  190,191,192,193,194,195,196,197,
  199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215
);
```

## Customer-Facing Door Modes

The first customer choice is:

- Without Doors
- With Doors

After this selection, show only the closet categories available for that mode.

## Without Doors Categories

The customer sees 5 categories:

| Category | Code | Catalogs |
| --- | --- | --- |
| Shelves | CAS | 205, 204, 199 |
| Double Hanging | CDH | 207, 206, 200 |
| Long Hanging | CLH | 209, 208, 201 |
| Drawers | CRD | 211, 210, 202 |
| Shoe Shelves | CSS | 213, 212, 203 |

Specific catalogs:

| Category | Catalog code | Catalog ID | Cat_ID note |
| --- | --- | --- | --- |
| Shelves | CAS128415-459615 | 205 | 86 |
| Shelves | CAS128418-459618 | 204 | 86 |
| Shelves | CAS128421-459621 | 199 | 80 |
| Double Hanging | CDH128415-459615 | 207 | |
| Double Hanging | CDH128418-459618 | 206 | |
| Double Hanging | CDH128421-459621 | 200 | |
| Long Hanging | CLH128415-459615 | 209 | |
| Long Hanging | CLH128418-459618 | 208 | |
| Long Hanging | CLH128421-459621 | 201 | |
| Drawers | CRD128415-429615 | 211 | |
| Drawers | CRD128418-429618 | 210 | |
| Drawers | CRD128421-429621 | 202 | |
| Shoe Shelves | CSS128415-459615 | 213 | |
| Shoe Shelves | CSS128418-459618 | 212 | |
| Shoe Shelves | CSS128421-459621 | 203 | |

Shelves (CAS), Double Hanging (CDH), and Long Hanging (CLH) without doors can
also become corner cabinets. Corner behavior uses catalogs:

- 214
- 215

## With Doors Categories

The customer sees 8 categories:

| Category | Code | Catalog |
| --- | --- | --- |
| Shelves | CAS | 190 |
| Double Hanging | CDH | 192 |
| Long Hanging | CLH | 194 |
| Rollouts | CRD | 196 |
| Shoe Shelves | CSS | 197 |
| Blind Corner Shelves | CCS | 191 |
| Blind Corner Double Hanging | CCH | 193 |
| Blind Corner Long Hanging | CCL | 195 |

Specific catalogs:

| Category | Catalog code | Catalog ID |
| --- | --- | --- |
| Shelves | CAS128423-429623 | 190 |
| Double Hanging | CDH128423-429623 | 192 |
| Long Hanging | CLH128423-429623 | 194 |
| Rollouts | CRD128423-429623 | 196 |
| Shoe Shelves | CSS128423-429623 | 197 |
| Blind Corner Shelves | CCS4084-4696 | 191 |
| Blind Corner Double Hanging | CCH4084-4696 | 193 |
| Blind Corner Long Hanging | CCL4084-4696 | 195 |

## Generate Without Doors List

Use this query to collapse the 3 catalogs in each doorless category into one
customer-facing option.

```sql
SELECT
  closet_group.door_mode,
  closet_group.category_code,
  closet_group.category_name,
  MIN(cabinets.width)  AS min_w,
  MAX(cabinets.width)  AS max_w,
  MIN(cabinets.depth)  AS min_d,
  MAX(cabinets.depth)  AS max_d,
  MIN(cabinets.height) AS min_h,
  MAX(cabinets.height) AS max_h,
  GROUP_CONCAT(DISTINCT catalogs.id ORDER BY catalogs.id) AS catalog_ids
FROM catalogs
JOIN cabinets ON cabinets.catalog_id = catalogs.id
JOIN (
  SELECT 205 AS catalog_id, 'without_doors' AS door_mode, 'CAS' AS category_code, 'Shelves' AS category_name
  UNION ALL SELECT 204, 'without_doors', 'CAS', 'Shelves'
  UNION ALL SELECT 199, 'without_doors', 'CAS', 'Shelves'

  UNION ALL SELECT 207, 'without_doors', 'CDH', 'Double Hanging'
  UNION ALL SELECT 206, 'without_doors', 'CDH', 'Double Hanging'
  UNION ALL SELECT 200, 'without_doors', 'CDH', 'Double Hanging'

  UNION ALL SELECT 209, 'without_doors', 'CLH', 'Long Hanging'
  UNION ALL SELECT 208, 'without_doors', 'CLH', 'Long Hanging'
  UNION ALL SELECT 201, 'without_doors', 'CLH', 'Long Hanging'

  UNION ALL SELECT 211, 'without_doors', 'CRD', 'Drawers'
  UNION ALL SELECT 210, 'without_doors', 'CRD', 'Drawers'
  UNION ALL SELECT 202, 'without_doors', 'CRD', 'Drawers'

  UNION ALL SELECT 213, 'without_doors', 'CSS', 'Shoe Shelves'
  UNION ALL SELECT 212, 'without_doors', 'CSS', 'Shoe Shelves'
  UNION ALL SELECT 203, 'without_doors', 'CSS', 'Shoe Shelves'
) closet_group ON closet_group.catalog_id = catalogs.id
GROUP BY
  closet_group.door_mode,
  closet_group.category_code,
  closet_group.category_name
ORDER BY closet_group.category_code;
```

## Generate With Doors List

Use this query to return one customer-facing category per catalog.

```sql
SELECT
  closet_group.door_mode,
  closet_group.category_code,
  closet_group.category_name,
  MIN(cabinets.width)  AS min_w,
  MAX(cabinets.width)  AS max_w,
  MIN(cabinets.depth)  AS min_d,
  MAX(cabinets.depth)  AS max_d,
  MIN(cabinets.height) AS min_h,
  MAX(cabinets.height) AS max_h,
  catalogs.id AS catalog_id
FROM catalogs
JOIN cabinets ON cabinets.catalog_id = catalogs.id
JOIN (
  SELECT 190 AS catalog_id, 'with_doors' AS door_mode, 'CAS' AS category_code, 'Shelves' AS category_name
  UNION ALL SELECT 192, 'with_doors', 'CDH', 'Double Hanging'
  UNION ALL SELECT 194, 'with_doors', 'CLH', 'Long Hanging'
  UNION ALL SELECT 196, 'with_doors', 'CRD', 'Rollouts'
  UNION ALL SELECT 197, 'with_doors', 'CSS', 'Shoe Shelves'
  UNION ALL SELECT 191, 'with_doors', 'CCS', 'Blind Corner Shelves'
  UNION ALL SELECT 193, 'with_doors', 'CCH', 'Blind Corner Double Hanging'
  UNION ALL SELECT 195, 'with_doors', 'CCL', 'Blind Corner Long Hanging'
) closet_group ON closet_group.catalog_id = catalogs.id
GROUP BY
  closet_group.door_mode,
  closet_group.category_code,
  closet_group.category_name,
  catalogs.id
ORDER BY closet_group.category_code;
```

## Recommended Mapping Table

The existing tables can generate cabinet dimensions, but they do not fully
describe the Closets app grouping rules. Add a mapping table or equivalent seed
data so the app does not hardcode the `UNION ALL` list.

Example:

```sql
CREATE TABLE closet_catalog_groups (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  door_mode ENUM('without_doors', 'with_doors') NOT NULL,
  category_code VARCHAR(10) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  catalog_id BIGINT UNSIGNED NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_corner_catalog TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL,
  updated_at TIMESTAMP NULL,
  INDEX closet_catalog_groups_catalog_id_index (catalog_id),
  INDEX closet_catalog_groups_mode_code_index (door_mode, category_code)
);
```

With this table, the customer-facing list becomes:

```sql
SELECT
  groups.door_mode,
  groups.category_code,
  groups.category_name,
  MIN(catalogs.min_w) AS min_w,
  MAX(catalogs.max_w) AS max_w,
  MIN(catalogs.min_d) AS min_d,
  MAX(catalogs.max_d) AS max_d,
  MIN(catalogs.min_h) AS min_h,
  MAX(catalogs.max_h) AS max_h,
  GROUP_CONCAT(groups.catalog_id ORDER BY groups.sort_order) AS catalog_ids
FROM closet_catalog_groups groups
JOIN catalogs ON catalogs.id = groups.catalog_id
WHERE groups.door_mode = 'without_doors'
  AND groups.is_corner_catalog = 0
GROUP BY
  groups.door_mode,
  groups.category_code,
  groups.category_name
ORDER BY MIN(groups.sort_order);
```

For `with_doors`, use the same query with:

```sql
WHERE groups.door_mode = 'with_doors'
```

## Runtime Selection Logic

When a customer selects a category:

1. Create the tower using the smallest available dimensions for that visible
   category.
2. Allow width, depth, and height edits only within the aggregated absolute
   min/max range for the category.
3. For `without_doors`, only depth changes can switch the active catalog.
4. For `without_doors`, width and height remain category dimensions and do not
   choose a different catalog inside the same category.
5. For `with_doors`, each category has one catalog, so no catalog switching is
   needed.
6. Store the active `catalog_id` on the tower/export payload so pricing can
   identify the correct cabinet catalog later.

Example for doorless Shelves (CAS):

- Start with the smallest matching cabinet, for example 12 W, 84 H, 15 D from
  catalog 205.
- If depth exceeds catalog 205's `max_d`, switch the active catalog to 204.
- If depth later exceeds catalog 204's `max_d`, switch the active catalog to
  199.
- Stop increasing depth at the category's absolute `max_d`.

## Open Clarifications

- Confirm whether catalogs 214 and 215 are shared corner catalogs for CAS, CDH,
  and CLH, or whether each corner catalog maps to specific categories.
- Confirm exact production field names for catalog IDs if both `id` and
  `cat_id` exist in the real database.
- Confirm whether `catalogs.min_*` and `catalogs.max_*` should be maintained
  from `cabinets` automatically in migrations/seeders, or manually populated by
  admin tooling.
