---
title: InnoDB Memory + Disk Architecture
createdAt: 2026-05-08 23:42
updatedAt: 2026-05-12 19:43
tags:
  - MySQL
---

## 1. Prerequisite Knowledge

1. **Disk**: Permanent storage; data is not lost when the system is shut down, but it is slow.
2. **Memory (Buffer Pool)**: Temporary cache; operations are performed here first, and it is fast.

## 2. What Is Stored on Disk (3 Key Files)

1. **.ibd file**

    An independent tablespace file for each table: stores **table data + all indexes** (the clustered index and secondary indexes are all here).
2. **Redo log file**

    Used for crash recovery to ensure that transaction data is not lost. Write operations are first written to the log, and then the data is flushed to disk.
3. **Undo log**

    Transaction rollback and MVCC multi-version reads depend on it. It stores the old version before data was modified.

## 3. Memory Core: Buffer Pool

**This is the key to InnoDB performance.**

You can understand it as: **a high-speed temporary cache copy of the data on disk**.

### What Does the Buffer Pool Store?

- **Data pages** loaded from disk
- **Index pages** loaded from disk

The unit is not one row at a time, but a **page (Page)**.

The default page size is 16KB. The smallest read/write unit for InnoDB is a **page**.

### The Real Process of a Query

1. The executor asks InnoDB to query a row of data.
2. InnoDB first looks in **Buffer Pool memory**:

    - Found → return it directly, **without accessing the disk; extremely fast**
    - Not found → load the entire **16KB data page** from disk into the Buffer Pool, find the required row in the page, and return it

3. When someone queries data on the same page later, it directly hits memory.

### The Real Process of an Update

1. First load the data page into **Buffer Pool memory**.
2. **Only modify the data in memory** (the disk still has the old data at this point).
3. At the same time, write the **redo log** to record this modification.
4. Later, a background thread slowly **asynchronously flushes dirty pages in memory back to disk**.

👉 Key point:

**An update does not directly modify the disk. It modifies memory and records a log, while the background process slowly writes it to disk. This is the fundamental reason MySQL is fast.**

## 4. Two Key Concepts

1. **Clean page**: The data in memory and on disk is exactly the same; it does not need to be flushed.
2. **Dirty page**: The data in memory has changed while the disk still has the old data; it needs to be flushed to disk in the background.
