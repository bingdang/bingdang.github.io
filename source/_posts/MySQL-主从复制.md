---
title: MySQL-主从复制基础&故障分析
author: 饼铛
cover: /images/img-71.png
tags:
  - 主从复制
  - MySQL
categories:
  - DBA
abbrlink: 69e1266e
date: 2020-04-24 17:28:00
---
# 1.主从复制
## 1.介绍
依赖于二进制日志的，“实时”备份的一个多节点架构 

## 2.主从复制的前提（搭建主从复制）
* 2.1至少两个实例
* 2.2不同的server_id
* 2.3主库开启二进制日志
* 2.4主库需要授权一个专用复制用户
* 2.5主库数据备份（插班生补课）
* 2.6开启专用复制线程

## 3.主从复制环境准备
### 3.1准备多实例
略[参见：[https://pincheng.org/forward/4f3d60c1.html](https://pincheng.org/forward/4f3d60c1.html)]
```bash
[root@db01 ~]# mv /etc/my.cnf{,.bak}
[root@db01 ~]# cat /etc/systemd/system/mysqld3309.service 
[Unit]
Description=MySQL Server
Documentation=man:mysqld(8)
Documentation=http://dev.mysql.com/doc/refman/en/using-systemd.html
After=network.target
After=syslog.target
[Install]
WantedBy=multi-user.target
[Service]
User=mysql
Group=mysql
ExecStart=/application/mysql/bin/mysqld --defaults-file=/data/3309/my.cnf
LimitNOFILE = 5000

[root@db01 ~]# cat /etc/systemd/system/mysqld3308.service 
[Unit]
Description=MySQL Server
Documentation=man:mysqld(8)
Documentation=http://dev.mysql.com/doc/refman/en/using-systemd.html
After=network.target
After=syslog.target
[Install]
WantedBy=multi-user.target
[Service]
User=mysql
Group=mysql
ExecStart=/application/mysql/bin/mysqld --defaults-file=/data/3308/my.cnf
LimitNOFILE = 5000
```
### 3.2检查server-id
```bash
[root@db01 ~]# ps -ef m|grep mysqld
m //在进程后显示线程
mysql     4098     1  0 10:15 ?        -      0:06 /application/mysql/bin/mysqld --defaults-file=/data/3307/my.cnf
mysql     5152     1  0 15:22 ?        -      0:00 /application/mysql/bin/mysqld --defaults-file=/data/3308/my.cnf
mysql     5188     1  0 15:22 ?        -      0:00 /application/mysql/bin/mysqld --defaults-file=/data/3309/my.cnf
root      5238  5026  0 15:28 pts/0    -      0:00 grep --color=auto mysqld

mysql -S /data/3307/mysql.sock -e "select @@server_id"。//主库
mysql -S /data/3308/mysql.sock -e "select @@server_id"
mysql -S /data/3309/mysql.sock -e "select @@server_id"
要求：从库server-id 一般比主库的大
```
![server-id](/images/img-82.png)
### 3.3检查主库二进制日志是否开启
```bash
[root@db01 ~]# mysql -S /data/3307/mysql.sock -e "show variables like '%log_bin%'" -p
Enter password: 
+---------------------------------+----------------------------+
| Variable_name                   | Value                      |
+---------------------------------+----------------------------+
| log_bin                         | ON                         |
| log_bin_basename                | /data/3307/mysql-bin       |
| log_bin_index                   | /data/3307/mysql-bin.index |
| log_bin_trust_function_creators | OFF                        |
| log_bin_use_v1_row_events       | OFF                        |
| sql_log_bin                     | ON                         |
+---------------------------------+----------------------------+
```

### 3.4创建授权复制用户
```bash
[root@db01 ~]# mysql -S /data/3307/mysql.sock  -p. //主库
mysql> grant replication slave on *.* to repl@'10.0.2.%' identified by '123';
```

### 3.5进行主库数据备份（生产环境下）
```bash
[root@db01 ~]# mysqldump -uroot -p123 -S /data/3307/mysql.sock -A -R -E -F --triggers --master-data=2  --max-allowed-packet=128M --single-transaction |gzip >/tmp/alL_$(date +%F).sql.gz
mysqldump: [Warning] Using a password on the command line interface can be insecure.
[root@db01 ~]# ls /tmp/
alL_2020-04-24.sql.gz
[root@db01 ~]# gzip -d /tmp/alL_2020-04-24.sql.gz 
[root@db01 ~]# head /tmp/alL_2020-04-24.sql
-- MySQL dump 10.13  Distrib 5.7.26, for linux-glibc2.12 (x86_64)
--
-- Host: localhost    Database: 
-- ------------------------------------------------------
-- Server version       5.7.26-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
```

### 3.6恢复数据到从库（3308）
```bash
[root@db01 ~]# mysql -S /data/3308/mysql.sock
mysql> set sql_log_bin=0;
mysql> source /tmp/alL_2020-04-24.sql
```

### 3.7告知从库复制的信息
```bash
[root@db01 ~]# cat /tmp/alL_2020-04-24.sql
-- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000031', MASTER_LOG_POS=314;

[root@db01 ~]# mysql -S /data/3308/mysql.sock
mysql> help change master to
CHANGE MASTER TO
  MASTER_HOST='10.0.2.4',  #主库的ip地址
  MASTER_USER='repl',  #用户名
  MASTER_PASSWORD='123',  #密码
  MASTER_PORT=3307,  #主库端口
  MASTER_LOG_FILE='mysql-bin.000031',  #需要追加的binlog日志
  MASTER_LOG_POS=314, #binlog起点，查看全备中的终点
  MASTER_CONNECT_RETRY=10;  #在主服务器宕机或连接丢失的情况下，从服务器线程重新尝试连接主服务器之前睡眠的秒数。如果主服务器.info文件中的值可以读取则优先使用。如果未设置， 默认值为60。

```
#### 3.7.1如果 change master to 信息输入错误，咋办？
```bash
mysql> stop slave;  //停止主从
mysql> reset slave all;   //清空CHANGE MASTER TO 信息
CHANGE MASTER TO
  MASTER_HOST='10.0.0.51',
  MASTER_USER='repl',
  MASTER_PASSWORD='123',
  MASTER_PORT=3307,
  MASTER_LOG_FILE='mysql-bin.000001',
  MASTER_LOG_POS=444,
  MASTER_CONNECT_RETRY=10;
mysql> start slave;  //重启线程
```

### 3.8启动复制线程
```bash
mysql> start slave;
```

### 3.9查看主从状态【针对从库】
```bash
mysql> show slave status \G
             Slave_IO_Running: No  //失败
            Slave_SQL_Running: Yes
```

## 4.主从复制工作过程

![主从复制](/images/img-83.png)

### 4.1名词
#### 4.1.1文件
- 主库：binlog
- 从库：
  - relay-log  中继日志
  - master.info  主库信息文件
  - relay-log.info    中继日志应用信息

#### 4.1.2线程
- 主库：binlog_dump_thread 二进制日志投递线程 `mysql -S /data/3307/mysql.sock -e "show processlist"`
- 从库：
  - IO_Thread：从库IO线程【请求和接收binlog】
  - SQL_Thread：从库的SQL线程【回放日志】


### 4.2工作原理
（1）从库执行`change master to` 语句，会将主库信息记录到`master.info`中
  - [存放主从接头暗号，和binlog信息等]

（2）从库执行`stat slave`语句，会立即派生IO_T和SQL_T，两个线程
  - [分配两位特工代号为IO、SQL]

（3）`IO_T`读取`master.info`文件，获取到主库信息
  - [从库 代号IO的特工拿到接头暗号]

（4）`IO_T`连接主库，主库验证没问题后会立即分配一个`DUMP_T`，进行交互
  - [主库 安插一个间谍代号DUMP，负责传递情报（binlog）]

（5）`IO_T` 根据`master.info` `binlog`信息，向`DUMP_T`请求最新的`binlog`
  - [特工IO根据接头暗号成功联络上间谍DUMP，以获取最新的情报（binlog）]

（6）主库`DUMP_T`,经过查询，如果发现有新的，截取并反回给从库`IO_T`
  - [间谍DUMP，利用职务便利查看主库是否存在更新操作，如果有则将最新的binlog投递给IO]

（7）从库`IO_T`会收到`binlog`，存储在`TCP/IP`缓存中,在网络底层返回`ACK`
  - [特工IO拿到情报后，未将情报立即整理入库（尚未落地到磁盘），回复ACK确认，到这里间谍DUMP工作完成。]

（8）从库`IO_T`会更新`master.info` ,重置`binlog`位置点信息
  - [特工IO根据情报末尾的编号（position）等信息，更新binlog的位置点信息。以便对下次传递情报时进行位置点进行确认]

（9）从库`IO_T`会将`binlog`，写入到`relay-log`中
  - [情报入库工作完成（落地到磁盘）]

（10）从库`SQL_T`读取`Relay-log.info` 文件，获取上次执行过的位置点
  - [特工SQL，负责情报分析和整理，对特工IO整理好并已经入库的binlog进行分析。并且对新的binlog进行执行]

（11）`SQL_T`按照旧的位置点往下执行`relaylog`日志
  - [从上一次的位置点开始，往下执行binlog]

（12）`SQL_T`执行完成后，重新更新`relay-log.info`
  - [新的binlog执行完成后，将位置点进行更新，以便于下次执行新的binlog。到这里一次主从复制的过程就已经完成]

（13）`relaylog`定期自动清理的功能。

**细节**：
主库发生了信息的修改，更新二进制日志完成后，会发送一个“信号”给Dump_T,Dump_T通知给IO_T线程

![主从复制](/images/img-84.png)

## 5.主从监控
### 5.1主库相关参数
```bash
mysql> show processlist; 
+----+------+------------+------+-------------+------+---------------------------------------------------------------+------------------+
| Id | User | Host       | db   | Command     | Time | State                                                         | Info             |
+----+------+------------+------+-------------+------+---------------------------------------------------------------+------------------+
| 18 | repl | db01:16526 | NULL | Binlog Dump |  343 | Master has sent all binlog to slave; waiting for more updates | NULL             |
正常状态下：                        投递线程              主服务器已将所有binlog发送到从服务器；等待更多更新
```

### 5.2从库相关参数
```bash
mysql> show slave status \G   
*************************** 1. row ***************************
//master.info
lave_IO_State: 
Master_Host: 10.0.2.4 //主库ip
Master_User: repl //复制的用户
Master_Port: 3307 //主库端口
Connect_Retry: 10  //断联之后重试的次数
Master_Log_File: mysql-bin.000031。//已经获取到的binlog的文件名
Read_Master_Log_Pos: 314 //已经获取到的binlog的位置号

//relay-log.info
Relay_Log_File: db01-relay-bin.000001 
Relay_Log_Pos: 4

//从库线程状态
Slave_IO_Running: No
Slave_SQL_Running: Yes

//过滤复制
Replicate_Do_DB: 
Replicate_Ignore_DB: 
Replicate_Do_Table: 
Replicate_Ignore_Table: 
Replicate_Wild_Do_Table: 
Replicate_Wild_Ignore_Table:

//从库延时主库的时间
Seconds_Behind_Master: NULL  从库延时主库的时间/s

//从库线程报错详细信息
Last_IO_Errno: 1593  //io报错的错误号
Last_IO_Error: The replication receiver thread cannot start because the master has GTID_MODE = ON and this server has GTID_MODE = OFF.
//IO报错的具体信息

ast_SQL_Errno: 0 //SQL报错的号码
Last_SQL_Error:  //SQL线程报错的具体原因

延时从库：
SQL_Delay: 0 //延时从库设定的时间
SQL_Remaining_Delay: NULL  //延时操作的剩余时间

GTID的复制信息：
Retrieved_Gtid_Set:   //接收到的GTID个数
Executed_Gtid_Set: 976ebf28-851a-11ea-8cc4-0800273e0795:1-3,  //执行的GTID的个数
bd623560-8476-11ea-ba73-0800273e0795:1-5,
cca7bb3f-687e-11ea-b0d9-0800273e0795:1-19,
dd4ce0c3-8463-11ea-9af9-0800273e0795:1-8
```

### 5.3主从故障分析
### （1）连接主库连接不上
#### 故障1:GTID相关
```bash
//从库线程状态
Slave_IO_Running: No
Slave_SQL_Running: Yes

//从库线程报错详细信息
Last_IO_Errno: 1593  //io报错的号码
Last_IO_Error: The replication receiver thread cannot start because the master has GTID_MODE = ON and this server has GTID_MODE = OFF.
//IO报错的具体信息

ast_SQL_Errno: 0 //SQL报错的号码
Last_SQL_Error:  //SQL线程报错的具体原因
```

原因：这里，我主库开启了[GTID](https://pincheng.org/forward/93ea067.html)，从库未开启。所以从库的io连接进程报错
解决办法：
```bash
[root@db01 ~]# vim /data/3307/my.cnf 
#gtid-mode=on
#enforce-gtid-consistency=true 
[root@db01 ~]# systemctl restart mysqld3307
[root@db01 ~]# mysql -S /data/3308/mysql.sock -p
Enter password: 
mysql> show slave status \G
 Slave_IO_Running: Yes
 Slave_SQL_Running: Yes
```

#### 故障2:CHANGE MASTER信息错误
```bash
Slave_IO_Running: Connecting； 
Slave_SQL_Running: Yes
```
原因:
- 网络不通
- 防火墙
- IP 不对
- port 不对 
- 用户，密码不对
- skip_name_resolve(旧版本)
- 链接数上限

处理思路：
```bash
1.根据从库CHANGE MASTER TO信息手动连接主库，测试是否正常。
[root@db01 ~]# mysql -urepl -p123 -h 10.0.0.51 -P 3308   --->端口问题
mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 1130 (HY000): Host 'db01' is not allowed to connect to this MySQL server
[root@db01 ~]# mysql -urepl -p123 -h 10.0.0.52 -P 3307   --->ip问题
mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 2003 (HY000): Can't connect to MySQL server on '10.0.0.52' (110)
[root@db01 ~]# mysql -urepl -p1234 -h 10.0.0.51 -P 3307   --->密码问题
mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 1045 (28000): Access denied for user 'repl'@'db01' (using password: YES)
[root@db01 ~]# mysql -urepl1 -p123 -h 10.0.0.51 -P 3307   --->用户名问题
mysql: [Warning] Using a password on the command line interface can be insecure.
ERROR 1045 (28000): Access denied for user 'repl1'@'db01' (using password: YES)

2.在从库下
stop slave; //停掉主从
reset slave all; //清空主库信息
change master to //重新调整主库参数
start slave;  //重新启动线程
```

### （2）请求新的binlog 
IO线程No的状态分析：
#### 故障1： 日志名不对
从库信息：
```bash
Master_Log_File: mysql-bin.000001
Read_Master_Log_Pos: 444
```
对比之前全备份的位置号，和`binlog`日志名称。参见【3.7配置】

#### 故障2：日志损坏，日志不连续
原因：主库与从库binlog不一致，导致从库IO线程无法请求新的binlog。导致主从失败
示例：
```bash
主库：
mysql> show master status;  //查看正在使用的二进制日志
  mysql-bin.000031

mysql> flush logs;  //手动前滚
对比从库：
[root@db01 ~]# mysql -S /data/3308/mysql.sock -e "show slave status \G " -p
Enter password: 
*************************** 1. row ***************************
              Master_Log_File: mysql-bin.000032
             Slave_IO_Running: Yes
            Slave_SQL_Running: Yes

此时，在主库中清空重置binlog日志：
mysql> reset master;
mysql> show master status;
 mysql-bin.000001
mysql> create database dd1;

从库状态：
[root@db01 ~]# mysql -S /data/3308/mysql.sock -e "show slave status \G " -p
             Slave_IO_Running: No  //断开
            Slave_SQL_Running: Yes
                Last_IO_Error: Got fatal error 1236 from master when reading data from binary log: 'could not find next log; the first event 'mysql-bin.000031' at 314, the last event read from '/data/3307/mysql-bin.000032' at 314, the last byte read from '/data/3307/mysql-bin.000032' at 314.'
```
#### 解决办法：
```bash
mysql -S /data/3308/mysql.sock -p
stop slave;
reset slave all;
CHANGE MASTER TO
  MASTER_HOST='10.0.2.4',
  MASTER_USER='repl',
  MASTER_PASSWORD='123',
  MASTER_PORT=3307,
  MASTER_LOG_FILE='mysql-bin.000001',  //重置一下binlog号
  MASTER_LOG_POS=154,  //并从最开始的位置进行binlog追加，防止主从数据不一致。
  MASTER_CONNECT_RETRY=10;
start slave;  //重新启动复制线程

mysql> show slave status \G
*************************** 1. row ***************************
               Slave_IO_State: Waiting for master to send event
                  Master_Host: 10.0.2.4
                  Master_User: repl
                  Master_Port: 3307
                Connect_Retry: 10
              Master_Log_File: mysql-bin.000001
          Read_Master_Log_Pos: 310
               Relay_Log_File: db01-relay-bin.000002
                Relay_Log_Pos: 476
        Relay_Master_Log_File: mysql-bin.000001
             Slave_IO_Running: Yes
            Slave_SQL_Running: Yes
mysql> show databases;
| dd1                |
```


### （3）SQL线程故障
#### 原因一：相关文件物理损坏
 读relay-log.info 
 读relay-log ，并执行日志
 更新relay-log.info 
//以上文件损坏，最好是重新构建主从(从全备开始)

#### 原因二：从库误写入
为什么一条SQL语句执行不成功？
1. 主从数据库版本差异较大
2. 主从数据库配置参数不一致（例如：sql_mode等）
3. 想要创建的对象已经存在
4. 想要删除或修改的对象不存在
5. 主键冲突
6. DML语句不符合表定义及约束时
归根结底是从库写入了，导致主从数据不一致。

#### 方法一：删除或跳过从库中不一致的对象
1.`stop slave; `
2.`set global sql_slave_skip_counter = 1;` //跳过上一个报错。
3.`start slave;`

或`stop slave;`
在从库中删除该对象 `drop database xxx;`
`start slave;`

`vim /etc/my.cnf`
`slave-skip-errors = 1032,1062,1007;`//自动跳过指定错误码的错误。不合理不推荐

#### 方法二：读写分离，read_only 
- 设置从库只读，防止写入`set global read_only=1;``read_only=1`
  - 注意：read_only参数对root权限的账号不起作用。
- 使用中间件做成读写分离的架构

## 6.主从延时-原因分析
Seconds_Behind_Master: 0  从库延时主库的时间/s

### 6.1 主库方面：

1. 日志写入不及时
  - sync_binlog=1; //双1标准的第二个1 ``select @@sync_binlog;
2. 主库并发业务较高
  - “分布式”架构
3. 从库太多
  - 级联主从(级联时，我们的主服务器，只需要将自己的数据同步给级联即可，其余的从服务器由级联服务器去同步)

**对于Classic Replication(传统CR复制模式) ：**
主库是有能力并发运行事务的，但是在Dump_T在传输日志的时候，是以事件为单元传输日志的。所以导致事务的传输工作是串行方式的，这时在主库TPS很高时，会产生比较大的主从延时。

**详细说明**：Dump_T在传输数据时以[event](https://pincheng.org/forward/663d93c2.html#1-2-4-%E4%BA%8C%E8%BF%9B%E5%88%B6%E6%97%A5%E5%BF%97%E4%BA%8B%E4%BB%B6%EF%BC%88event%EF%BC%89)为单位，而一个事务从`begin;`到`commit;`至少是三个事件组成。
这时并发了上千个事务而Dump_T在传输时必须保证一个事务投递的完整性。及从头到尾完整的传输完毕。再传递下一个事务，这就导致了并行的事务在传输到从库时变成了串行的方式。（100个人跑来过河，而船一次只能载一个人。）

**怎么处理**：group commit
从5.6开始加入了GTID[同一个事务的时间GTID是一样的]，在复制时，可以将原来串行的传输模式变成并行的 [事务为级别进行复制]。
**前提**：除了GTID支持，还需要双一保证。
**原理**：在传输日志时可以同时发送多个并发事务的事件，在从库中通过相同GTID进行站队组合。

### 6.2 从库方面：
Classic Replication
问题：SQL线程只有一个，所以只能穿行执行relay的事务。
解决：多加几个SQL线程
- 5.6中出现了database级别的多线程SQL，但是只能针对不同库下的事务，才能并发
- 5.7 版本开始GTID之后,在SQL方面,提供了基于逻辑时钟(logical_clock),binlog加入了seq_no机制,
真正实现了基于事务级别的并发回放,这种技术我们把它称之为MTS(enhanced multi-threaded slave).
- 大事务拆成多个小事务,可以有效的减少主从延时.
[https://dev.mysql.com/worklog/task/?id=6314](https://dev.mysql.com/worklog/task/?id=6314)