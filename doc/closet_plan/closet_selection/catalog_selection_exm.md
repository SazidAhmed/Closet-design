# Catalog Selection & Cabinet Switching Examples

This document illustrates how **catalog selection by depth** (`minD` and `maxD`) and **cabinet resolution** work when a user edits a tower's dimensions in the Build Closet UI.

---

## Catalog & Cabinet Data Model Example

Below is an example snippet of backend API data for the **Shelves (`CAS`)** category under `without_doors` mode:

| Catalog ID    | Catalog Code         | Depth Coverage Range (`minD` – `maxD`) | Cabinets in Catalog (Ordered)                                                                                                |
| ------------- | -------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **205** | `CAS128415-459615` | **`6.0"` – `16.0"`**             | **1st:** `#4050` (`CAS128415`)  **2nd:** `#4051` (`CAS158415`)  **3rd:** `#4052` (`CAS308415`) |
| **204** | `CAS128418-459618` | **`16.0625"` – `19.0"`**         | **1st:** `#4053` (`CAS128418`)  **2nd:** `#4054` (`CAS158418`)  **3rd:** `#4055` (`CAS308418`) |
| **199** | `CAS128421-459621` | **`19.0625"` – `22.0"`**         | **1st:** `#4056` (`CAS128421`)  **2nd:** `#4057` (`CAS158421`)  **3rd:** `#4058` (`CAS308421`) |

---

## Scenario Walkthroughs

### Scenario 1: Depth Change Causes Catalog Switch (e.g. `15"` → `18"`)

1. **Initial Tower State**:

   - Depth: `15.0"`
   - Active Catalog: **Catalog 205** (`minD: 6.0`, `maxD: 16.0`)
   - Selected Cabinet: `#4052` (`CAS308415`)
2. **User Action**:

   - User inputs new depth: **`18.0"`**.
3. **Execution Steps**:

   - **Step 1 — Catalog Resolution**:
     - System evaluates catalog ranges: `18.0"` falls in **Catalog 204** (`minD: 16.0625`, `maxD: 19.0`).
   - **Step 2 — Detect Catalog Switch**:
     - Active catalog changed (`205` → `204`).
   - **Step 3 — First Cabinet Selection**:
     - Because the catalog switched, the system automatically selects the **very first cabinet** of Catalog 204:
       - `tower.catalogId` = `204`
       - `tower.catalogCode` = `"CAS128418-459618"`
       - `tower.cabinetId` = **`4053`** *(1st cabinet in Catalog 204: `CAS128418`)*
       - `tower.cabinetCode` = **`"CAS128418"`**

---

### Scenario 2: Depth Change Stays Within Same Catalog (e.g. `15"` → `14"`)

1. **Initial Tower State**:

   - Depth: `15.0"`
   - Active Catalog: **Catalog 205** (`minD: 6.0`, `maxD: 16.0`)
   - Selected Cabinet: `#4052` (`CAS308415`)
2. **User Action**:

   - User inputs new depth: **`14.0"`**.
3. **Execution Steps**:

   - **Step 1 — Catalog Resolution**:
     - `14.0"` is within `6.0"` – `16.0"` range → Remains in **Catalog 205**.
   - **Step 2 — Detect Catalog Switch**:
     - Catalog did **NOT** change (`205` → `205`).
   - **Step 3 — Standard Range Resolution**:
     - System executes standard range matching (`selectCabinet`), preserving the 30" width cabinet (`#4052`).

---

### Scenario 3: Width or Height Change (No Depth Change)

1. **User Action**:

   - User edits tower width or height while keeping depth unchanged.
2. **Execution Steps**:

   - Catalog remains unchanged.
   - Standard `selectCabinet` range-matching logic matches the closest/tightest cabinet based on width and height within the active catalog.
