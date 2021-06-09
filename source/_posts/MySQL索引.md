---
title: MySQL索引&执行计划分析
author: bingdang
tags:
  - SQL
  - MySQL
  - 索引
categories:
  - DBA
cover: /images/img-71.png
abbrlink: 68023dec
date: 2020-04-03 15:54:00
---
### 索引的作用
提供了类似于书中目录的作用,目的是为了优化查询

![索引分类](/images/img-38.png)
### 索引的种类(算法)
* B树索引
* Hash索引
* R树
* Full text
* GIS

### B树 基于不同的查找算法分类介绍
![B+TREE 索引](/images/img-0.png)

#### B tree生成过程：
1. **leaf节点：每个page为16kb，其中均匀的存放“盒子”，盒子中存放数据。每个盒子都有自己的编号。被称为叶子节点。**

2. **internal节点：枝节点会将每个叶子节点所存放的最小值提取出来集中存放，存放的位置被称为枝节点。**

3. **root节点：提取枝节点的最小值，落到根节点上。**


#### B tree工作过程：
例如读取数据x：
1. 遍历根节点，找到符合条件的数据索引
2. 根据索引提供的对应的指向枝节点的指针找到对应的枝结点page
3. 在枝节点page中再进行比对，找到对应叶结点所在page在page中存放着数据的页码
4. 根据页码找到对应的存放数据的page


#### b+tree：
* 相邻的叶结点直接互相存在指针，减少遍历根节点和枝节点的重复劳动。相当于章节结尾的导读，优化范围查找

#### b*tree：
* 相邻枝节点也存在相互的指针，优化范围查找

![Btree](/images/img-3.png)

### 功能上的分类
#### 1）辅助索引(S)怎么构建B树结构的?
（1）辅助索引是基于表的**任意列**进行生成的【任意列】
（2）取出索引列的所有值【取出列的所有键值】
（3）进行所有键值的排序
（4）将所有的键值按顺序落到BTree索引的叶子节点上【排序后落到叶子节点上】
（5）进而生成枝节点和根节点【生成BTree索引】
（6）叶子节点除了存储键值之外，还存储了相邻叶子节点的指针，另外还会保存原表数据的指针
（辅助索引的叶子节点直接存在指针(优化范围查找)；还会保存原表数据的指针，用于查找记录）

#### 2）聚集索引(C)怎么构建B树结构的?
（1）建表时有主键列（如ID）【保证数据在数据页上的**有序**存储】
（2）表中进行数据存储，会按照ID列的顺序，有序的存储一行一行的数据到数据页(page)上(这个动作叫做聚集索引组织表：有序的使用段区页)【将有序的数据页(page)落到叶子节点上】
（3）表的数据页被作为聚集索引的叶子节点(有聚集索引的原表数据页，就是聚集索引的叶子节点)
（4）把叶子节点的主键值生成上层枝节点和根节点。
主键：（值不可重复，也不可为空（NULL），主键值不能被重用）

#### 3）既有辅助索引又有聚集索引
**辅助索引叶子节点的指针指向聚集索引-->找到对应的记录**
#### 4）只有辅助索引
**如果没有聚集索引，只有辅助索引，那么查找记录将是无序的。(相当于书有页码，但是页码是乱的你说气不气)**

#### 5）聚集索引和辅助索引构成区别总结
1. 聚集索引只能有一个,非空唯一,一般是主键      (聚集引索，唯一非空主键)
2. 辅助索引,可以有多个,是配合聚集索引使用的    (辅助引索，可多个，配合聚集引索)
3. 聚集索引叶子节点,就是磁盘的数据行有序存储的数据页
4. MySQL是根据聚集索引,组织存储数据,数据存储时就是按照聚集索引的顺序进行存储数据
5. 辅助索引,只会提取索引键值,进行自动排序生成B树结构

#### 6）辅助索引的细分

![辅助索引](/images/img-39.png)
1. 单列的辅助索引
**理想化：**
2. 联合多列辅助索引（覆盖引索）//要查的值就是索引的值 
	SQL只需要通过索引就可以返回查询所需要的数据，而不必通过二级索引查到主键之后再去查询数据。
3. 唯一索引  //唯一值多的索引列可减少索引树的遍历次数 

#### 7）辅助索引建立原则
1. 经常拿来做where条件的列 可作为辅助索引
2. 尽量拿唯一值多的列做辅助索引（减少索引树遍历的次数）

#### 8）索引树的高度
（1）数据行多， 分表
（2）索引列字符长度 ，前缀索引
（3）char > varchar  ，表设计 
（4）enum 优化索引高度，能用则用

---
### 索引管理
![索引管理](/images/img-40.png)

---
#### 1）辅助索引建立
##### 在k2列中建立索引
```bash
mysql> use;
mysql> alter table t100w add index idx_k2(k2);
		      表名                    索引名 列名  
```
##### 索引的查看：
`desc t100w;`
![desc](/images/img-41.png)
![show](/images/img-42.png)
##### 分类：
1. PRI ：主键引索
2. MUL：非唯一辅助索引
3. UNI：唯一性索引
---
#### 2）唯一索引建立
**判断指定列是否可以建立唯一索引**
##### 方法一：去重判断
![UNI](/images/img-43.png)
##### 方法二：查看是否存在重复列
![UNI](/images/img-44.png)
##### 方法三：直接建立
![UNI](/images/img-45.png)

#### 2）前缀索引（只能应用于字符串列）
`alter table city add index idx_name(name(5));`  <==取前五个字符串

---
#### 4）联合索引
##### 建立联合索引：
```bash
mysql> alter table city add index idx_co_po(countrycode,population);
```
![1](/images/img-46.png)
##### 删除联合索引：
`mysql> alter table city drop index idx_co_po;`
![2](/images/img-47.png)

---
### 执行计划分析-type分析
#### 1）作用 
 **上线新的查询语句之前，进行提前预估语句的性能
 在出现性能问题时，找到合理的解决思路**

---
#### 2）执行计划获取
```bash
mysql> desc  select * from oldboy.t100w where k2='EF12'\G
*************************** 1. row ***************************
           id: 1
  select_type: SIMPLE
        table: t100w
   partitions: NULL
         type: ref
possible_keys: idx_k2
          key: idx_k2
      key_len: 17
          ref: const
         rows: 293
     filtered: 100.00
        Extra: NULL
1 row in set, 1 warning (0.00 sec)
```
##### 重点关注
`able: t100w` |表信息
`type: ref` |索引的应用级别
`possible_keys: idx_k2` |可能会使用到的索引  
`key: idx_k2` |实际上使用的索引
`key_len: 17` |联合索引覆盖长度
`rows: 293` |查询的行数（越少越好）
`Extra: NULL` |额外的信息

---
#### 3）type：索引
##### 执行计划的分析
type          	索引的应用级别
##### ALL :全表扫描，不走索引
**原因：**没建立索引
     建立索引不走的
**以下情况可能会出现ALL的情况（查询条件不是确定值的话都可能出现ALL的情况）**
```bash
mysql> desc select * from t100w;   //查全表
mysql> desc select * from t100w where k1='aa';   //查询没有建立的索引列
（对于辅助索引）
mysql> desc select * from t100w where k2 != 'aaaa';   //不等于 模糊查询
mysql> desc select * from t100w where k2 like '%xt%';    //%模糊查询
NOT IN //不走索引
```

##### Index :全索引扫描
```bahs
mysql> desc select k2 from t100w; //这里查询的k2 就是辅助索引列
```
##### range :索引范围扫描
```bash
辅助索引 : > < >= <= like(开头不带%)受双向指针优化,in or（避免出现）
主键： != 
mysql> desc select * from world.city where countrycode like 'C%'
mysql> desc select * from world.city where id!=3000;
mysql> desc select * from world.city where id>3000;

mysql> desc select * from world.city where countrycode in ('CHN','USA'); //不推荐，双向指针优化对in不生效
改写：
desc
select * from world.city where countrycode='CHN'
union all 
select * from world.city where countrycode='USA';
```
##### ref : 辅助索引等值查询
```bash
mysql> desc select * from city where countrycode='CHN';

eq_ref ：	在多表连接查询是on的条件列是唯一索引或主键
mysql> desc select a.name,b.name ,b.surfacearea 
from city as a 
join country as b 
on a.countrycode=b.code 
where a.population <100;
```
![3](/images/img-48.png)

##### const,system : 主键或唯一键等值查询
```bash
mysql> DESC select * from city where id=10;
```
---
#### 4）Extra
`using filesort`：只要出现此提示，一般是where条件和order by条件没有一起建立联合索引导致的
where走了索引 但是后面的order by条件数据库要给他重新排序，比较消耗计算机资源
**//首先考虑建立联合索引**

##### 联合索引建立前：
![4](/images/img-49.png)
##### 联合索引建立后：
![5](/images/img-50.png)

---
#### key_len: <==针对字符
```bash
desc 
         字符长度		key_len（有设置not null）         key_len（没设置设置not null）
latin1     1          char(10)*1 + not null    =10       char(10)*1  =10+1
utf8       3	      char(10)*3 + not null    =30	   char(10)*3  =30+1
gbk        2          char(10)*2 + not null    =20
utf8mb4    4	      char(10)*4 + not null    =40	
```
##### 扩展：
**key_len 到底长好  还是短好？**
* 维度一： 索引列的列值长度来看
越短越好，一般针对前缀索引（前缀索引好处：1.参差不齐的列均匀都规整起来。2.列值长度限制在一定范围）

* 维度二： 从联合索引覆盖长度来看
覆盖长度越长越好

#### explain(desc)使用场景（面试题）
**题目意思:  我们公司业务慢,请你从数据库的角度分析原因**
 1. mysql出现性能问题,我总结有两种情况:
  （1）应急性的慢：突然夯住
**应急情况:数据库hang(卡了,资源耗尽)**
处理过程:
 1. show processlist;  获取到导致数据库hang的语句
 2. explain 分析SQL的执行计划,有没有走索引,索引的类型情况
 3. 建索引,改语句
---

### 索引应用规范
业务
 1. 产品的功能
 2. 用户的行为
"热"查询语句 --->较慢--->slowlog
"热"数据

#### 1）建立索引的原则（DBA运维规范）
##### 说明
为了使索引的使用效率更高，在创建索引时，必须考虑在哪些字段上创建索引和创建什么类型的索引。
那么索引设计原则又是怎样的?

##### 1.1）(必须的) 建表时一定要有主键,一般是个无关列
略.回顾一下,聚集索引结构.

##### 1.2）选择唯一性索引
 - 唯一性索引的值是唯一的，可以更快速的通过该索引来确定某条记录。
例如，学生表中学号是具有唯一性的字段。为该字段建立唯一性索引可以很快的确定某个学生的信息。
如果使用姓名的话，可能存在同名现象，从而降低查询速度。

优化方案:
```bash
(1) 如果非得使用重复值较多的列作为查询条件(例如:男女),可以将表逻辑拆分
(2) 可以将此列和其他的查询类,做联和索引
select count(*) from world.city;
select count(distinct countrycode) from world.city;
select count(distinct countrycode,population ) from world.city;
```

##### 1.3）(必须的) 为经常需要where 、ORDER BY、GROUP BY,join on等操作的字段，排序操作会浪费很多时间。
```bash
where  A B C      ----》 A  B  C
in 
where A   group by B  order by C
A,B，C

WHERE A、GROUP BY B、ORDER BY C
 1. 建立联合索引 
 2. (A,B,C) //严格按照子句的执行顺序建立，不等值的情况尽量避免
```
如果为其建立索引，优化查询
 - **注：如果经常作为条件的列，重复值特别多，可以建立联合索引。**

##### 1.4）尽量使用前缀来索引
 - **如果索引字段的值很长，最好使用值的前缀来索引。**

##### 1.5）限制索引的数目
**索引的数目不是越多越好。**
可能会产生的问题:
 - 1）每个索引都需要占用磁盘空间，索引越多，需要的磁盘空间就越大。
 - 2）修改表时，对索引的重构和更新很麻烦。越多的索引，会使更新表变得很浪费时间。（增删改索引会涉及到短时间的锁表）
 - 3）优化器的负担会很重,有可能会影响到优化器的选择.
percona-toolkit中有个工具,专门分析索引是否有用

##### 1.6）删除不再使用或者很少使用的索引(percona toolkit)
pt-duplicate-key-checker

表中的数据被大量更新，或者数据的使用方式被改变后，原有的一些索引可能不再需要。数据库管理
员应当定期找出这些索引，将它们删除，从而减少索引对更新操作的影响。

##### 1.7）大表加索引,要在业务不繁忙期间操作（涉及到锁表和排序）
##### 尽量少在经常更新值的列上建索引，10万行以下的表不需要建索引

##### 1.8）建索引原则
 - (1) 必须要有主键,如果没有可以做为主键条件的列,创建无关列
 - (2) 经常做为where条件列  order by  group by  join on, distinct 的条件(业务:产品功能+用户行为)
 - (3) 最好使用唯一值多的列作为索引,如果索引列重复值较多,可以考虑使用联合索引
 - (4) 列值长度较长的索引列,我们建议使用前缀索引.
 - (5) 降低索引条目,一方面不要创建没用索引,不常使用的索引清理,percona toolkit(xxxxx)
 - (6) 索引维护要避开业务繁忙期

##### 1.9）关于联合索引 *****
 - (1) where A、GROUP BY B、ORDER BY C   ---> (A,B,C)//联合索引顺序
 - (2) where  A B C  
   - (2.1) 都是等值 ,在5.5 以后无关索引顺序，把控一个原则唯一值多的列放在联合索引的最左侧
   - (2.2) 如果有不等值，例如以下情况
		 select where  A= and  B> and  C=
		 索引顺序，ACB ，语句改写为 ACB
         
### 不走索引情况
#### 1.没有查询条件，或者查询条件没有建立索引
```bash
select * from tab;       全表扫描。
select  * from tab where 1=1;
```
- 1、对用户查看是非常痛苦的。
- 2、对服务器来讲毁灭性的。

```bash
SQL改写成以下语句：
select  * from  tab  order by  price  limit 10 ;         需要在price列上建立索引
select  * from  tab where name='zhangsan'          name列没有索引
```
改：
- 1、换成有索引的列作为查询条件
- 2、将name列建立索引

#### 2.查询结果集是原表中的大部分数据，应该是25％以上。
**查询的结果集，超过了总数行数25%，优化器觉得就没有必要走索引了。**
假如：tab表 `id，name`    id:1-100w  ，id列有(辅助)索引
`select * from tab  where id>500000;`
**解决方案：**
- 如果业务允许，可以使用limit控制。
怎么改写 ？
- 结合业务判断，有没有更好的方式。如果没有更好的改写方案
- 尽量不要在mysql存放这个数据了。放到redis里面。

#### 3.索引本身失效，统计数据不真实
- 1.索引有自我维护的能力。
- 2.对于表内容变化比较频繁的情况下，有可能会出现索引失效（来不及更新索引信息，优化器选择一次后发现不行以后就不会选择该索引）。
**解决方案：**一般是删除重建
**现象：**有一条select语句平常查询时很快,突然有一天很慢,会是什么原因
select?  --->索引失效，统计数据不真实
DML ?   --->锁冲突，资源耗尽

#### 4.查询条件使用函数在索引列上，或者对索引列进行运算，运算包括(+，-，*，/，! 等)
**造成原因：**条件列中出现运算则会不走索引
例子：
错误的例子：`select * from test where id-1=9;`
正确的例子：`select * from test where id=10;`

#### 5.隐式转换导致索引失效.这一点应当引起重视.也是开发中经常会犯的错误.
这样会导致索引失效. 错误的例子：
**造成原因：**查询的列中带有函数操作，直接全表扫描
```bash
mysql> alter table tab add index inx_tel(telnum);   //在电话号码创建辅助索引
Query OK, 0 rows affected (0.03 sec)
Records: 0  Duplicates: 0  Warnings: 0
mysql> desc tab;
+--------+-----------------+--------+-------+----------+-------+
| Field   | Type             | Null   | Key  | Default | Extra |
+--------+-----------------+--------+-------+----------+-------+
| id         | int(11)          | YES  |          | NULL   |           |
| name   | varchar(20) | YES  |         | NULL   |           |
| telnum | varchar(20) | YES  | MUL | NULL   |           |  //此页为字符串类型
+--------+-----------------+--------+-------+----------+-------+

mysql> select * from tab where telnum='1333333';   //带引号的查询，走索引
+------+------+---------+
| id  | name | telnum  |
+------+------+---------+
|    1 | a    | 1333333 |
+------+------+---------+
1 row in set (0.00 sec)
mysql> select * from tab where telnum=1333333;  //不带引号的查询，mysql将数字类型的查询转为了字符串类型，造成了查询列中带有函数操作，所以不走索引
+------+------+---------+
| id  | name | telnum  |
+------+------+---------+
|    1 | a    | 1333333 |
+------+------+---------+
1 row in set (0.00 sec)

mysql> explain  select * from tab where telnum='1333333';
+----+-------------+-------+------+---------------+---------+---------+-------+------+-----------------------+
| id | select_type | table | type | possible_keys | key    | key_len | ref  | rows | Extra                |
+----+-------------+-------+------+---------------+---------+---------+-------+------+-----------------------+

|  1 | SIMPLE      | tab  | ref  | inx_tel      | inx_tel | 63      | const |    1 | Using index condition |
+----+-------------+-------+------+---------------+---------+---------+-------+------+-----------------------+
1 row in set (0.00 sec)
mysql> explain  select * from tab where telnum=1333333;
+----+-------------+-------+------+---------------+------+---------+------+-----+-------------+
| id | select_type | table | type | possible_keys | key  | key_len | ref  | rows | Extra      |
+----+-------------+-------+------+---------------+------+---------+------+-----+-------------+
|  1 | SIMPLE      | tab  | ALL  | inx_tel      | NULL | NULL    | NULL |    2 | Using where |
+----+-------------+-------+------+---------------+------+---------+------+-----+-------------+
```
#### 6.单独的>,<(防止出现结果集大于全表25%)   ,in 有可能走，也有可能不走，和结果集有关，尽量结合业务添加limit
`or`或`in`尽量改成`union`
```bash
EXPLAIN  SELECT * FROM teltab WHERE telnum  IN ('110','119');
改写成：
EXPLAIN SELECT * FROM teltab WHERE telnum='110'
UNION ALL
SELECT * FROM teltab WHERE telnum='119'
```
**原因：改写后索引的应用级别高**

#### 7.like "%_" 百分号在最前面不走（针对字符串列）
```bash
EXPLAIN SELECT * FROM teltab WHERE telnum LIKE '31%'  走range索引扫描
EXPLAIN SELECT * FROM teltab WHERE telnum LIKE '%110'  不走索引
%linux%类的搜索需求，可以使用elasticsearch+mongodb 专门做搜索服务的数据库产品
```
