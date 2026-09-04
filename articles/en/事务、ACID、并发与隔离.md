---
title: Transactions, ACID, Concurrency, and Isolation
createdAt: 2026-06-02 21:20
updatedAt: 2026-06-02 22:08
tags:
  - MySQL
---

## What Is a Transaction?

Assume A transfers 100 yuan to B:

```MySQL
UPDATE account SET money = money - 100 WHERE id = 1;
UPDATE account SET money = money + 100 WHERE id = 2;
```

Normally:

```
A:1000 B:1000
↓
A:900 B:1100
```

But what if execution stops halfway?

```MySQL
UPDATE account SET money = money - 100WHERE id = 1;
```

If the server crashes after this succeeds and the second statement is not executed:

```
A:900
B:1000
```

The money disappears.

Therefore, databases introduced:

# Transaction

```MySQL
BEGIN;

UPDATE account SET money = money - 100 WHERE id = 1;
UPDATE account SET money = money + 100 WHERE id = 2;

COMMIT;
```

The requirement is:

```
Either all succeed or all fail
```

This is a transaction.

## ACID

```
A Atomicity
C Consistency
I Isolation
D Durability
```

### A: Atomicity

It means:

```
A transaction cannot be divided
```

For a transfer, subtracting money and adding money must be treated as one whole; subtracting money cannot succeed while adding money fails.

Who implements atomicity?

#### undo log

Understand it as:

```
Keep successful execution
Roll back failed execution
```

### D: Durability

It means:

```
Data cannot be lost after a transaction is committed
```

For example:

```
COMMIT;
```

returns success.

The user has already seen:

```
Transfer successful
```

If the power is cut at this moment, you cannot say:

```
I was just kidding
```

Therefore, successfully committed data must exist. What guarantees this?

The answer is:

#### redo log

```
undo log
↓
Atomicity

redo log
↓
Durability
```

### Consistency

Consistency means:

```
Before and after a transaction executes, the data satisfies the business rules
```

For example, the total amount in a bank is:

```
A:1000 B:1000
Total:2000
```

After the transfer:

```
A:900 B:1100
Total remains 2000
```

Consistency is not violated.

If it becomes:

```
A:900 B:1000
```

The total is:

```
1900
```

Consistency is violated.

Consistency is:

```
Atomicity + Isolation + Durability
```

the final result jointly guaranteed by all three.

### Isolation

Assume transaction A:

```MySQL
BEGIN;
UPDATE account SET money = 500 WHERE id = 1;
```

But it has not committed yet.

At this point, transaction B executes:

```MySQL
SELECT * FROM account WHERE id = 1;
```

Does B see 500 or the original value?

This introduces:

### Concurrency problems

Multiple transactions execute at the same time. If they are not controlled, the data becomes disordered.

Therefore, databases introduced:

### Isolation

Isolation.

The goal is for transactions not to interfere with one another.

## What Problems Does Concurrency Cause?

### 1. Dirty read

Transaction A:

```MySQL
BEGIN;
UPDATE user SET money = 500;
```

It has not committed.

Transaction B:

```MySQL
SELECT money;
```

sees 500.

Then A rolls back, and the actual value is 100.

B read data that never existed.

This is a dirty read.

### 2. Non-repeatable read

Transaction A:

```MySQL
BEGIN;
```

First query:

```MySQL
SELECT money;
```

Result: 100

Transaction B:

```MySQL
UPDATE money=200;
COMMIT;
```

Transaction A queries again:

```MySQL
SELECT money;
```

Result: 200

The same transaction and the same SQL produce different results twice. This is a non-repeatable read.

### 3. Phantom read

Transaction A:

```MysQL
SELECT * FROM user WHERE age > 20;
```

Result: 10 rows.

Transaction B:

```MySQL
INSERT ...
```

adds one row.

Transaction A queries again:

```MySQL
SELECT * FROM user WHERE age > 20;
```

Result: 11 rows.

One row suddenly appears, as if a hallucination occurred. This is a phantom read.

## Isolation Levels

To solve the problems above, the SQL standard proposes four isolation levels.

### Read Uncommitted

Allows reading uncommitted data.

Dirty reads, non-repeatable reads, and phantom reads can all occur, so it is almost never used.

### Read Committed (RC)

Only reads committed data.

It solves:

```
Dirty reads
```

But these can still occur:

```
Non-repeatable reads
Phantom reads
```

This is:

- The Oracle default
- A commonly used mode in PostgreSQL

### Repeatable Read (RR)

Solves:

```
Dirty reads
Non-repeatable reads
```

This is the MySQL default.

Note: in many databases, RR still has phantom reads, but InnoDB is special.

#### Why Does RR Solve Dirty Reads and Non-repeatable Reads?

For example, transaction A:

``` MySQL
BEGIN;
SELECT money FROM account WHERE id=1;
```

Result: 100

Transaction B:

```MySQL
UPDATE account SET money=200 WHERE id=1;
COMMIT;
```

Transaction A queries again:

```MySQL
SELECT money FROM account WHERE id=1;
```

Why does RC see 200 while RR can still see 100?

If the database really changed the data:
- The disk already contains 200.
- The Buffer Pool also contains 200.

Why can transaction A still see 100?

This raises a very important question:

# Does the database have only one copy of the data?

The answer is:

```
No
```

This is the starting point of MVCC.

Assume there is a record:

```
id=1
money=100
```

Transaction A starts:

```
BEGIN;
```

Time:

```
T1
```

Transaction B starts:

```
BEGIN;
```

Time:

```
T2
```

Transaction B updates:

```MySQL
UPDATE account
SET money=200
WHERE id=1;
```

and then commits.

The database now contains:

```
money=200
```

Question: why can transaction A still see 100?

If the database had only:

```
money=200
```

this single copy of the data, it obviously could not do this.

Therefore, InnoDB does something clever:

##### It does not overwrite old data

Instead:

```
Version 1: money=100
Version 2: money=200
```

exist at the same time.

This is called:

# Multi-Version

Multiple versions.

The full name of MVCC is:

```
Multi-Version Concurrency Control
```

Multi-version concurrency control.

You can first understand MVCC as Git. For example, in Git:

```
commit1
commit2
commit3
```

all exist. You do not stop seeing commit1 just because commit3 appears.

MVCC works the same way. The database retains old versions + new versions.

It then decides:

```
Which transaction can see which version
```

### Serializable

The strictest level; transactions execute serially.

The problem is extremely poor performance, so it is almost never used.

|Isolation level|Dirty read|Non-repeatable read|Phantom read|
|---|---|---|---|
|RU|Yes|Yes|Yes|
|RC|No|Yes|Yes|
|RR|No|No|Theoretically yes|
|Serializable|No|No|No|
