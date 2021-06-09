---
title: 'MySQL-日志管理[bin_log原理&恢复案例]'
author: 饼铛
cover: /images/img-71.png
tags:
  - MySQL
  - 日志管理
categories:
  - DBA
abbrlink: 1785d60f
date: 2020-04-15 16:52:00
---
## 1 日志管理：
### 1.1 排错
####  1.1.1 错误日志
查看：
```bash
mysql> select @@log_error;
+----------------------+
| @@log_error          |
+----------------------+
| /data/3307/mysql.log |
+----------------------+
#默认日志路径 ：DATADIR/hostname.err
```

####  1.1.2配置方式
修改：
```bash
vim /data/3307/my.cnf
log_error=/data/3307/mysql.log //多实例下日志路径
```

### 1.2 数据恢复
#### 1.2.1 binlog（二进制日志）
作用：数据恢复、主从复制
#### 1.2.2如何配置
 * log_bin //开关、设定存放位置
 * server_id（5.6不需要添加此参数，5.7以上必须加）
**生产要求：**日志和数据分开存放

```bash
[root@db01 ~]# mkdir /data/binlog -p
[root@db01 ~]# vim /data/3307/my.cnf 
server_id=7                  
log_bin=/data/3307/mysql-bin
[root@db01 ~]# chmod -R mysql. /data
[root@db01 ~]# systemctl restart mysqld3307
系统下查看：
[root@db01 ~]# ls /data/3307/mysql-bin.* 
/data/3307/mysql-bin.000001  /data/3307/mysql-bin.000002   //自动向前滚动
/data/3307/mysql-bin.index //多个二进制日志的索引

mysql中查看：
mysql> show variables like '%log_bin%';
+---------------------------------+----------------------------+
| Variable_name                   | Value                      |
+---------------------------------+----------------------------+
| log_bin                         | ON                         |
| log_bin_basename                | /data/3307/mysql-bin       | #控制bin日志前缀的参数
| log_bin_index                   | /data/3307/mysql-bin.index |
| log_bin_trust_function_creators | OFF                        |
| log_bin_use_v1_row_events       | OFF                        |
| sql_log_bin                     | ON                         |#临时关闭开关
+---------------------------------+----------------------------+
```

#### 1.2.3 binlog记录了？
* 1. 记录了数据库中所有变更类的操作
  * DDL
  * DCL
  * DML
* 2. 对于DDL和DCL，记录发生过的语句。
* 3. DML（IUD）
  * 前提：记录提交的事物IUD
关于记录格式：
  * ROW：RBR    行记录模式，记录的是行的变化
  * STATEMENT：SBR    语句记录模式，记录操作语句本身 //对于函数方面的操作(如当前时间)，可能会造成数据不严谨
  * MIXED：MBR    混合记录模式
  
```bash
delete from city where id>1000;
RBR,逐行记录日志，日志量很大，但是足够严谨，不会出现记录错误。//5.7版本默认是RBR模式，是企业建议模式
SBR,只记录语句本身，日志量很少，可读性较强。对于函数类的操作，将来恢复会造成错误
```
查看：

```bash
mysql> select @@binlog_format;
+-----------------+
| @@binlog_format |
+-----------------+
| ROW             |
+-----------------+
```

#### 1.2.4 二进制日志事件（event）
##### 简介
二进制日志的最小记录单元
对于DDL,DCL,一个语句就是一个event
对于DML语句来讲:只记录已提交的事务。
例如以下列子,就被分为了4个event
```bash
         position号码(字节偏移量)
begin;      120  - 340
DML1        340  - 460
DML2        460  - 550
commit;     550  - 760
作用：方便对日志进行截取，指定部分日志进行数据恢复
```

#####  event的组成
三部分构成:
* (1) 事件的开始标识
* (2) 事件内容
* (3) 事件的结束标识

Position:
开始标识: at 194
结束标识: end_log_pos 254
194? 254?
某个事件在binlog中的相对位置号

#### 1.2.5 二进制日志的查看
##### 查看二进制日志所在位置
`mysql> show variables like '%log_bin%';`
```bash
[root@db01 ~]# ll /data/3307/mysql-bin.*
-rw-r----- 1 mysql mysql   1010 4月   1 17:09 /data/3307/mysql-bin.000001
-rw-r----- 1 mysql mysql 690963 4月   2 23:44 /data/3307/mysql-bin.000002
-rw-r----- 1 mysql mysql    196 4月  15 11:09 /data/3307/mysql-bin.index
```
####  1.2.5查看正在使用的二进制日志
```bash
mysql> show binary logs;  //所有二进制日志
+------------------+-----------+
| Log_name         | File_size |
+------------------+-----------+
| mysql-bin.000001 |      1010 |
| mysql-bin.000002 |      6909 |
+------------------+-----------+
Log_name :目前MySQL存在的二进制日志名字
File_size ：目前MySQL用到了哪个position号

mysql> show master status; //确认正在使用的二进制日志
+------------------+----------+--------------+------------------+-------------------+
| File             | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set |
+------------------+----------+--------------+------------------+-------------------+
| mysql-bin.000007 |     6909 |              |                  |                   |
+------------------+----------+--------------+------------------+-------------------+
```
#####  查看二进制日志内容
横向查看：查看二进制日志事件
```bash
mysql> show binlog events in 'mysql-bin.000007';
+------------------+-----+----------------+-----------+-------------+---------------------------------------+
| Log_name         | Pos | Event_type     | Server_id | End_log_pos | Info                                  |
+------------------+-----+----------------+-----------+-------------+---------------------------------------+
| mysql-bin.000007 |   4 | Format_desc    |         7 |         123 | Server ver: 5.7.26-log, Binlog ver: 4 |
| mysql-bin.000007 | 123 | Previous_gtids |         7 |         154 |                                       |                         
+------------------+------+-----------------+---------+-----------+---------------------------------------+
bin_log头部标记：
    5.6 前123个Position号
    5.7 为前154个Position号
注释：以上输出中每一行为一个事件
Log_name：日志名
Pos：事件开始的Position *****
Event_type：事件类型
Server_id：发生在哪台机器的事件 //主从时区分机器
End_log_pos：事件结束的位置号 *****
Info：事件内容
```
RBR模式下记录已提交的事务：

![事务语句](/images/img-79.png)
纵向查看：查看二进制日志内容
```bash
mysql> create database test1;
Query OK, 1 row affected (0.01 sec)
mysql> begin;
mysql> update city SET Name='Tilburo' where id=10;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0
mysql> select * from city where id=10;
+----+---------+-------------+---------------+------------+
| ID | Name    | CountryCode | District      | Population |
+----+---------+-------------+---------------+------------+
| 10 | Tilburo | NLD         | Noord-Brabant |     193238 |
+----+---------+-------------+---------------+------------+
mysql> commit;

[root@db01 /data/binlog]# mysqlbinlog mysql-bin.000007 |grep -v "SET" >/tmp/aa.txt
[root@db01 ~]# mysqlbinlog /data/3307/mysql-bin.000007 |grep -v "SET"
DELIMITER /*!*/;
# at 4
#200415 11:09:01 server id 7  end_log_pos 123 CRC32 0x529742df  Start: binlog v 4, server v 5.7.26-log created 200415 11:09:01 at startup
# Warning: this binlog is either in use or was not closed properly.
ROLLBACK/*!*/;
BINLOG '
zXqWXg8HAAAAdwAAAHsAAAABAAQANS43LjI2LWxvZwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAADNepZeEzgNAAgAEgAEBAQEEgAAXwAEGggAAAAICAgCAAAACgoKKioAEjQA
Ad9Cl1I=
'/*!*/;
# at 123
#200415 11:09:01 server id 7  end_log_pos 154 CRC32 0xf70987e6  Previous-GTIDs
# [empty]

//从154字节开始看
# at 154
#200415 14:55:40 server id 7  end_log_pos 219 CRC32 0x5c02f208  Anonymous_GTID  last_committed=0        sequence_number=1   rbr_only=no

# at 219
#200415 14:55:40 server id 7  end_log_pos 316 CRC32 0x1e0dd89b  Query   thread_id=5     exec_time=0     error_code=0
/*!\C utf8 *//*!*/;
create database test1
/*!*/;
//创建了一个库，DDL语句直接记录语句本事。

# at 316
#200415 15:04:23 server id 7  end_log_pos 381 CRC32 0x7c43eb07  Anonymous_GTID  last_committed=1        sequence_number=2   rbr_only=yes

# at 381
#200415 15:03:46 server id 7  end_log_pos 454 CRC32 0x6f398c9d  Query   thread_id=5     exec_time=0     error_code=0
BEGIN
/*!*/;
# at 454
//事务开始

#200415 15:03:46 server id 7  end_log_pos 512 CRC32 0x223247ee  Table_map: `world`.`city` mapped to number 112
# at 512
#200415 15:03:46 server id 7  end_log_pos 618 CRC32 0xdac21634  Update_rows: table id 112 flags: STMT_END_F

BINLOG '
0rGWXhMHAAAAOgAAAAACAAAAAHAAAAAAAAEABXdvcmxkAARjaXR5AAUD/v7+Awb+I/4D/hQA7kcy
Ig==
0rGWXh8HAAAAagAAAGoCAAAAAHAAAAAAAAEAAgAF///gCgAAAAdUaWxidXJnA05MRA1Ob29yZC1C
cmFiYW501vICAOAKAAAAB1RpbGJ1cm8DTkxEDU5vb3JkLUJyYWJhbnTW8gIANBbC2g==
'/*!*/;
//RBR模式下，针对DML语句binlog中记录每行数据的变化过程

# at 618
#200415 15:04:23 server id 7  end_log_pos 649 CRC32 0xba219dfb  Xid = 42
COMMIT/*!*/;
DELIMITER ;
# End of log file
//事务结束


[root@db01 /data/binlog]# mysqlbinlog --base64-output=decode-rows -vvv mysql-bin.000002 //解码查看
# at 381
#200415 15:03:46 server id 7  end_log_pos 454 CRC32 0x6f398c9d  Query   thread_id=5     exec_time=0     error_code=0
SET TIMESTAMP=1586934226/*!*/;
BEGIN
/*!*/;
# at 454
#200415 15:03:46 server id 7  end_log_pos 512 CRC32 0x223247ee  Table_map: `world`.`city` mapped to number 112
# at 512
#200415 15:03:46 server id 7  end_log_pos 618 CRC32 0xdac21634  Update_rows: table id 112 flags: STMT_END_F
### UPDATE `world`.`city`
### WHERE
###   @1=10 /* INT meta=0 nullable=0 is_null=0 */
###   @2='Tilburg' /* STRING(35) meta=65059 nullable=0 is_null=0 */
###   @3='NLD' /* STRING(3) meta=65027 nullable=0 is_null=0 */
###   @4='Noord-Brabant' /* STRING(20) meta=65044 nullable=0 is_null=0 */
###   @5=193238 /* INT meta=0 nullable=0 is_null=0 */
### SET
###   @1=10 /* INT meta=0 nullable=0 is_null=0 */
###   @2='Tilburo' /* STRING(35) meta=65059 nullable=0 is_null=0 */
###   @3='NLD' /* STRING(3) meta=65027 nullable=0 is_null=0 */
###   @4='Noord-Brabant' /* STRING(20) meta=65044 nullable=0 is_null=0 */
###   @5=193238 /* INT meta=0 nullable=0 is_null=0 */
# at 618
#200415 15:04:23 server id 7  end_log_pos 649 CRC32 0xba219dfb  Xid = 42
COMMIT/*!*/;
SET @@SESSION.GTID_NEXT= 'AUTOMATIC' /* added by mysqlbinlog */ /*!*/;
DELIMITER ;
```
####  1.2.6 基于二进制日志数据恢复案例
#####  按需截取日志
*  基于position号的截取 *****
   * \-\-start-position=###
   * \-\-stop-position=###
截取二进制日志核心在于，找起点和终点

```bash
备份：
mysql> show binlog events in 'mysql-bin.000007';
+------------------+-----+----------------+-----------+-------------+---------------------------------------+
| Log_name         | Pos | Event_type     | Server_id | End_log_pos | Info                                  |
+------------------+-----+----------------+-----------+-------------+---------------------------------------+
| mysql-bin.000007 | 219 | Query          |         7 |         316 | create database test1                 |

[root@db01 ~]# mysqlbinlog --start-position=219 --stop-position=316 /data/3307/mysql-bin.000007 >/tmp/bin.sql

恢复：
mysql> drop database test1; //为了恢复而恢复
mysql> show databases;
mysql> set sql_log_bin=0;  //临时关闭当前会话二进制日志记录
mysql> source /tmp/bin.sql  //开始恢复
```

* 基于时间点截取（了解）
*  基于时间点的截取(了解)
   * \-\-start-datetime
   * \-\-stop-datetime
for example: 2004-12-25 11:25:56 


#####  案例恢复详解
案例: 使用binlog日志进行数据恢复
模拟:
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
insert into t1 values(3);
commit;
#4. 
drop database binlog;
```
恢复：
```bash
#查看当前mysql使用的binlog
mysql> show master status;
+------------------+----------+--------------+------------------+-------------------+
| File             | Position | Binlog_Do_DB | Binlog_Ignore_DB | Executed_Gtid_Set |
+------------------+----------+--------------+------------------+-------------------+
| mysql-bin.000007 |     3016 |              |                  |                   |
+------------------+----------+--------------+------------------+-------------------+
```
```bash
#根据binlog找到对应的字节偏移号
mysql> show binlog events in 'mysql-bin.000007';
+------------------+------+----------------+-----------+-------------+----------------------------------------+
| Log_name         | Pos  | Event_type     | Server_id | End_log_pos | Info                                   |
+------------------+------+----------------+-----------+-------------+----------------------------------------+
| mysql-bin.000007 | 1800 | Query          |         7 |        1916 | create database binlog charset utf8mb4 | //开始1800
| mysql-bin.000007 | 1916 | Anonymous_Gtid |         7 |        1981 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'   |
| mysql-bin.000007 | 1981 | Query          |         7 |        2082 | use `binlog`; create table t1(id int)  |
| mysql-bin.000007 | 2082 | Anonymous_Gtid |         7 |        2147 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'   |
| mysql-bin.000007 | 2147 | Query          |         7 |        2221 | BEGIN                                  |
| mysql-bin.000007 | 2221 | Table_map      |         7 |        2268 | table_id: 117 (binlog.t1)              |
| mysql-bin.000007 | 2268 | Write_rows     |         7 |        2308 | table_id: 117 flags: STMT_END_F        |
| mysql-bin.000007 | 2308 | Xid            |         7 |        2339 | COMMIT /* xid=105 */                   |
| mysql-bin.000007 | 2339 | Anonymous_Gtid |         7 |        2404 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'   |
| mysql-bin.000007 | 2404 | Query          |         7 |        2478 | BEGIN                                  |
| mysql-bin.000007 | 2478 | Table_map      |         7 |        2525 | table_id: 117 (binlog.t1)              |
| mysql-bin.000007 | 2525 | Write_rows     |         7 |        2565 | table_id: 117 flags: STMT_END_F        |
| mysql-bin.000007 | 2565 | Xid            |         7 |        2596 | COMMIT /* xid=107 */                   |
| mysql-bin.000007 | 2596 | Anonymous_Gtid |         7 |        2661 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'   |
| mysql-bin.000007 | 2661 | Query          |         7 |        2735 | BEGIN                                  |
| mysql-bin.000007 | 2735 | Table_map      |         7 |        2782 | table_id: 117 (binlog.t1)              |
| mysql-bin.000007 | 2782 | Write_rows     |         7 |        2822 | table_id: 117 flags: STMT_END_F        |
| mysql-bin.000007 | 2822 | Xid            |         7 |        2853 | COMMIT /* xid=109 */                   | //结束2853
| mysql-bin.000007 | 2853 | Anonymous_Gtid |         7 |        2918 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'   |
| mysql-bin.000007 | 2918 | Query          |         7 |        3016 | drop database binlog                   |
+------------------+------+----------------+-----------+-------------+----------------------------------------+
```
```bash
[root@db01 ~]# mysqlbinlog --start-position=1800 --stop-position=2822 /data/3307/mysql-bin.000007 >/tmp/bin2.sql;  //截取需要的日志
[root@db01 ~]# cat /tmp/bin2.sql 
/*!50530 SET @@SESSION.PSEUDO_SLAVE_MODE=1*/;
/*!50003 SET @OLD_COMPLETION_TYPE=@@COMPLETION_TYPE,COMPLETION_TYPE=0*/;
DELIMITER /*!*/;
# at 4
#200415 11:09:01 server id 7  end_log_pos 123 CRC32 0x529742df  Start: binlog v 4, server v 5.7.26-log created 200415 11:09:01 at startup
# Warning: this binlog is either in use or was not closed properly.
ROLLBACK/*!*/;
BINLOG '
zXqWXg8HAAAAdwAAAHsAAAABAAQANS43LjI2LWxvZwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAADNepZeEzgNAAgAEgAEBAQEEgAAXwAEGggAAAAICAgCAAAACgoKKioAEjQA
Ad9Cl1I=
'/*!*/;
# at 1800
#200415 14:55:40 server id 7  end_log_pos 1916 CRC32 0x7d0a9649         Query   thread_id=5     exec_time=3793  error_code=0
SET TIMESTAMP=1586933740/*!*/;
SET @@session.pseudo_thread_id=5/*!*/;
SET @@session.foreign_key_checks=1, @@session.sql_auto_is_null=0, @@session.unique_checks=1, @@session.autocommit=1/*!*/;
SET @@session.sql_mode=1436549152/*!*/;
SET @@session.auto_increment_increment=1, @@session.auto_increment_offset=1/*!*/;
/*!\C utf8 *//*!*/;
SET @@session.character_set_client=33,@@session.collation_connection=33,@@session.collation_server=8/*!*/;
SET @@session.lc_time_names=0/*!*/;
SET @@session.collation_database=DEFAULT/*!*/;
create database binlog charset utf8mb4
/*!*/;
# at 1916
#200415 14:55:40 server id 7  end_log_pos 1981 CRC32 0x0335ab8d         Anonymous_GTID  last_committed=8        sequence_number=9       rbr_only=no
SET @@SESSION.GTID_NEXT= 'ANONYMOUS'/*!*/;
# at 1981
#200415 14:55:40 server id 7  end_log_pos 2082 CRC32 0xe4331fa1         Query   thread_id=5     exec_time=3793  error_code=0
use `binlog`/*!*/;
SET TIMESTAMP=1586933740/*!*/;
create table t1(id int)
/*!*/;
# at 2082
#200415 14:55:40 server id 7  end_log_pos 2147 CRC32 0xd9ff1631         Anonymous_GTID  last_committed=9        sequence_number=10      rbr_only=yes
/*!50718 SET TRANSACTION ISOLATION LEVEL READ COMMITTED*//*!*/;
SET @@SESSION.GTID_NEXT= 'ANONYMOUS'/*!*/;
# at 2147
#200415 14:55:40 server id 7  end_log_pos 2221 CRC32 0x1b004ae2         Query   thread_id=5     exec_time=3793  error_code=0
SET TIMESTAMP=1586933740/*!*/;
BEGIN
/*!*/;
# at 2221
#200415 14:55:40 server id 7  end_log_pos 2268 CRC32 0x9d41f6ed         Table_map: `binlog`.`t1` mapped to number 117
# at 2268
#200415 14:55:40 server id 7  end_log_pos 2308 CRC32 0xcc11e52b         Write_rows: table id 117 flags: STMT_END_F

BINLOG '
7K+WXhMHAAAALwAAANwIAAAAAHUAAAAAAAEABmJpbmxvZwACdDEAAQMAAe32QZ0=
7K+WXh4HAAAAKAAAAAQJAAAAAHUAAAAAAAEAAgAB//4BAAAAK+URzA==
'/*!*/;
# at 2308
#200415 14:55:40 server id 7  end_log_pos 2339 CRC32 0x891d519e         Xid = 105
COMMIT/*!*/;
# at 2339
#200415 14:55:40 server id 7  end_log_pos 2404 CRC32 0xe5f12f2c         Anonymous_GTID  last_committed=10       sequence_number=11      rbr_only=yes
/*!50718 SET TRANSACTION ISOLATION LEVEL READ COMMITTED*//*!*/;
SET @@SESSION.GTID_NEXT= 'ANONYMOUS'/*!*/;
# at 2404
#200415 14:55:40 server id 7  end_log_pos 2478 CRC32 0x2f6a2f99         Query   thread_id=5     exec_time=3793  error_code=0
SET TIMESTAMP=1586933740/*!*/;
BEGIN
/*!*/;
# at 2478
#200415 14:55:40 server id 7  end_log_pos 2525 CRC32 0xc226ccc1         Table_map: `binlog`.`t1` mapped to number 117
# at 2525
#200415 14:55:40 server id 7  end_log_pos 2565 CRC32 0x7caf0d51         Write_rows: table id 117 flags: STMT_END_F

BINLOG '
7K+WXhMHAAAALwAAAN0JAAAAAHUAAAAAAAEABmJpbmxvZwACdDEAAQMAAcHMJsI=
7K+WXh4HAAAAKAAAAAUKAAAAAHUAAAAAAAEAAgAB//4CAAAAUQ2vfA==
'/*!*/;
# at 2565
#200415 14:55:40 server id 7  end_log_pos 2596 CRC32 0x133f90ed         Xid = 107
COMMIT/*!*/;
# at 2596
#200415 14:55:40 server id 7  end_log_pos 2661 CRC32 0xc76646d7         Anonymous_GTID  last_committed=11       sequence_number=12      rbr_only=yes
/*!50718 SET TRANSACTION ISOLATION LEVEL READ COMMITTED*//*!*/;
SET @@SESSION.GTID_NEXT= 'ANONYMOUS'/*!*/;
# at 2661
#200415 14:55:40 server id 7  end_log_pos 2735 CRC32 0x117fc984         Query   thread_id=5     exec_time=3793  error_code=0
SET TIMESTAMP=1586933740/*!*/;
BEGIN
/*!*/;
# at 2735
#200415 14:55:40 server id 7  end_log_pos 2782 CRC32 0x238f82b5         Table_map: `binlog`.`t1` mapped to number 117
# at 2782
#200415 14:55:40 server id 7  end_log_pos 2822 CRC32 0xa5de37c9         Write_rows: table id 117 flags: STMT_END_F

BINLOG '
7K+WXhMHAAAALwAAAN4KAAAAAHUAAAAAAAEABmJpbmxvZwACdDEAAQMAAbWCjyM=
7K+WXh4HAAAAKAAAAAYLAAAAAHUAAAAAAAEAAgAB//4DAAAAyTfepQ==
'/*!*/;
ROLLBACK /* added by mysqlbinlog */ /*!*/;
SET @@SESSION.GTID_NEXT= 'AUTOMATIC' /* added by mysqlbinlog */ /*!*/;
DELIMITER ;
# End of log file
/*!50003 SET COMPLETION_TYPE=@OLD_COMPLETION_TYPE*/;
/*!50530 SET @@SESSION.PSEUDO_SLAVE_MODE=0*/;
```
```bash
mysql> set sql_log_bin=0; #关闭当前回话的binlog记录
mysql> source /tmp/bin2.sql
```
验证数据是否恢复：
```bash
mysql> select id from t1;
+------+
| id   |
+------+
|    1 |
|    2 |
|    3 |
+------+
```