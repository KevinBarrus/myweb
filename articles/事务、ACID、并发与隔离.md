---
title: 事务、ACID、并发与隔离
createdAt: 2026-06-02 21:20
updatedAt: 2026-06-02 22:08
tags:
  - MySQL
---

## 什么是事务

假设A给B转100元，即：

```MySQL
UPDATE account SET money = money - 100 WHERE id = 1;
UPDATE account SET money = money + 100 WHERE id = 2;
```


正常情况：

```
A:1000 B:1000
↓
A:900 B:1100
```


但如果执行到一半：

```MySQL
UPDATE account SET money = money - 100WHERE id = 1;
```

成功后服务器崩了，第二条没执行，结果：

```
A:900
B:1000
```

钱凭空消失。


于是，数据库提出：

# Transaction（事务）

```MySQL
BEGIN;

UPDATE account SET money = money - 100 WHERE id = 1;
UPDATE account SET money = money + 100 WHERE id = 2;

COMMIT;
```


要求：

```
要么都成功要么都失败
```

这就是事务


## ACID


```
A Atomicity
C Consistency
I Isolation
D Durability
```


### A：Atomicity（原子性）

意思：

```
事务不可分割
```

例如转账，扣钱与加钱必须看成一个整体，不能扣钱成功加钱失败


原子性是谁实现的？
#### undo log


理解：

```
执行成功保留
执行失败回滚
```


### D：Durability（持久性）

意思：

```
事务提交后数据不能丢
```


例如：

```
COMMIT;
```

返回成功。

用户已经看见：

```
转账成功
```


这时候断电，你不能说：

```
刚刚骗你的
```


所以提交成功的数据必须存在。是谁保证？

答案：

#### redo log


```
undo log 
↓
Atomicity

redo log 
↓
Durability
```



### Consistency（一致性）


一致性：

```
事务执行前后数据满足业务规则
```


例如银行总金额：

```
A:1000 B:1000
总计2000
```


转账后：

```
A:900 B:1100
总计仍然2000
```


一致性没有被破坏。


如果：

```
A:900 B:1000
```

总计：

```
1900
```

一致性被破坏。


一致性是：

```
Atomicity+Isolation+Durability
```

共同保证的最终结果。

### Isolation（隔离性）

假设事务A：

```MySQL
BEGIN;
UPDATE account SET money = 500 WHERE id = 1;
```

但还没提交。

此时事务B：

```MySQL
SELECT * FROM account WHERE id = 1;
```

B看到 500 还是原值？

这里就出现：
### 并发问题

因为多个事务同时执行，如果不控制，数据会乱。

所以，数据库提出：

### Isolation

隔离性

目标：事务之间互不干扰

## 并发会带来什么问题

### 1.脏读

事务A：

```MySQL
BEGIN;
UPDATE user SET money = 500;
```

未提交。

事务B：

```MySQL
SELECT money;
```

看到 500

然后A回滚，实际值：100

B读到了不存在的数据。

这就是脏读


### 2.不可重复读

事务A：

```MySQL
BEGIN;
```

第一次查询：

```MySQL
SELECT money;
```

结果：100

事务B：

```MySQL
UPDATE money=200;
COMMIT;
```

事务A再次查询：

```MySQL
SELECT money;
```

结果：200

同一个事务，同一个SQL，两次结果不同，这就是不可重复读

### 3.幻读

事务A：

```MysQL
SELECT * FROM user WHERE age > 20;
```

结果：10条


事务B：

```MySQL
INSERT ...
```

新增一条。

事务A再次查询：

```MySQL
SELECT * FROM user WHERE age > 20;
```

结果：11条

突然多出一条，像出现幻觉。这就是幻读


## 隔离级别

为了解决上面问题，SQL标准提出四个隔离级别。

### Read Uncommitted

允许读未提交。

问题：脏读、不可重复读、幻读全部可能发生，所以几乎不用。

### Read Committed（RC）

只读已提交数据。

解决：

```
脏读
```


但仍有：

```
不可重复读
幻读
```


这是：

- Oracle默认
- PostgreSQL常用模式


### Repeatable Read（RR）

解决：

```
脏读
不可重复读
```


MySQL默认。


注意：很多数据库：RR仍有幻读，但InnoDB比较特殊

#### 为什么 RR 解决脏读和不可重复读？

例如事务A：

``` MySQL
BEGIN;
SELECT money FROM account WHERE id=1;
```

结果：100

事务B：

```MySQL
UPDATE account SET money=200 WHERE id=1;
COMMIT;
```


事务A再次查询：

```MySQL
SELECT money FROM account WHERE id=1;
```


为什么 RC 看到200，RR 还能看到100？

如果数据库真的把数据改掉了，那么：
- 磁盘里已经是200
- Buffer Pool里也是200

为什么事务A还能看到100？

这里就出现一个非常关键的问题：

# 数据库是不是只有一份数据？

答案：

```
不是
```


这是 MVCC 的起点。

假设有一条记录：

```
id=1
money=100
```


事务A开始：

```
BEGIN;
```

时间：

```
T1
```


事务B开始：

```
BEGIN;
```

时间：

```
T2
```


事务B修改：

```MySQL
UPDATE account 
SET money=200 
WHERE id=1;
```

然后提交。


现在数据库里：

```
money=200
```


问题：事务A为什么还能看到100？

如果数据库只有：

```
money=200
```

这一份数据,显然做不到。


所以：InnoDB干了一件很聪明的事：

##### 不覆盖旧数据

而是：

```
版本1：money=100
版本2：money=200
```

同时存在。


这就叫：

# Multi Version

多版本。


所以，MVCC全称：

```
Multi-Version Concurrency Control
```

多版本并发控制。

可以先把 MVCC 理解成 Git，例如Git里：

```
commit1
commit2
commit3
```

都存在，你不会因为 commit3 出现，就看不到 commit1

MVCC也一样，数据库会保留：旧版本+新版本

然后决定：

```
哪个事务能看到哪个版本
```


### Serializable

最严格，事务串行执行。

问题：性能极差，因此几乎不用。


|隔离级别|脏读|不可重复读|幻读|
|---|---|---|---|
|RU|有|有|有|
|RC|无|有|有|
|RR|无|无|理论有|
|Serializable|无|无|无|
