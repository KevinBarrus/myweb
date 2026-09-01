---
title: 字节 Agent 开发一面手撕解析
createdAt: 2026-08-30 20:30
updatedAt: 2026-08-31 21:59
tags:
  - 面试
  - 算法
---

## 2026.8.27 字节 Agent 开发一面手撕解析

### 题目

```text
合并嵌套 JSON

Question description

给定两个嵌套结构的 JSON 数据，实现合并函数。规则：

键值对（dict）：递归合并相同 key，仅在一个字典中的 key 直接保留

列表（list）：拼接（json1 列表 + json2 列表）

整数 / 浮点数（int/float）：相加（json1 值 + json2 值）

字符串（str）：拼接（json1 字符串 + json2 字符串）

布尔值（bool）：取逻辑真（只要其一为 True 则结果为 True）

其他类型（如 None）：以 json2 的值覆盖 json1。

要求：返回合并后的新 JSON，不修改原始数据。

示例 1（多类型合并含列表）：

输入：

json1 = {"a": 1, "b": [1,2,3], "c": False, "d": 2.5}
json2 = {"a": 2, "b": [3,4,5], "c": True, "d": 3.5}

输出：

{"a": 3, "b": [1,2,3,4,5], "c": True, "d": 6.0}

示例 2（多层嵌套 + 列表）：

输入：

json1 = {"x": {"y": {"z": [10,20], "m": [1]}}}
json2 = {"x": {"y": {"z": [20,30], "m": [2], "n": None}}}

输出：

{"x": {"y": {"z": [10,20,30], "m": [1,2], "n": None}}}
```

说明：面试题将输入称为“JSON”，但原始样例使用了 `False`、`True`、`None`，它们是 Python 字面量，不是严格 JSON 文本中的 `false`、`true`、`null`。下文将 `json1`、`json2` 视为已解析的 Python 嵌套对象，并用 `ast.literal_eval` 复现该题面的输入格式；若输入是严格 JSON 文本，应改用 `json.loads`。

注：关于列表合并规则，题目描述为“拼接”，但给定样例表现出重复元素需要去除，因此本文按照样例实现为“稳定拼接去重”，即保留首次出现的元素并维持原有顺序。

### 1. 整体思路

JSON 具有递归结构：一个 `dict` 的 `value` 仍然可能是 `dict` 或 `list`。因此，当两个输入在同一 `key` 上均存在 `value` 时，无法仅在当前层决定最终结果，而需要对两个 `value` 再次应用相同的合并规则。由此可以自然地将 `merge_json(a, b)` 定义为递归函数。

六种情况及其处理规则如下：

| 条件 | 结果 |
| --- | --- |
| `a`、`b` 都是 `dict` | 递归合并 |
| `a`、`b` 都是 `list` | 拼接后稳定去重 |
| `a`、`b` 都是 `bool` | `a or b` |
| `a`、`b` 都是 `int` / `float` | `a + b` |
| `a`、`b` 都是 `str` | `a + b` |
| 其他情况 | `b` 覆盖 `a` |

### 2. 关键边界条件

#### 2.1 bool 的判断要放在 int/float 的前面

在 Python 中，`bool` 是 `int` 的子类，因此 `isinstance(True, int)` 和 `isinstance(False, int)` 均为 `True`。如果数值类型判断仅使用 `isinstance(x, (int, float))`，布尔值也会满足该条件。因此，应当优先处理 `bool`，或者在数值分支中显式排除 `bool`。

#### 2.2 不修改原始 JSON（深浅拷贝的问题后文讲）

返回一个新 JSON 不只是最外层 `dict` 要新建，里面嵌套的 `list`、`dict` 也不能和原数据共享同一个对象。比如：

```python
json1 = {
    "a": {
        "b": [1, 2, 3]
    }
}
```

如果你这样写：

```python
res = {}
res["a"] = json1["a"]
```

看起来 `res` 是一个新字典，但实际上 `res["a"] is json1["a"]` 结果是 `True`。也就是说，它们里面的 "a" 指向的是同一个 `dict` 对象。于是你执行 `res["a"]["b"].append(4)`，此时，再看 `json1`：

```python
{
    "a": {
        "b": [1, 2, 3, 4]
    }
}
```

这就违反了题目的要求：返回合并后的新 JSON，不修改原始数据。如果你只是执行 `res["a"] = json1["a"]`，那么只是多创建了一个引用，里面的数据并没有复制。所以修改 `res` 里面的嵌套对象，实际上是修改 `json1` 里面的对象。浅拷贝也解决不了嵌套问题，比如：

```python
res = json1.copy()
```

或者：

```python
res = dict(json1)
```

最外层确实不同：`res is json1` 结果确实为 `False`，但是 `res["a"] is json1["a"]` 的结果为 `True`。所以 `res["a"]["b"].append(4)` 依然会修改 `json1`。

这就是浅拷贝的含义：只复制第一层容器，内部对象仍然共享。`deepcopy` 会递归处理嵌套对象：

```python
import copy

res = copy.deepcopy(json1)
```

此时：
- `res is json1` 结果为 `False`
- `res["a"] is json1["a"]` 结果也为 `False`
- `res["a"]["b"] is json1["a"]["b"]` 同样为 `False`

`deepcopy` 会递归处理嵌套对象，并为需要复制的可变对象构造独立副本。此时，结果中的嵌套可变对象不再与输入共享相同引用。

所以 `res["a"]["b"].append(4)` 之后：

```python
print(res)
# {'a': {'b': [1, 2, 3, 4]}}

print(json1)
# {'a': {'b': [1, 2, 3]}}
```

原数据完全不受影响。

回到这道 JSON 合并题，最容易出问题的是这一种情况：

```python
json1 = {
    "a": 1
}

json2 = {
    "a": 2,
    "config": {
        "items": [1, 2]
    }
}
```
`config` 只存在于 `json2`，如果你写：

```python
res["config"] = json2["config"]
```

结果虽然看起来正确：

```python
res = {
    "a": 3,
    "config": {
        "items": [1, 2]
    }
}
```

但实际上：

```python
res["config"] is json2["config"]
# True
```

于是之后：

```python
res["config"]["items"].append(3)
```

会导致 `json2` 也被修改。

所以应该：

```python
res["config"] = copy.deepcopy(json2["config"])
```

为什么 `int`、`str`、`bool` 通常不用担心？因为它们是不可变对象。例如：

```python
a = 10
b = a
```

`b = 20` 不会把 `a` 改成 20。字符串也一样：

```python
a = "hello"
b = a

b += " world"
```

结果：

```python
a
# "hello"

b
# "hello world"
```

这是因为 Python 实际上给 `b` 指向了一个新的字符串，而不是在原字符串上修改。真正需要警惕的是：`dict`、`list`、`set` 以及其他可变对象。而 JSON 里的复杂结构主要就是 `dict` 和 `list`。

所以面试时要说明这个坑：题目要求不修改原始 JSON，所以不能让结果里的嵌套 `dict` 和 `list` 与输入共享引用。普通赋值甚至浅拷贝都只能复制引用，因此对于直接保留或覆盖的复合值，应当使用 `deepcopy`，避免结果中的嵌套可变对象与输入共享引用。


### 3. 用 C/C++ 的对象与指针理解

#### 3.1 可以用 C++ 里的指针建立心智模型

比如：
```python
a = [1, 2, 3]
b = a
```

不要把它理解成 `a` 里面存着 `[1,2,3]`，b 又复制了一份 `[1,2,3]`。实际上更接近：

```text
a --> [1, 2, 3]  (Python heap object)
b --> [1, 2, 3]  (same object)
```

所以 `a is b` 结果为 `True`。用 C++ 的思维近似理解：

```cpp
vector<int>* a = new vector<int>{1, 2, 3};
vector<int>* b = a;
```

当然 CPython 内部实现比这个复杂，但这个心智模型有助于我们理解。

#### 3.2 `list`、`dict` 保存的是对其他 Python 对象的引用，而不是递归地将对象值直接嵌入容器本身

这是理解浅拷贝的关键。例如：

```python
a = [
    [1, 2],
    [3, 4]
]
```

你可能下意识想象：

```text
a --> [[1, 2], [3, 4]]
```

但更准确的模型是：

```text
a --> outer list
outer list[0] --> [1, 2]
outer list[1] --> [3, 4]
```

外层 `list` 保存的是指向内部 Python 对象的引用。可以粗略类比 C++：

```cpp
vector<vector<int>*> a;
```

注意只是帮助理解，不代表 Python 的 `list` 真就是这个 C++ 类型。

#### 3.3 浅拷贝：创建一个新容器，然后复制里面的引用

现在：

```python
import copy

a = [
    [1, 2],
    [3, 4]
]

b = copy.copy(a)
```

Python 做的事情可以理解成：

**第一步：创建新的外层 list**

```text
a --> List A
b --> List B
```

所以 `a is b` 结果为 `False`。

**第二步：把 A 里面的引用复制给 B**

最终：

```text
a --> List A
b --> List B
List A[0] --> [1, 2] <-- List B[0]
List A[1] --> [3, 4] <-- List B[1]
```

所以 `a is b` 结果为 `False`，但是 `a[0] is b[0]` 结果为 `True`。这就是所谓的浅拷贝只复制第一层。

更精确地说，其实不是“规定只复制第一层”，而是：浅拷贝只创建一个新的最外层容器，容器中保存的元素引用原样复制，不递归复制引用指向的对象。


#### 3.4 为什么修改 `b[0]` 会影响 `a`？

现在：

```python
b[0].append(100)
```

注意这句话不是修改 `b`，而是通过 `b[0]` 找到它指向的内部 `list`，然后修改那个 `list`。而 `a[0]`、`b[0]` 恰好指向同一个对象。

所以 `print(a)` 得到：

```python
[
    [1, 2, 100],
    [3, 4]
]
```

因为实际上发生的是：

```text
a[0] --> [1, 2] <-- b[0]
                 append(100)
```

#### 3.5 这个操作为什么不会影响 `a`？

此时 `a` 不会变化，因为我们没有修改原来的 `[1, 2]`，只是让 `b[0]` 换了一个引用。原来：

```text
a[0] --> [1, 2] <-- b[0]
```

执行 `b[0] = [100, 200]` 之后，`a[0]` 指向 `[1, 2]`，`b[0]` 指向 `[100, 200]`；二者不再指向同一个对象。所以：

```python
print(a)
# [[1, 2], [3, 4]]

print(b)
# [[100, 200], [3, 4]]
```

这个区别非常重要：`b[0].append(100)` 通过 `b[0]` 获取内部 `list` 对象，并对该对象执行原地修改；`b[0] = [100]` 则修改外层容器 `b` 在索引 0 处保存的对象引用。

#### 3.6 `deepcopy` 的递归复制机制

现在：

```python
b = copy.deepcopy(a)
```

它不只是创建新的外层 `List B`，而是继续往下递归。发现：

```text
a --> list --> nested list
```

于是内部 `list` 也复制。最终：

```text
a --> List A --> List X  [1, 2]
             --> List Y  [3, 4]

b --> List B --> List X' [1, 2]
             --> List Y' [3, 4]
```

因此：
- `a is b` 结果为 `False`
- `a[0] is b[0]` 结果为 `False`
- `a[1] is b[1]` 结果为 `False`

于是 `b[0].append(100)` 修改的是 `List X'`，而 `a[0]` 指向 `List X`，完全不是一个对象。

#### 3.7 与 C++ 对象复制模型的对比

假设我们自己设计：

```cpp
struct Node {
    vector<int>* data;
};
```

然后：

```cpp
Node a;
a.data = new vector<int>{1, 2, 3};
```

浅拷贝类似 `Node b = a`，结果：

```text
a.data --> vector{1, 2, 3} <-- b.data
```

即 `a.data == b.data`。

深拷贝则类似：

```cpp
Node b;
b.data = new vector<int>(*a.data);
```

结果：
```text
a.data --> vector A {1, 2, 3}
b.data --> vector B {1, 2, 3}
```
Python 的 `copy.copy(a)` 和 `copy.deepcopy(a)` 的本质区别就可以这样理解。

#### 3.8 `deepcopy` 与底层内存复制的区别

假设：

```python
a = {
    "x": [
        {"name": "Kevin"}
    ]
}
```
对象关系实际上是：

```text
dict --> list --> dict --> str
```

`deepcopy(a)` 不是简单地分配一块连续内存后执行 `memcpy(...)`，而更接近：

```text
copy outer dict
  --> find a list value
  --> copy list
  --> find a dict element
  --> copy dict
  --> continue recursively
```

也就是说 `deepcopy` 是递归复制对象图，而不是简单复制一段连续内存。而且 Python 对象本来也不保证 `dict` + `list` + `dict` 连续存储在一块内存里。

#### 3.9 `deepcopy` 对不可变对象的处理
例如：

```python
import copy

a = "hello"
b = copy.deepcopy(a)

print(a is b)
```

你可能以为结果一定为 `False`，但实际上完全可能为 `True`。因为字符串是不可变对象，没有必要重新复制。同理 `int`、`float`、`str`、`bool`、`None` 这些不可变对象可以安全共享。

`deepcopy` 主要需要为 `list`、`dict`、`set` 以及自定义可变对象等构造独立副本。

#### 3.10 回到本题

例如：

```python
json1 = {
    "config": {
        "ports": [8000, 8080]
    }
}
```

你写 `res = json1.copy()`，结构实际上是：

```text
json1 --> outer dict A --> config dict --> ports list
res   --> outer dict B --> config dict --> ports list
```

只有外层 `dict A` 和外层 `dict B` 是两个不同对象。内部的 `config dict` 和 `ports list` 还是共享的。

而 `res = copy.deepcopy(json1)` 才类似：

```text
json1 --> dict A --> config A --> ports A
res   --> dict B --> config B --> ports B
```

两个对象图真正分离。

最后建立一个非常重要的 Python 心智模型：以后看到 Python 中的 `a = xxx`，不要想成：“把 xxx 这个值装进变量 a”。而是更接近：“让名字 a 引用一个 Python 对象”。

于是 `b = a` 是再增加一个指向同一对象的引用。`b = copy.copy(a)` 是新建最外层对象，但里面保存的引用仍然复制过去。`b = copy.deepcopy(a)` 是递归复制整个可变对象图，让内部可变对象也尽可能与原对象解耦。

### 4. 解题代码

```python
import copy
import ast

def merge_json(a, b):
    # 1. dict：递归合并
    if isinstance(a, dict) and isinstance(b, dict):
        res = {}

        # 先处理 json1
        for key, value in a.items():
            if key in b:
                # 两者有相同的 key，继续合并
                # 之所以要继续合并，是因为这个 key 的 value 的类型是任意的，因此需要递归
                res[key] = merge_json(value, b[key])
            else:
                # json1 有 json2 没有的 key，需要深拷贝
                res[key] = copy.deepcopy(value)

        # 剩下的是 json2 独有的 key
        for key, value in b.items():
            if key not in a:
                # 同理，需要深拷贝
                res[key] = copy.deepcopy(value)

        return res

    # 2. list：拼接 + 去重
    if isinstance(a, list) and isinstance(b, list):
        res = []

        for x in a + b:
            # 去重
            if x not in res:
                # list 内的元素可能还是 list 或 dict，因此也要深拷贝
                res.append(copy.deepcopy(x))
        return res

    # 3. bool 必须放在 int/float 前面，因为 bool 是 int 的子类
    if isinstance(a, bool) and isinstance(b, bool):
        return a or b

    # 4. int/float，注意防止出现一个为 bool 一个为 int/float 的情况
    if (
        isinstance(a, (int, float))
        and not isinstance(a, bool)
        and isinstance(b, (int, float))
        and not isinstance(b, bool)
    ):
        return a + b

    # 5. str
    if isinstance(a, str) and isinstance(b, str):
        return a + b

    # 6. 其它情况：json2 覆盖 json1
    # 例如 a 为 None，b 为 list 或 dict，因此需要深拷贝
    # 或者是类型不匹配的情况，也会走到这一步
    return copy.deepcopy(b)

def solve():
    # 本地测试入口：case1.txt 的两行分别为 "json1 = ..."、"json2 = ..."。
    # 面试题本身只要求实现 merge_json，不规定文件输入格式。
    with open("case1.txt", "r", encoding="utf-8") as f:
        line1 = f.readline().strip()
        line2 = f.readline().strip()

    json1 = ast.literal_eval(line1.split("=", 1)[1].strip())
    json2 = ast.literal_eval(line2.split("=", 1)[1].strip())

    ans = merge_json(json1, json2)

    print(ans)


if __name__ == "__main__":
    solve()
```

#### 4.1 测试用例 1

**输入：**

```text
json1 = {"a": 1, "b": [1, 2, 3], "c": False, "d": 2.5}
json2 = {"a": 2, "b": [3, 4, 5], "c": True, "d": 3.5}
```

**输出：**

```python
{"a": 3, "b": [1, 2, 3, 4, 5], "c": True, "d": 6.0}
```

#### 4.2 测试用例 2

**输入：**

```text
json1 = {"x": {"y": {"z": [10, 20], "m": [1]}}}
json2 = {"x": {"y": {"z": [20, 30], "m": [2], "n": None}}}
```

**输出：**

```python
{"x": {"y": {"z": [10, 20, 30], "m": [1, 2], "n": None}}}
```

### 5. 复杂度分析

假设两个 JSON 的总规模为 $N$，最大嵌套深度为 $D$。这里的 $N$ 表示整个嵌套 JSON 中所有节点的总数。

对于 `dict`，键查询的平均时间复杂度为 $O(1)$。如果 `list` 仅执行直接拼接，那么递归合并整体上只需要遍历输入 JSON，因此时间复杂度为 $O(N)$。

当前实现还需要对 `list` 进行稳定去重。对于长度为 $k$ 的列表，`x not in res` 最多需要线性扫描已有结果；如果暂时将单个元素的相等性比较视为 $O(1)$，则该列表的去重最坏需要 $O(k²)$。

实际上，JSON 列表中的元素还可能是嵌套的 `list` 或 `dict`，此时相等性比较本身也可能递归检查内部结构。因此，$O(k^2)$ 只描述外层成员查询次数，而不是任意嵌套 JSON 下的完整比较成本。若以整个输入 JSON 的总规模 $N$ 计，可以将当前实现的最坏时间复杂度粗略上界记为 $O(N^2)$。

空间方面，由于题目要求不修改原始 JSON，需要构造新的结果，因此结果本身需要 $O(N)$ 空间；递归调用栈最多需要 $O(D)$ 空间。因此总辅助空间可写为 $O(N+D)$，若将输出结果空间单独计算，则递归栈的额外空间为 $O(D)$。

### 6. 优化方向

如果面试官要求继续优化，可以考虑使用哈希结构优化 `list` 去重。当前使用 `x not in res` 进行判重，每次需要线性扫描 `res`，单次判重为 $O(k)$，因此最坏情况下 `list` 去重为 $O(k²)$。若暂时将单个元素的相等性比较视为 $O(1)$，长度为 $k$ 的列表使用线性成员查询进行去重时，最坏时间复杂度为 $O(k^2)$。对于嵌套 `list` 或 `dict` 元素，相等性比较本身还可能产生额外开销。

可以增加一个 `seen` 哈希集合，将判重查询优化到平均 $O(1)$。但 `JSON list` 中的元素可能仍然是 `list` 或 `dict`，而它们在 Python 中不可哈希，因此不能直接执行 `seen.add(x)`。

可以递归地将 JSON 元素转换为 canonical、hashable representation：例如将 `list` 转换为由各元素规范化结果组成的 `tuple`，将 `dict` 转换为按 `key` 排序后的 `(key, value)` 键值对组成的 `tuple`，再将该表示加入 `seen`。

需要注意，生成 canonical representation 本身也需要遍历嵌套 JSON，`dict` 的规范化还可能涉及排序，因此优化的是判重查询过程，不能简单认为整个算法就从 $O(k^2)$ 变成了 $O(k)$。

**名词解释：**

- hashable representation：把原本不能放进 `set` 或当作 `dict key` 的 JSON 对象，转换成一个可以哈希的等价形式。
- canonical representation：进一步要求内容相同的 JSON，无论原来的表示顺序如何，都转换成完全相同的标准形式。
