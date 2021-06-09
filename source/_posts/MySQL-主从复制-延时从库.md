---
title: MySQL-主从复制_延时从库
author: 饼铛
cover: /images/img-71.png
tags:
  - MySQL
  - 主从复制
categories:
  - DBA
abbrlink: f34e607d
date: 2020-04-27 13:54:00
---
### 1.延时从库
#### 1.1解决数据损坏
- 物理损坏
  - 误操作rm
  - 磁盘阵列损坏
  - 机房爆炸
- 逻辑损坏
  - 删库跑路

对于传统的主从复制，比较擅长处理物理损坏。

#### 1.2设计理念
对SQL线程进行设置延迟。
#### 1.3延迟多久合适
企业生产中一般设置延迟3-6个小时

### 2.如何设置
```bash
从库：
mysql> show slave status \G
SQL_Delay: 0
SQL_Remaining_Delay: NULL
Slave_SQL_Running_State: Slave has read all relay log; waiting for more updates

mysql> stop slave;
mysql> CHANGE MASTER TO MASTER_DELAY = 300;
mysql> start slave;

mysql> show slave status \G
SQL_Delay: 300
SQL_Remaining_Delay: NULL  //最近一个事务的SQL剩余延迟
Slave_SQL_Running_State: Slave has read all relay log; waiting for more updates

主库：
mysql> create database pincheng charset utf8mb4;
Query OK, 1 row affected (0.01 sec)

从库：
mysql> show slave status \G
SQL_Delay: 300
SQL_Remaining_Delay: 227 //倒计时
Slave_SQL_Running_State: Waiting until MASTER_DELAY seconds after master executed event

倒计时结束后
show databases;
| pincheng           |
```

### 3如何使用
#### 3.1模拟故障：
```bash
mysql -S /data/3307/mysql.sock -p
create database  delay charset utf8mb4;
use delay;
create table t1(id int);
insert into t1 values(1),(2),(3);
commit; 
drop database delay;
```
#### 3.2发现问题,处理思路：
1. 停止从库SQL线程，停止主库业务。
2. 模拟SQL手工恢复relaylog到drop之前的位置点
3. 截取relaylog日志，找到起点（relay-log.info）和终点(drop 操作之前)
4. 恢复截取的日志，验证数据可用性。

#### 3.3开始处理：
```bash
1.停止从库SQL线程，停止主库业务。
mysql -S /data/3308/mysql.sock -p
mysql> stop slave sql_thread;
mysql> show slave status \G
 Slave_SQL_Running: No //SQL线程停止
            
 SQL_Delay: 300 //倒计时结束
 SQL_Remaining_Delay: NULL

2.截取relaylog日志，找到起点（relay-log.info）和终点(drop 操作之前)
起点：
mysql> show slave status \G
 Relay_Log_File: db01-relay-bin.000002
 Relay_Log_Pos: 507 //已经执行的最后一个事件的Position号
或者查看relay-log.info文件
[root@db01 ~]# cat /data/3308/data/relay-log.info 
7
./db01-relay-bin.000002
507 //起点

终点：
mysql> show relaylog events in 'db01-relay-bin.000002';
+-----------------------+------+----------------+-----------+-------------+------------------------------------------+
| Log_name              | Pos  | Event_type     | Server_id | End_log_pos | Info                                     |
+-----------------------+------+----------------+-----------+-------------+------------------------------------------+
| db01-relay-bin.000002 |    4 | Format_desc    |         8 |         123 | Server ver: 5.7.26-log, Binlog ver: 4    |
| db01-relay-bin.000002 |  123 | Previous_gtids |         8 |         154 |                                          |
| db01-relay-bin.000002 |  154 | Rotate         |         7 |           0 | mysql-bin.000001;pos=775                 |
| db01-relay-bin.000002 |  201 | Format_desc    |         7 |           0 | Server ver: 5.7.26-log, Binlog ver: 4    |
| db01-relay-bin.000002 |  320 | Anonymous_Gtid |         7 |         840 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'     |
| db01-relay-bin.000002 |  385 | Query          |         7 |         962 | create database pincheng charset utf8mb4 |
| db01-relay-bin.000002 |  507 | Anonymous_Gtid |         7 |        1027 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'     |
| db01-relay-bin.000002 |  572 | Query          |         7 |        1141 | create database  delay charset utf8mb4   |
| db01-relay-bin.000002 |  686 | Anonymous_Gtid |         7 |        1206 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'     |
| db01-relay-bin.000002 |  751 | Query          |         7 |        1305 | use `delay`; create table t1(id int)     |
| db01-relay-bin.000002 |  850 | Anonymous_Gtid |         7 |        1370 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'     |
| db01-relay-bin.000002 |  915 | Query          |         7 |        1443 | BEGIN                                    |
| db01-relay-bin.000002 |  988 | Table_map      |         7 |        1489 | table_id: 109 (delay.t1)                 |
| db01-relay-bin.000002 | 1034 | Write_rows     |         7 |        1539 | table_id: 109 flags: STMT_END_F          |
| db01-relay-bin.000002 | 1084 | Xid            |         7 |        1570 | COMMIT /* xid=74 */                      |
| db01-relay-bin.000002 | 1115 | Anonymous_Gtid |         7 |        1635 | SET @@SESSION.GTID_NEXT= 'ANONYMOUS'     |
| db01-relay-bin.000002 | 1180 | Query          |         7 |        1730 | drop database delay                      |
+-----------------------+------+----------------+-----------+-------------+------------------------------------------+
注意：relaylog查看只看 Pos列，End_log_pos是从库对应主库的binlog的位置点，可忽略
找到drop的操作，对应的Pos列| db01-relay-bin.000002 | 1180 | drop database delay |

3.截取：
[root@db01 ~]# mysqlbinlog --start-position=507 --stop-position=1180 /data/3308/data/db01-relay-bin.000002 >/tmp/relay.sql
//通过截取relay-log日志，截取到drop操作之前

4.检查日志结尾是否包含drop操作：
[root@db01 ~]# tail /tmp/relay.sql
# at 1115
#200427 13:26:50 server id 7  end_log_pos 1635 CRC32 0x6a2be066         Anonymous_GTID  last_committed=8        sequence_number=9   rbr_only=no
SET @@SESSION.GTID_NEXT= 'ANONYMOUS'/*!*/;
BEGIN /*added by mysqlbinlog */ /*!*/;
ROLLBACK /* added by mysqlbinlog */ /*!*/;
SET @@SESSION.GTID_NEXT= 'AUTOMATIC' /* added by mysqlbinlog */ /*!*/;
DELIMITER ;
# End of log file
/*!50003 SET COMPLETION_TYPE=@OLD_COMPLETION_TYPE*/;
/*!50530 SET @@SESSION.PSEUDO_SLAVE_MODE=0*/;

5.在从库中恢复
[root@db01 ~]# mysql -S /data/3308/mysql.sock -p

mysql> set sql_log_bin=0; //临时关闭binlog日志记录

mysql> source /tmp/relay.sql //恢复数据

6.检查数据
mysql> use delay;
Database changed
mysql> select * from t1;
+------+
| id   |
+------+
|    1 |
|    2 |
|    3 |
+------+
```