---
title: 'MySQL-日志管理[GTID]'
author: 饼铛
cover: /images/img-71.png
tags:
  - MySQL
  - 日志管理
categories:
  - DBA
abbrlink: 93ea067
date: 2020-04-15 23:04:00
---
### 1.GTID
#### 思考问题？下面怎么恢复？
```bash
#1. 
create database binlog charset utf8mb4;
#2. 
use binlog;
create table t1(id int);
#3. 
insert into t1 values(1);
commit;
insert into t1 values(2);
commit;

truncate table t1;

insert into t1 values(3);
commit;
#4. 
drop database binlog;
```
原因：基于position号恢复需要多次截取，找起点和终点过程很复杂。

#### 1.2什么是GTID（全局事务编号）
5.6 版本新加的特性,5.7中做了加强
5.6 中不开启,没有这个功能.
5.7 中的GTID,即使不开也会有自动生成
SET @@SESSION.GTID_NEXT= 'ANONYMOUS' //匿名的GTID。用于系统自身维护

是对于一个已提交事务的编号，并且是一个全局唯一连续的编号。
它的官方定义如下：
GTID = source_id ：transaction_id
7E11FA47-31CA-19E1-9E56-C43AA21293967:29
* UUID:事务编号
UUID存放路径：
```bash
[root@db01 ~]# cat /data/3307/data/auto.cnf //数据库初始化完成后，自动生成
[auto]
server-uuid=cca7bb3f-687e-11ea-b0d9-0800273e0795
```
说明：
DDL DCL，一条语句（事件）就是一个事务，占一个GTID号
DML：一个完整的事务(begin--》commit)，是一个事务，占一个GTID号

#### 1.3开启GTID
```bash
vim /etc/my.cnf
gtid-mode=on
enforce-gtid-consistency=true
systemctl restart mysqld
```

#### 1.4查看GTID
```bash
mysql> show master status;
+------------------+----------+--------------+------------------+-------------------+
| File             | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set |
+------------------+----------+--------------+------------------+-------------------+
| mysql-bin.000008 |      154 |              |                  |                   |
+------------------+----------+--------------+------------------+-------------------+
1 row in set (0.00 sec)

mysql> create database ff;
Query OK, 1 row affected (0.00 sec)

mysql> show master status;
+------------------+----------+--------------+------------------+----------------------------------------+
| File             | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set //存放gtid            |
+------------------+----------+--------------+------------------+----------------------------------------+
| mysql-bin.000008 |      307 |              |                  | cca7bb3f-687e-11ea-b0d9-0800273e0795:1 |
+------------------+----------+--------------+------------------+----------------------------------------+
```
模拟被删库，如何恢复数据
```bash
mysql> use ff;
mysql> create table pincheng.org (id int);
mysql> insert into pincheng.org values(1);
mysql> commit;
mysql> insert into pincheng.org values(2);
mysql> commit;
mysql> insert into pincheng.org values(3);
mysql> commit;
mysql> insert into pincheng.org values(4);
mysql> commit;
mysql> insert into pincheng.org values(5);
mysql> commit;
mysql> show master status;
+------------------+----------+--------------+------------------+------------------------------------------+
| File             | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set                        |
+------------------+----------+--------------+------------------+------------------------------------------+
| mysql-bin.000008 |     1771 |              |                  | cca7bb3f-687e-11ea-b0d9-0800273e0795:1-7 |
+------------------+----------+--------------+------------------+------------------------------------------+
```

#### 1.5基于GTDI截取
```bash
mysql> drop database ff;
mysql> show master status;
+------------------+----------+--------------+------------------+------------------------------------------+
| File             | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set                        |
+------------------+----------+--------------+------------------+------------------------------------------+
| mysql-bin.000008 |     1922 |              |                  | cca7bb3f-687e-11ea-b0d9-0800273e0795:1-8 |
+------------------+----------+--------------+------------------+------------------------------------------+
1 row in set (0.00 sec)

mysql> show binlog events in 'mysql-bin.000008';
+------------------+------+----------------+-----------+-------------+-------------------------------------------------------------------+
| Log_name         | Pos  | Event_type     | Server_id | End_log_pos | Info                                                              |
+------------------+------+----------------+-----------+-------------+-------------------------------------------------------------------+
| mysql-bin.000008 |    4 | Format_desc    |         7 |         123 | Server ver: 5.7.26-log, Binlog ver: 4                             |
| mysql-bin.000008 |  123 | Previous_gtids |         7 |         154 |                                                                   |
| mysql-bin.000008 |  154 | Gtid           |         7 |         219 | SET @@SESSION.GTID_NEXT= 'cca7bb3f-687e-11ea-b0d9-0800273e0795:1' | //建库
| mysql-bin.000008 |  219 | Query          |         7 |         307 | create database ff                                                |
| mysql-bin.000008 |  307 | Gtid           |         7 |         372 | SET @@SESSION.GTID_NEXT= 'cca7bb3f-687e-11ea-b0d9-0800273e0795:2' | //建表
| mysql-bin.000008 |  372 | Query          |         7 |         476 | use `ff`; create table pincheng.org (id int)                      |
| mysql-bin.000008 |  476 | Gtid           |         7 |         541 | SET @@SESSION.GTID_NEXT= 'cca7bb3f-687e-11ea-b0d9-0800273e0795:3' | //插入数据
| mysql-bin.000008 |  541 | Query          |         7 |         611 | BEGIN                                                             |
| mysql-bin.000008 |  611 | Table_map      |         7 |         664 | table_id: 110 (ff.pincheng.org)                                   |
| mysql-bin.000008 |  664 | Write_rows     |         7 |         704 | table_id: 110 flags: STMT_END_F                                   |
| mysql-bin.000008 |  704 | Xid            |         7 |         735 | COMMIT /* xid=16 */                                               |
| mysql-bin.000008 |  735 | Gtid           |         7 |         800 | SET @@SESSION.GTID_NEXT= 'cca7bb3f-687e-11ea-b0d9-0800273e0795:4' |
| mysql-bin.000008 |  800 | Query          |         7 |         870 | BEGIN                                                             |
| mysql-bin.000008 |  870 | Table_map      |         7 |         923 | table_id: 110 (ff.pincheng.org)                                   |
| mysql-bin.000008 |  923 | Write_rows     |         7 |         963 | table_id: 110 flags: STMT_END_F                                   |
| mysql-bin.000008 |  963 | Xid            |         7 |         994 | COMMIT /* xid=18 */                                               |
| mysql-bin.000008 |  994 | Gtid           |         7 |        1059 | SET @@SESSION.GTID_NEXT= 'cca7bb3f-687e-11ea-b0d9-0800273e0795:5' |
| mysql-bin.000008 | 1059 | Query          |         7 |        1129 | BEGIN                                                             |
| mysql-bin.000008 | 1129 | Table_map      |         7 |        1182 | table_id: 110 (ff.pincheng.org)                                   |
| mysql-bin.000008 | 1182 | Write_rows     |         7 |        1222 | table_id: 110 flags: STMT_END_F                                   |
| mysql-bin.000008 | 1222 | Xid            |         7 |        1253 | COMMIT /* xid=20 */                                               |
| mysql-bin.000008 | 1253 | Gtid           |         7 |        1318 | SET @@SESSION.GTID_NEXT= 'cca7bb3f-687e-11ea-b0d9-0800273e0795:6' |
| mysql-bin.000008 | 1318 | Query          |         7 |        1388 | BEGIN                                                             |
| mysql-bin.000008 | 1388 | Table_map      |         7 |        1441 | table_id: 110 (ff.pincheng.org)                                   |
| mysql-bin.000008 | 1441 | Write_rows     |         7 |        1481 | table_id: 110 flags: STMT_END_F                                   |
| mysql-bin.000008 | 1481 | Xid            |         7 |        1512 | COMMIT /* xid=22 */                                               |
| mysql-bin.000008 | 1512 | Gtid           |         7 |        1577 | SET @@SESSION.GTID_NEXT= 'cca7bb3f-687e-11ea-b0d9-0800273e0795:7' | //插入数据
| mysql-bin.000008 | 1577 | Query          |         7 |        1647 | BEGIN                                                             |
| mysql-bin.000008 | 1647 | Table_map      |         7 |        1700 | table_id: 110 (ff.pincheng.org)                                   |
| mysql-bin.000008 | 1700 | Write_rows     |         7 |        1740 | table_id: 110 flags: STMT_END_F                                   |
| mysql-bin.000008 | 1740 | Xid            |         7 |        1771 | COMMIT /* xid=24 */                                               |
| mysql-bin.000008 | 1771 | Gtid           |         7 |        1836 | SET @@SESSION.GTID_NEXT= 'cca7bb3f-687e-11ea-b0d9-0800273e0795:8' | //删库
| mysql-bin.000008 | 1836 | Query          |         7 |        1922 | drop database ff                                                  |
+------------------+------+----------------+-----------+-------------+-------------------------------------------------------------------+
```

##### 1.5.1错误截取方法：
```bash
[root@db01 ~]# mysqlbinlog --include-gtids='cca7bb3f-687e-11ea-b0d9-0800273e0795:1-7' /data/3307/mysql-bin.000008 >/tmp/gtid.sql
```
**注意：以上截取方法不可在本机直接恢复。「在其他机器上可直接恢复」**
**原因：GTID具备幂等性，即在恢复通过GTID截取导出的二进制文件时，GTID会对比本地二进制文件中是否存在相同操作，若存在则跳过重复执行「GTID误认为次操作为重复劳动故不执行」。**

##### 1.5.2正确截取方法：
```bash
[root@db01 ~]# mysqlbinlog --skip-gtids --include-gtids='cca7bb3f-687e-11ea-b0d9-0800273e0795:1-7' /data/3307/mysql-bin.000008 >/tmp/gtids.sql
--skip-gtids //再次恢复时跳过GTID幂等检查
恢复：
mysql> set sql_log_bin=0; #关闭当前回话的binlog记录
mysql> source /tmp/gtids.sql
```
##### 1.5.3：5.2对比5.1：
![5.2对比5.1](/images/img-80.png)

##### 1.5.4跳过某些GTID不截取
```bash
[root@db01 ~]# mysqlbinlog --skip-gtids --include-gtids='cca7bb3f-687e-11ea-b0d9-0800273e0795:1-7'--exclude-gtids='cca7bb3f-687e-11ea-b0d9-0800273e0795:3,cca7bb3f-687e-11ea-b0d9-0800273e0795:4-6' /data/3307/mysql-bin.000008 >/tmp/gtids.sql
--exclude-gtids='cca7bb3f-687e-11ea-b0d9-0800273e0795:3' //跳过指定GTID截取binlog
```

```bash
从全备获取获取单库的备份
# sed -n '/^-- Current Database: `world`/,/^-- Current Database: `/p' all.sql >world.sql
只截取db1库的二进制日志
# mysqlbinlog -d db1 --stop-position=974 /data/mysql/mysql-bin.000003 >/tmp/part.sql
```

### 2.二进制日志使用场景
* **二进制日志一般是配合定期全备，恢复生产中的数据。**
* 主从复制架构依赖于二进制日志

#### 2.2 二进制日志其他操作
##### 2.2.1临时关闭
`set sql_log_bin=0;`
说明：
* 临时关闭二进制日志记录，退出mysql窗口可以恢复
* 做数据恢复之前，使用以上参数  

##### 2.2.2自动清理
参数：
`mysql> select @@expire_logs_days;`

自动清理设置依据：至少是一个全备周期+1，企业建议至少2个全备周期+1

怎么设置：
```bash
mysql> set global expire_logs_days=8; //临时设置，重启失效

vim /etc/my.cnf 
expire_logs_days=8 //永久设置，重启生效
```

##### 2.2.3手工清理
`PURGE BINARY LOGS BEFORE now() - INTERVAL 3 day;`  //删除从现在开始三天之前的二进制日志
`PURGE BINARY LOGS TO 'mysql-bin.000003';`  //删除到哪里为止
以上操作不会重置二进制日志号码。

注意:不要手工 rm binlog文件，误杀binlog日志文件处理过程：
1.  my.cnf binlog关闭掉,启动数据库
2.  把数据库关闭,开启binlog,启动数据库
删除所有binlog,并从000001开始重新记录日志

删除所有binlog，从000001开始（危险！！！！）
`mysql> reset master;` //断开业务，静止数据。主从环境下执行，主从则需要重新构建。最好是全备之后再执行。

##### 2.2.4日志滚动
* 重启数据库
* flush logs 
* mysqladmin -uroot -p flush-logs
* show variables like '%max_binlog_size%'; //日志默认大小，默认1G滚动
* 备份加一些参数，会触发滚动日志