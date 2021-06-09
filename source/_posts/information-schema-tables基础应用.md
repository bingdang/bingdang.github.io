---
title: information_schema.tables基础应用
author: 饼铛
tags:
  - mysql备份
  - MySQL
categories:
  - DBA
cover: /images/img-71.png
abbrlink: 5234d9e2
date: 2019-04-17 18:57:00
---
### 1.information_schema.tables基础应用

![information_schema](/images/img-36.png)

### 虚拟库
##### 创建视图：
```bash
CREATE VIEW test AS SELECT world.city.`Name`,world.country.`Code`,world.city.Population 
FROM world.city
JOIN world.country
ON world.city.CountryCode = world.country.`Code`
WHERE world.city.Population<100;
```
##### 调用视图：
```bash
SELECT * FROM test;
```
#### 元数据？ 
  ----> “基表”（无法直接查询和修改的）
  ----> DDL 进行元数据修改
  ----> show ,desc(show),information_schema(全局类的统计和查询)


### information_schema
```bash
DESC information_schema.tables;
重要列：
TABLE_SCHEMA       #表所在的库
TABLE_NAME         #表名
ENGINE             #表的存储引擎
TABLE_ROWS         #表的行数
AVG_ROW_LENGTH     #平均行长度
INDEX_LENGTH       #索引的长度
```
---
##### 1.要查询整个数据库下，所有库和对应的表名。
```bash
SELECT table_schema,table_name
FROM information_schema.tables;
```
---
##### 2.查询world和school，下所有表
```bash
SELECT table_schema,GROUP_CONCAT(table_name) 
FROM information_schema.tables
WHERE table_schema='world' OR table_schema='school'
GROUP BY table_schema;
改写：
SELECT table_schema,table_name 
FROM information_schema.tables
WHERE table_schema='world'
UNION ALL 
SELECT table_schema,table_name 
FROM information_schema.tables
WHERE table_schema='school';
```
---
##### 3.统计一下每个库下的表的个数。
```bash
SELECT table_schema,COUNT(table_name)
FROM information_schema.tables
GROUP BY table_schema;
```
---
##### 4.查询整个数据库中所有的库对应的表名，每个库显示成一行
```bash
SELECT table_schema,GROUP_CONCAT(table_name) 
FROM information_schema.tables
GROUP BY  table_schema;
```
---
##### 5.统计每表数据用量
公式：
`每张表的数据量=AVG_ROW_LENGTH(平均行长度)*TABLE_ROWS(行数)+INDEX_LENGTH(引索长度)
SELECT`
```bash
select TABLE_SCHEMA,table_name,(AVG_ROW_LENGTH*TABLE_ROWS+INDEX_LENGTH)/1024/1024 AS mb
from information_schema.tables
WHERE TABLE_SCHEMA NOT IN('sys','performance','information_schema') 
ORDER BY mb DESC;

SELECT AVG_ROW_LENGTH,TABLE_ROWS,INDEX_LENGTH FROM information_schema.tables;
```
---
##### 6.统计一下每个库的真实数据量
```bash
SELECT TABLE_SCHEMA,count(table_name),SUM(AVG_ROW_LENGTH*TABLE_ROWS+INDEX_LENGTH)/1024/1024 AS total_mb
FROM information_schema.tables
GROUP BY TABLE_SCHEMA;

// 统计出每表数据用量，更具库名进行站队，计算每库下表的个数以及库下的每表数据量之和。
```
---
##### 7.总数据量
```bash
（平均行长度所有列之和*平均行数所有列之和+引索长度所有列之和）
SELECT SUM(AVG_ROW_LENGTH*TABLE_ROWS+INDEX_LENGTH)/1024/1024 AS total_mb
FROM information_schema.tables;
```
---
##### 8.CONCAT()拼接函数示例：
```bash
SELECT CONCAT(USER,"@",HOST)
FROM mysql.user;
```
---
##### 9.生产需求:单库单表备份
```bash
mysqldump -uroot -p123  world city >/tmp/world_city.sql
--- 模仿以上命令，对整个数据库下的1000张表进行单独备份，
--- 排除sys(5.6没有)，performance，information_schema
```
---
###### 批量分表备份：
**1：生成拼接语句**
```bash
SELECT CONCAT("mysqldump -uroot -p123  ",table_schema," ",table_name," >/tmp/",table_schema,"_",table_name,".sql")  
FROM information_schema.tables 
WHERE table_schema NOT IN('sys','performance','information_schema')  #排除库
INTO OUTFILE '/tmp/bak.sh';  #<导出脚本
```
**2：解除mysql导出限制**
```bash
vim /etc/my.cnf 
secure-file-priv=/tmp
```
**3：重启数据库已生效配置**
`/etc/init.d/mysqld restart`
---
###### 批量执行语句
例子：模仿以下语句，批量实现world下所有表的操作语句生成
`alter table world.city discard tablespace;`

```bash
select concat("alter table ",table_schema,".",table_name,"discard tablespace;") 
from information_schema.tables 
where table_schema='world'
into outfile '/tmp/discard.sql';
```
