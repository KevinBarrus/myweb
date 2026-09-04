---
title: MySQL Layered Architecture
createdAt: 2026-05-08 23:42
updatedAt: 2026-05-13 15:26
tags:
  - MySQL
---

MySQL is actually composed of upper-layer components and lower-layer storage engines. Its structure can be understood as:

```text
┌─────────────────────────────────┐
│          Server layer            │
│  (connectors, query cache,       │
│   parser, optimizer, executor,  │
│   built-in functions, etc.)      │
└────────────┬────────────────────┘
             │ Unified API
┌────────────▼────────────────────┐
│       Storage engine layer       │
│  (InnoDB, MyISAM, Memory, etc.)  │
│  Responsible for storing and     │
│  retrieving data                 │
└─────────────────────────────────┘
```

In a more procedural form:

```text
Client
   ↓
Connector
   ↓
SQL interface
   ↓
Parser
   ↓
Optimizer
   ↓
Executor
   ↓
Storage engine (InnoDB)
```

It is important to note that MySQL itself does not truly operate the data; the storage engine does.

## How Is a SQL Statement Executed?

For example:

```sql
SELECT * FROM user WHERE id = 1;
```

Internally, MySQL goes through the following steps:

1. **Connector**

Before writing SQL, a TCP connection must be established with the connector.

Logging in to MySQL, establishing the connection, checking the account and password, and verifying permissions are all handled by the connector.

Because later operations on this connection use the permissions read at this time, the connection must be re-established after permissions are changed.

For example:

```sql
mysql -uroot -p
```

This is the connector at work.

If the connection remains idle longer than `wait_timeout` (8 hours by default), it is disconnected automatically.

**Long connections vs. short connections**:

- **Short connection**: disconnect after executing several SQL statements and reconnect next time. Frequently creating connections has a high cost.
- **Long connection**: reuse the connection, **but the temporary memory used by MySQL is bound to the connection object. Accumulated long connections may cause memory to grow sharply (OOM), because it is not released immediately**.
  - Solution: periodically disconnect long connections, or execute `mysql_reset_connection` to reset the connection state (MySQL 5.7+).

2. **Query cache (removed in 8.0)**

Before executing SQL, MySQL checks whether the SQL was previously queried and whether its result was cached. The key is the SQL statement and the value is the result.

If it exists, the result is returned directly without going through the later steps. **MySQL 8.0 has completely removed the query cache.**

Any update operation on a table (INSERT/UPDATE/DELETE) **clears all query cache entries for that table**. For businesses with many writes and few reads, the query-cache hit rate is extremely low and becomes a performance burden, so it was completely removed after 8.0.

The removed feature is the **query cache**. The InnoDB Buffer Pool still works as a cache after 8.0; it caches **pages** (data pages and index pages), not the result of an entire SQL statement.

3. **Parser**

The parser performs two tasks:

- Lexical analysis: recognize keywords such as select, from, and where, and analyze their meanings.
- Syntax analysis: determine whether the SQL is valid; syntax errors are reported here.

In essence, it converts SQL into a structure that MySQL can understand.

**Note**: the parser checks syntax only, **not semantics**. For example, whether a table or column exists is checked during **execution or preparation**.

4. **Optimizer**

A SQL statement may have multiple execution methods. The optimizer chooses the one with the **lowest cost and highest speed**:

```sql
SELECT * FROM user
WHERE age = 20
AND name = 'Tom';
```

The optimizer decides:

- Which index to use
- The order of multi-table associations
- The JOIN order
- Whether to perform a full-table scan
- Whether to convert a subquery into a semijoin

That is, the SQL we write is not equal to the actual execution method. The optimizer determines the actual execution plan, somewhat like compiler optimization. Its choice is not necessarily truly optimal.

5. **Executor**

The executor first checks whether there is permission to operate on the table. If permission exists, it calls the storage-engine (InnoDB) interface and actually retrieves data row by row from disk or memory.

For a query without an index, it reads and compares rows one by one. With an index, it finds the first matching row through the index, then the next one, until the condition is no longer satisfied, and returns the result to the client.

The storage engine decides whether to read a page from the Buffer Pool or from disk.

Note that the executor only calls the storage-engine interface. The storage engine performs the actual work and is responsible for data storage, indexes, transactions, and locks. MySQL is the boss, while the storage engine is the person doing the actual work.

The log flow is:

```text
Executor -> InnoDB engine -> write redo log first (prepare phase)
                         -> write binlog
                         -> redo log commit
```

- **redo log**: an InnoDB-specific physical log used for **crash recovery**. It uses WAL (Write-Ahead Logging): write the log first, then flush to disk. The redo log is written cyclically.
- **binlog**: a logical log at the Server layer. It records the original logic of statements and is used for **replication** and **data recovery**. The binlog is append-only.
- **Two-phase commit**: first put the redo log into the prepare state, then write the binlog, and finally commit the redo log. This keeps the two logs consistent and allows recovery to determine the transaction state.

What circular writing and append writing specifically mean will be discussed below.

### An Analogy

- **MySQL service layer** (connector, parser, optimizer, executor): **company owner / management**
- **InnoDB storage engine**: **warehouse manager**
- **Disk**: actual warehouse shelves
- **Buffer Pool memory**: temporary shelves at the warehouse entrance (cache)

The flow is:

1. The owner (executor) says: help me find the data with id=100.
2. The warehouse manager (InnoDB) **decides for itself**:

    - First check whether the data is on the temporary shelf at the entrance (the Buffer Pool in memory).
    - If it is there → retrieve it directly from memory, which is fast.
    - If it is not there → go to the actual warehouse (disk), read the data page, place it in memory, and then return it to the owner.

👉 Note:

**The executor only issues commands. It does not touch the disk or manage the memory cache.**

**Whether memory or disk is read is handled internally by InnoDB.**

### The Division of Responsibilities

#### 1. What the service layer (executor) does

It performs only three tasks:

1. Use the optimizer's selected execution plan.
2. Call the interface provided by InnoDB: read one row, then the next row.
3. Filter, sort, and aggregate the returned data, then return it to the client.

**It has no idea whether data is in memory or on disk and does not care about physical storage details.**

#### 2. What the storage engine (InnoDB) does

It is responsible for:

- Managing data and index files on disk
- Managing the Buffer Pool in memory
- Deciding whether to cache data and evict old data
- Handling transactions, MVCC, row locks, and redo/undo logs
- Responding to requests for data and retrieving it from memory or disk
- Ensuring **transaction consistency** (ACID: Atomicity, Consistency, Isolation, Durability) and **data integrity** (foreign keys, unique constraints, and so on)

For data stored in disk files, InnoDB:

* Stores data in pages
* Uses caching
* Uses B+ trees to manage data (data pages are organized through B+ tree indexes; the primary-key index is called a clustered index, and a secondary index is called a non-clustered index)

Later, we will review why databases do not store rows continuously.

Why can MySQL claim to be fast? Because it does not directly read and write the disk.

The **Buffer Pool** in InnoDB memory plays this role:

- **Reading data**: first check whether it is in memory. If it is, return it directly; otherwise, read it from disk and cache it.
- **Writing data**: first modify the data page in memory and mark it as dirty, record the `redo log` at the same time, and then flush it asynchronously.

**In addition, all InnoDB data and indexes are organized and managed in 16KB pages.**

InnoDB's **smallest disk I/O unit is a page**, with a default size of **16KB**. A small row does not cause one disk I/O by itself; instead, an entire page is loaded into the Buffer Pool at once. Indexes and row data are organized and stored on disk and in memory in units of **pages**.

#### Summary

**The executor is the commander issuing orders; InnoDB is the worker that personally manages memory and disk.**

## Why InnoDB?

1. InnoDB supports transactions:

For example:

```sql
BEGIN;

UPDATE account SET money = money - 100 WHERE id = 1;

UPDATE account SET money = money + 100 WHERE id = 2;

COMMIT;
```

A transaction either succeeds completely or fails completely. During a transfer, your account cannot lose 100 yuan while the other account fails to gain 100 yuan.

InnoDB uses undo log + redo log + binlog to guarantee transaction atomicity and durability.

MyISAM does not support transactions.

2. InnoDB supports row locks

For example, when user A updates `id=1`, this does not affect user B updating `id=2`, so concurrency is relatively high, although race conditions or deadlocks may occur.

MyISAM uses table locks. When one person changes data, the entire table may be locked, resulting in poorer concurrency.

Note that InnoDB supports both row locks and table locks, while MyISAM supports only table locks.

To understand table locks and row locks simply, suppose two users execute the following SQL at the same time:

```sql
UPDATE account SET money = money - 100 WHERE id = 1;
```

- **InnoDB**:
    - If the two UPDATE statements modify different IDs (rows), row locks allow them to execute at the same time without causing `money` to be reduced by 200.
    - If they modify the same ID, the second statement waits for the first to commit.
- **MyISAM**:
    - It locks the entire table, so the second UPDATE must wait for the first to finish.

3. InnoDB supports crash recovery

Even if power is suddenly lost, data is less likely to be lost because the **redo log replays transactions and the undo log rolls transactions back**. This will be reviewed in detail in the article about logs.

4. InnoDB uses clustered indexes

For now, remember: **data and indexes are stored together (the InnoDB primary-key index stores data pages)**. This will be reviewed in detail in the article about indexes.

- **Advantages**:
    - Primary-key queries are very fast.
    - Range-query data is stored in order, which benefits scanning.
- **Disadvantages**:
    - Inserting in the wrong order may cause page splits and slightly poorer write performance.
    - Looking up a primary key through a secondary index may require a table lookup.

MyISAM uses non-clustered indexes, where the **index points to an address**.

5. InnoDB supports foreign keys, while MyISAM does not

#### Summary

The five aspects are:

* Transactions
* Lock granularity
* Foreign keys
* Reliability
* Index structure

## Self-Test

#### Q1: How is a SQL statement executed?

A1:
Connector (user authentication and TCP connection) →
query cache (removed in MySQL 8.0 because its hit rate was too low) →
parser (recognizes keywords and analyzes syntax errors) →
optimizer (similar to compiler optimization; handles questions such as which index to use, which table to query first in a multi-table query, and JOIN order) →
executor (calls the storage-engine interface) →
storage engine operates on the actual physical data →
executor assembles the result set.

#### Q2: What is a storage engine?

A2: MySQL is like the owner of a company, while the storage engine is like an employee. The owner is authorized to call on the employee; similarly, MySQL has an interface for calling the storage engine. The storage engine manages data on disk and in memory (using the B+ tree data structure), executes CRUD requests from the executor, and handles transactions, locks, MVCC, redo log, and undo log. In short, the storage engine does the actual work.

#### Q3: Why InnoDB?

A3:

Reason 1: InnoDB supports transactions, while MyISAM does not.

A transaction means that a group of SQL statements are either all executed or none of them are. A typical use case is a money transfer. Without transactions, A's account could lose 100 yuan while the recipient B's account does not gain 100 yuan.

Reason 2: InnoDB supports row locks, while MyISAM uses table locks.

With InnoDB, A can update `id=1` while B updates `id=2` at the same time, providing stronger concurrency, although race conditions and deadlocks may occur. With MyISAM, only one person can update data during a period because the entire table is locked.

Reason 3: InnoDB supports crash recovery.

The redo log replays transactions, while the undo log rolls transactions back. InnoDB crash recovery mainly relies on the **WAL (Write-Ahead Logging) mechanism of the redo log**. After restarting from a power failure, InnoDB checks the redo log, replays data that was **committed but not written to disk**, and uses the undo log to roll back **uncommitted transactions**, thereby maintaining data consistency.

Reason 4: InnoDB supports clustered indexes.

For now, remember that this is similar to storing the primary key together with the data. More precisely, the primary-key index stores the data pages.

Reason 5: InnoDB supports foreign keys, while MyISAM does not.

#### Q4: Why does InnoDB write the log before writing to disk during an update?

A4: If data were written directly to disk, imagine the following scenario:

MySQL data is stored in `.ibd` files on disk. Each file is divided into many **16KB data pages**.

When you execute `UPDATE users SET name = 'Tom' WHERE id = 100;`:

- The data for user `id=100` may be on page 500 of the disk file.
- You then execute `UPDATE orders SET status = 1 WHERE order_id = 999;`.
- The order data may be on page 2000 of the disk file.

If you write directly to disk, the disk head must rapidly jump around the disk: seek to page 500 and write a little, then seek to page 2000 and write a little. This kind of scattered writing is slow.

When writing the log first, InnoDB does not immediately modify that 16KB page on disk. Instead, it first records the modification in the **redo log**.

**The redo log is appended sequentially**: it is like a ledger that keeps extending, with each new record written at the end. (This does not conflict with the earlier statement that redo log uses circular writing while binlog uses append-only writing; that distinction is explained shortly.)

Why is this faster? There are three main reasons:

1. Convert synchronous work into asynchronous work

Without redo log, to ensure data is not lost, after the user clicks “commit” the system must **wait in place** for the disk head to move to page 500 and finish writing before returning “update successful.” This wait for a synchronous write is a delay visible to the user.

With redo log, log writing is sequential and very fast. As soon as the log is written, MySQL returns success. When the data is flushed from memory to page 500 is left to a background thread as an asynchronous write. **The user no longer waits for the physical movement of the disk head.**

2. Merge writes

Although the disk head eventually needs to write pages 500 and 2000, the background thread does not write every modification immediately. Instead, it accumulates a batch before writing:

- **Scenario A (direct writing)**: page 500 is modified 10 times within one minute. The disk head moves there 10 times and performs 10 writes.
- **Scenario B (WAL mode)**: the 10 modifications are completed in memory and recorded sequentially in the redo log. The background thread notices that page 500 is “hot,” waits until all 10 modifications finish, and **moves there only once** to write the final result to disk.

This turns 10 random I/O operations into one random I/O operation.

3. Disk scheduling optimization (I/O sorting)

When the background thread flushes dirty pages from memory to disk, it may have accumulated hundreds of writes at different positions, such as pages 500, 2000, and 800.

With direct writing, the disk-head path may be `500 -> 2000 -> 800`, repeatedly moving backward and forward. In asynchronous mode, MySQL or the operating system can **sort** these tasks and move in order: `500 -> 800 -> 2000`. This is like a courier: delivering each order as it arrives causes the courier to run randomly around the city, while planning a route for a day's orders allows the courier to travel around the city in sequence.

#### Q5: Is redo log cyclic or append-only?

A5: The article previously said redo log is written circularly, but it also said redo log is appended. This requires clarifying one concept: **“append” describes an I/O behavior, while “circular writing” describes a space-management strategy.**

1. At the physical level, both redo log and binlog use append writes

Whether writing redo log or binlog, the disk head performs a **sequential append** when data is written to disk.

- **Appending redo log**: although it appears on disk as a fixed-size group of files, such as `ib_logfile0` and `ib_logfile1`, it internally maintains a `write pos` pointer for the current write position. Each write proceeds sequentially from `write pos`.
- **Appending binlog**: it continually creates new files (`binlog.000001`, `binlog.000002`, and so on) and keeps appending forward.

2. Difference in space-management strategy

| **Characteristic** | **redo log** | **binlog** |
| --- | --- | --- |
| **Space strategy** | **Circular** | **Append** |
| **Storage behavior** | Fixed space. When full, it returns to the beginning and **overwrites** old records. | Variable space. When one file is full, another is created. |
| **Condition for overwriting** | The record being overwritten must already have been persisted by being flushed to a data page. | Records are never overwritten; old files remain until they are cleaned up. |
| **Purpose** | Crash recovery, ensuring recent data is not lost. | Data archiving and primary-replica replication, recording the complete history. |

In summary, binlog is “append without overwriting,” while redo log is “an overwriteable circular log.”

3. Why is redo log designed for circular writing?

This balances **performance and space**.

**Redo log is temporary storage**: its purpose is to recover dirty pages in the Buffer Pool if power is lost before they are flushed into the `.ibd` file. Once a dirty page is successfully flushed to disk, that section of redo log has completed its purpose and becomes unnecessary.

**Prevent unbounded growth**: a database may receive an enormous volume of modifications each day. Without circular overwriting, redo log would quickly consume all disk space.

**Checkpoint mechanism**: InnoDB maintains a `checkpoint` marker. `write pos` advances toward the checkpoint. If `write pos` is about to catch up with the checkpoint, meaning the space is full, MySQL is forced to stop, flush a batch of dirty pages from memory to disk, and move the checkpoint forward to free space.

#### Q6: What is the main difference between UPDATE and SELECT?

A6: At the InnoDB layer, UPDATE writes **redo log** for crash recovery. At the Server layer, it writes **binlog** for primary-replica replication and data recovery. To keep the two logs consistent, it also requires **two-phase commit**. SELECT does not involve these logs at all.

The detailed process is:

1. The executor calls the engine to retrieve data.
2. The engine modifies the data page in memory and writes **undo log** for rollback and MVCC.
3. It writes **redo log** with the state set to prepare.
4. The executor writes **binlog**.
5. The transaction is committed and the redo-log state changes to commit, completing two-phase commit.

#### Q7: What happens if MySQL crashes while writing binlog and redo log is in prepare state?

A7: **After recovery, MySQL rolls back this transaction.**

The reason is that the recovery rule for two-phase commit is: if redo log is in the prepare state, check whether the corresponding binlog is complete.

In this scenario, MySQL crashed before binlog finished writing, so binlog is incomplete.

To keep redo log and binlog consistent, MySQL therefore **rolls back the transaction**, using undo log to undo the data associated with the redo-log entry in the prepare state.

Does that mean the data in redo log is lost? Yes, and it must be discarded. Binlog does not contain this operation. If it were committed, a replica would lack the operation during replication, causing the primary and replica to become inconsistent. **Consistency takes priority.**

#### Q8: Why does the executor check permissions again after the connector?

A8: During parsing, some SQL may not yet reveal which tables will be operated on, such as dynamic SQL in stored procedures or certain trigger scenarios. The parser only checks syntax and does not check table-level permissions. Therefore, before actually opening a table and executing the operation, the executor must verify once more that the user has permission to operate on that table. The executor checks **table-level permissions**, such as SELECT and INSERT. The connector only determines whether the user may connect.
