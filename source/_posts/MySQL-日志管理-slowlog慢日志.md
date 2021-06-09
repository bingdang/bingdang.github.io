---
title: 'MySQL-日志管理[slowlog慢日志]'
author: 饼铛
cover: /images/img-71.png
tags:
  - MySQL
  - 日志管理
categories:
  - DBA
abbrlink: 62bf20bb
date: 2020-04-16 13:14:00
---
### 1. 优化相关日志-slowlog
#### 1.2 作用
* **记录慢SQL语句的日志,定位低效SQL语句的工具日志**

#### 1.3开启慢日志
* 开关:
  * `slow_query_log=1 `
* 文件位置及名字 
  * `slow_query_log_file=/data/mysql/slow.log`
* 设定慢查询时间:
  * `long_query_time=0.1`
* 没走索引的语句也记录:
  * `log_queries_not_using_indexes`

##### 1.3.1慢日志默认位置:
```bash
mysql> select @@slow_query_log_file;
+-------------------------------+
| @@slow_query_log_file         |
+-------------------------------+
| /data/3307/data/db01-slow.log |
+-------------------------------+
```

##### 1.3.2慢日志记录容忍度：
```bash
mysql> select @@long_query_time;
+-------------------+
| @@long_query_time |
+-------------------+
|         10.000000 |
+-------------------+
```

##### 1.3.3慢日志配置参数：
```bash
vim /data/3307/my.cnf
slow_query_log=1 #开启慢日志开关
slow_query_log_file=/data/3307/slow.log  #定义日志位置和名字
long_query_time=0.1  #定义慢查询时间阈值，超过0.1s的语句记录慢日志
log_queries_not_using_indexes #没走索引的查询，记录慢日志

重启mysql生效：

进入数据库：查看参数是否生效
mysql> show variables like 'long_query_time';
```

#### 1.4模拟慢日志
模拟慢查询语句
`create table city1 select * from city; `
把city表查询到的数据导入到新创建的city1里面，去查看slow.log 会发现里面有这条的记录
```bash
mysql> create table city2 select * from city;
ERROR 1786 (HY000): Statement violates GTID consistency: CREATE TABLE ... SELECT.
原因：
enforce_gtid_consistency=true 功能导致的，MySQL官方解释说当启用 enforce_gtid_consistency 功能的时候，MySQL只允许能够保障事务安全，并且能够被日志记录的SQL语句被执行，像create table … select 和 create temporarytable语句，以及同时更新事务表和非事务表的SQL语句或事务都不允许执行。

解决方法：
    1.方法一（推荐）：
        修改 ：SET @@GLOBAL.ENFORCE_GTID_CONSISTENCY = off;
        配置文件中 ：ENFORCE_GTID_CONSISTENCY = off;

    2.方法二：
        create table xxx as select #的方式会拆分成两部分。
        create table city1 like city;
        insert into city1 select * from city;
结果：
mysql> select COUNT(*) from city1;
+----------+
| COUNT(*) |
+----------+
|     4079 |
+----------+
1 row in set (0.00 sec)

mysql> select COUNT(*) from city;
+----------+
| COUNT(*) |
+----------+
|     4079 |
+----------+
1 row in set (0.00 sec)

insert into city1(Name,CountryCode,District,Population) select name,countrycode,district,population from city;
insert into city1(Name,CountryCode,District,Population) select name,countrycode,district,population from city;
insert into city1(Name,CountryCode,District,Population) select name,countrycode,district,population from city;
insert into city1(Name,CountryCode,District,Population) select name,countrycode,district,population from city;
commit; 
mysql> select COUNT(*) from city1;       
+----------+
| COUNT(*) |
+----------+
|    20395 |
+----------+
1 row in set (0.00 sec)

```
（我在配置文件里面关闭了自动事务提交，所以这边需要执行手动commit）.去查看slow.log 会发现里面有这条的记录

删除索引：
```bash
mysql> SHOW CREATE TABLE city; //检查外键
CONSTRAINT `city_ibfk_1` FOREIGN KEY (`CountryCode`) REFERENCES `country` (`Code`)

mysql> alter table city drop foreign key city_ibfk_1;  //删除外键
mysql> SHOW CREATE TABLE city1;
+-------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| Table | Create Table                                                                                                                                                                                                                                                                                                                |
+-------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
| city1 | CREATE TABLE `city1` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` char(35) NOT NULL DEFAULT '',
  `CountryCode` char(3) NOT NULL DEFAULT '',
  `District` char(20) NOT NULL DEFAULT '',
  `Population` int(11) NOT NULL DEFAULT '0',
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=20460 DEFAULT CHARSET=latin1 |
+-------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------+
1 row in set (0.00 sec)

mysql> alter table city drop index CountryCode; //删除辅助索引
```

一堆查询:where条件 慢足countrycode='CHN' 和 name='shanghai';
```bash
select * from city1 where countrycode='CHN' and name='shanghai';
select * from city1 where countrycode='CHN' and name='shanghai';
select * from city1 where countrycode='CHN' and name='shanghai';
```
因为没有索引，走的是全表扫描查询。所以耗时会长，表越大查询越慢
```bash
mysql> desc select * from city1 where countrycode='CHN' and name='anqing';
+----+-------------+-------+------------+------+---------------+------+---------+------+-------+----------+-------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows  | filtered | Extra       |
+----+-------------+-------+------------+------+---------------+------+---------+------+-------+----------+-------------+
|  1 | SIMPLE      | city1 | NULL       | ALL  | NULL          | NULL | NULL    | NULL | 20406 |     1.00 | Using where |
+----+-------------+-------+------------+------+---------------+------+---------+------+-------+----------+-------------+
```
我们添加一下索引：
`alter table city1 add index idx(countrycode,name);`
在查询会发现快很多很多。
`select * from city1 where countrycode='CHN' and name='shanghai';`
查看详细的查询信息：是否走索引了
```bash
mysql> desc select * from city1 where countrycode='CHN' and name='anqing';
+----+-------------+-------+------------+------+---------------+------+---------+-------------+------+----------+-------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref         | rows | filtered | Extra |
+----+-------------+-------+------------+------+---------------+------+---------+-------------+------+----------+-------+
|  1 | SIMPLE      | city1 | NULL       | ref  | idx           | idx  | 38      | const,const |    5 |   100.00 | NULL  |
+----+-------------+-------+------------+------+---------------+------+---------+-------------+------+----------+-------+
```

#### 1.5 mysqldumpslow 分析慢日志
慢日志分析命令：mysqldumpslow
- 参数：
  -  \-s：按照那种方式排序
  -  \-c：访问计数
  -  \-t：降序，取前10
  -  \-al：平均锁定时间
  -  \-ar：平均访问记录数
  -  \-at：平均查询时间
    
```bash
[root@db01 ~]# mysqldumpslow -s c -t 3 /data/3307/slow.log 

Reading mysql slow query log from /data/3307/slow.log
执行次数 Count: 4  执行时间Time=0.03s (0s)  锁定时间Lock=0.00s (0s)  发送行数Rows=0.0 (0), 执行地址root[root]@db01
  内容：insert into city1(Name,CountryCode,District,Population) select name,countrycode,district,population from city

Count: 3  Time=0.01s (0s)  Lock=0.00s (0s)  Rows=3.3 (10), root[root]@db01
  select * from city1 where countrycode='S' and name='S'

Count: 1  Time=0.05s (0s)  Lock=0.00s (0s)  Rows=0.0 (0), root[root]@db01
  insert into city1 select *from city
```

#### 1.6第三方工具(自己扩展)
* pt-query-diagest 
https://www.percona.com/downloads/percona-toolkit/LATEST/
yum install perl-DBI perl-DBD-MySQL perl-Time-HiRes perl-IO-Socket-SSL perl-Digest-MD5
toolkit工具包中的命令:
./pt-query-diagest  /data/mysql/slow.log

* Anemometer基于pt-query-digest将MySQL慢查询可视化
---
附上/data/3307/my.cnf 目前配置
```bash
[mysqld]
basedir=/application/mysql  #软件目录
datadir=/data/3307/data  #本实例数据目录
socket=/data/3307/mysql.sock #本实例socket文件
log_error=/data/3307/mysql.log #数据库日志
port=3307
server_id=7
log_bin=/data/3307/mysql-bin #二进制日志前缀
autocommit=0 #关闭事务自动提交
secure-file-priv=/tmp #导出文件安全路径
innodb_flush_log_at_trx_commit=1  # 每次事务提交，都会立即刷写redo到磁盘
innodb_flush_method=O_DIRECT #（必须大写），控制mysql数据脏页直接刷写到磁盘。redo依然会走操作系统缓存
gtid-mode=on #开启gtid
enforce-gtid-consistency=true
slow_query_log=1 #打开慢日志
slow_query_log_file=/data/3307/slow.log
long_query_time=0.1 #慢日志记录阀值
log_queries_not_using_indexes #记录不走索引语句
```
