---
title: MySQL-主从复制_过滤复制_半同步复制_GTID复制
author: 饼铛
cover: /images/img-71.png
tags:
  - MySQL
  - 主从复制
categories:
  - DBA
abbrlink: c3e1b71a
date: 2020-04-27 18:37:00
---
## 1.环境准备
[延迟从库](https://pincheng.org/forward/f34e607d.html)后进行环境恢复
```bash
1.主从之间差一个数据库。

2.删掉3308中的delay数据库。
从库：
mysql> drop database delay;
3.检查3308数据库是否同步
主库：
mysql> show master status \G  //查看主库起点
File: mysql-bin.000001
Position: 1730

从库：
mysql> show slave status \G 
Master_Log_File: mysql-bin.000001
Read_Master_Log_Pos: 1730  //由于主库3307中最后一个操作是删除delay库。从库中在第二步也将恢复的数据删除了。所以刚好同步
Slave_SQL_Running: No

4.重启主从复制：
mysql> stop slave;
Query OK, 0 rows affected (0.00 sec)

mysql> change master to master_delay=0; //关闭延迟从库

mysql> start slave;
Query OK, 0 rows affected (0.00 sec)

mysql> show slave status \G
 Master_Log_File: mysql-bin.000001
 Read_Master_Log_Pos: 1730
 Slave_IO_Running: Yes
 Slave_SQL_Running: Yes

 SQL_Delay: 0
 SQL_Remaining_Delay: NULL
 Slave_SQL_Running_State: Slave has read all relay log; waiting for more updates

5.如果不同步那么需要删除不一致的数据，然后参照主库`show master status \G`信息重新对从库进行CHANGE MASTER TO操作
主库：
mysql> show master status \G  //查看主库起点位置
File: mysql-bin.000001
Position: 1730

从库：
mysql> drop database delay;

mysql> stop slave;  //停止主从
mysql> reset slave all;   //清空CHANGE MASTER TO 信息
CHANGE MASTER TO
  MASTER_HOST='10.0.2.4',
  MASTER_USER='repl',
  MASTER_PASSWORD='123',
  MASTER_PORT=3307,
  MASTER_LOG_FILE='mysql-bin.00001',
  MASTER_LOG_POS=1730,
  MASTER_CONNECT_RETRY=10; 
mysql> start slave;  //重启线程

6.生产环境下，以3308的数据为准。将3308的全备恢复到3307.并重构主从
```

## 2.过滤复制
### 2.1主库：（了解）
```bash
mysql> show master status \G
binlog_do_db #白名单
binlog_ignore_db #黑明单
```
### 2.2从库：
**工作原理：**在SQL线程回放日志时，进行过滤控制。只对白名单中的数据库日志进行回放
```bash
mysql> show slave status \G
Replicate_Do_DB:   #白名单
Replicate_Ignore_DB:    #黑明单
//过滤库级别

Replicate_Do_Table:  #白名单
Replicate_Ignore_Table:   #黑明单
//过滤表级别

Replicate_Wild_Do_Table:  #白名单
Replicate_Wild_Ignore_Table:  #黑明单
//模糊匹配
```

### 2.3例子：
**1.只需要复制qq513247869库的数据到从库**
```bash
[root@db01 ~]# vim /data/3308/my.cnf 
replicate_do_db=qq513247869
[root@db01 ~]# systemctl restart mysqld3308
mysql> show slave status \G
             Slave_IO_Running: Yes
            Slave_SQL_Running: Yes
              Replicate_Do_DB: qq513247869
              
```
**2.工作原理验证：**
**主库：**
```bash
mysql> create database qq513247869 charset utf8mb4; //在主库创建一个在白名单中的数据库
```
**从库：**
```bash
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| qq513247869        |  //从库中复制过来了
mysql> show slave status \G
 Master_Log_File: mysql-bin.000001
 Read_Master_Log_Pos: 2102 //注意观察此数值是否发生变化
```
**主库：**
```bash
mysql> create database www1 charset utf8mb4; //在主库创建一个未在白名单中的数据库
```

**从库：**
```bash
mysql> show slave status \G
 Master_Log_File: mysql-bin.000001
 Read_Master_Log_Pos: 2277 //可见master.info中binlog的位置点在主库创建新库时发生了改变。
mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| qq513247869        |  //但是www1并没有进行同步
```
**总结：**以上可知过滤复制是在SQL线程回放日志时，进行过滤控制，而不是在IO线程上进行的过滤。

## 3.半同步复制（了解）
作用：解决主从数据一致性问题，了解
加载插件
主:`INSTALL PLUGIN rpl_semi_sync_master SONAME 'semisync_master.so';`
从:`INSTALL PLUGIN rpl_semi_sync_slave SONAME 'semisync_slave.so';`

查看是否加载成功:`show plugins;`

启动:
主:`SET GLOBAL rpl_semi_sync_master_enabled = 1;`
从:`SET GLOBAL rpl_semi_sync_slave_enabled = 1;`

重启从库上的IO线程
`STOP SLAVE IO_THREAD;`
`START SLAVE IO_THREAD;`

查看是否在运行
主:`show status like 'Rpl_semi_sync_master_status';`
从:`show status like 'Rpl_semi_sync_slave_status';`

工作原理：
1. 主库执行新的事务,commit时,更新 show master  status\G ,触发一个信号给
2. binlog dump 接收到主库的 show master status\G信息,通知从库日志更新了
3. 从库IO线程请求新的二进制日志事件
4. 主库会通过dump线程传送新的日志事件,给从库IO线程
5. 从库IO线程接收到binlog日志,当日志写入到磁盘上的relaylog文件时,给主库ACK_receiver线程
6. ACK_receiver线程触发一个事件,告诉主库commit可以成功了
7. 如果ACK达到了我们预设值的超时时间,半同步复制会切换为原始的异步复制.

## 4.GTID复制
### 4.1什么是GTID
GTID(Global Transaction ID)全局事务标识符：是一个唯一的标识符，它创建并与源服务器（主）上提交的每个事务相关联。
此标识符不仅对其发起的服务器是唯一的，而且在给定复制设置中的所有服务器上都是唯一的。 所有交易和所有GTID之间都有1对1的映射。
GTID实际上是由UUID+TID组成的。其中UUID是一个MySQL实例的唯一标识。TID代表了该实例上已经提交的事务数量，并且随着事务提交单调递增。
GTID同时具备[幂等性](https://pincheng.org/forward/93ea067.html)

### 4.2GTID的具体形式：
它的官方定义如下：
- GTID = source_id ：transaction_id
  - 3E11FA47-71CA-11E1-9E33-C80AA9429562:23
- 什么是sever_uuid，和Server-id 区别？
  - source_id 也叫uuid 默认在是第一次启动数据库时，自动生成的`/application/mysql/data/auto.cnf`手工删除掉此文件，重启数据库，可以生成新的。


### 4.3GTID新特性
(1).支持多线程复制:事实上是针对每个database开启相应的独立线程,即每个库有一个单独的(sql thread).

(2).支持启用GTID,在配置主从复制,传统的方式里,你需要找到binlog和POS点,然后change master to指向.
在mysql5.6里,无须再知道binlog和POS点,只需要知道master的IP/端口/账号密码即可,因为同步复制是自动的,MySQL通过内部机制GTID自动找点同步.

(3).基于Row复制只保存改变的列,大大节省Disk Space/Network resources和Memory usage.

(4).支持把Master 和Slave的相关信息记录在Table中
原来是记录在文件里,记录在表里,增强可用性

(5).支持延迟复制

### 4.4基于GTID复制构建过程
#### 4.4.1更新参数文件
`vim /data/3307/my.cnf`
添加：
```bash
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1       ----强制刷新从库二进制日志：【5.6必加】【5.7：高可用(MHA)、级联的中间库】
//去掉复制过滤功能
```

#### 4.4.2地址规划
|服务器        | ip:port       | 角色  |
| ------------- |:-------------:| -----:|
|db01        | 192.168.56.2:3306| 主库  |
|db02        | 192.168.56.3:3306| 从库  |
|db03        | 192.168.56.4:3306| 从库  |

#### 4.4.3环境初始化
清理：
```bash
pkill mysqld
\rm -rf /data/*
mkdir -p /data/mysql/data
mkdir -p /data/binlog
chown -R mysql.mysql /data
```

#### 4.4.4配置文件准备
**主库 db01：**
```bash
cat > /etc/my.cnf <<EOF
[mysqld]
basedir=/data/mysql/
datadir=/data/mysql/data
socket=/tmp/mysql.sock
server_id=51
port=3306
secure-file-priv=/tmp  //允许导出的路径
autocommit=0  //关闭事务自动提交
log_bin=/data/binlog/mysql-bin  //二进制日志前缀
binlog_format=row  //RBR 行记录模式，记录的是行的变化
gtid-mode=on  //开启gtid
enforce-gtid-consistency=true  //同上
log-slave-updates=1 //强制刷新从库二进制日志
[mysql]
prompt=db01 [\\d]>
EOF
```

**slave1(db02)：**
```bash
cat > /etc/my.cnf <<EOF
[mysqld]
basedir=/data/mysql
datadir=/data/mysql/data
socket=/tmp/mysql.sock
server_id=52
port=3306
secure-file-priv=/tmp
autocommit=0
log_bin=/data/binlog/mysql-bin
binlog_format=row
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
[mysql]
prompt=db02 [\\d]>
EOF
```
**slave2(db03)：**
```bash
cat > /etc/my.cnf <<EOF
[mysqld]
basedir=/data/mysql
datadir=/data/mysql/data
socket=/tmp/mysql.sock
server_id=53
port=3306
secure-file-priv=/tmp
autocommit=0
log_bin=/data/binlog/mysql-bin
binlog_format=row
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
[mysql]
prompt=db03 [\\d]>
EOF
```

#### 4.4.5重新初始化数据
```bash
mysqld --initialize-insecure --user=mysql --basedir=/data/mysql  --datadir=/data/mysql/data

[root@db01 ~]# vim /etc/systemd/system/mysqld.service
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
ExecStart=/application/mysql/bin/mysqld --defaults-file=/etc/my.cnf
LimitNOFILE = 5000 
```

#### 4.4.6启动数据库
```bash
systemctl restart mysqld
systemctl status mysqld
```

#### 4.4.7 主库创建复制用户
```bash
[root@db01 ~]# mysql -e "grant replication slave  on *.* to repl@'192.168.56.%' identified by '123';"
mysql -e "select host,user,authentication_string from mysql.user;"
+--------------+---------------+-------------------------------------------+
| host         | user          | authentication_string                     |
+--------------+---------------+-------------------------------------------+
| localhost    | root          |                                           |
| localhost    | mysql.session | *THISISNOTAVALIDPASSWORDTHATCANBEUSEDHERE |
| localhost    | mysql.sys     | *THISISNOTAVALIDPASSWORDTHATCANBEUSEDHERE |
| 192.168.56.% | repl          | *23AE809DDACAF96AF0FD78ED04B6A265E05AA257 |
+--------------+---------------+-------------------------------------------+
```

#### 4.4.8 另外两台从库开启主从
```bash
#初始化master.info
mysql -e "change master to master_host='192.168.56.2',master_user='repl',master_password='123' ,MASTER_AUTO_POSITION=1;"

#MASTER_AUTO_POSITION=1; //表示开启gtid复制模式

mysql -e  "start slave;"

[root@db02 ~]# mysql -e  "show slave status \G"|grep "Running:"
Slave_IO_Running: Yes
Slave_SQL_Running: Yes
```

#### 4.4.9 GTID复制和普通复制的区别
GTID 复制和普通复制的区别
```bash
//普通复制
CHANGE MASTER TO
MASTER_HOST='10.0.0.51',
MASTER_USER='repl',
MASTER_PASSWORD='123',
MASTER_PORT=3307,
MASTER_LOG_FILE='mysql-bin.000001',
MASTER_LOG_POS=444,
MASTER_CONNECT_RETRY=10;

//GTID复制
change master to 
master_host='10.0.0.51',
master_user='repl',
master_password='123' ,
MASTER_AUTO_POSITION=1;
start slave;
```
- 在主从复制环境中，主库发生过的事务，在全局都是由唯一GTID记录的，更方便Failover
- 额外功能参数（3个）
- `change master to` 的时候不再需要`binlog` 文件名和`position号`,而是用`MASTER_AUTO_POSITION=1`替换;
- 在复制过程中，从库不再依赖`master.info`文件，而是直接读取最后一个`relay_log`的 GTID号
- mysqldump备份时，默认会将备份中包含的事务操作，以以下方式即不能添加`--set-gtid-purged=OFF：`
 - `SET @@GLOBAL.GTID_PURGED='8c49d7ec-7e78-11e8-9638-000c29ca725d:1';`//告诉从库，我的备份中已经有以上事务，你就不用运行了，直接从下一个GTID开始请求binlog就行。
 - 如果备份中没有这条信息，那么在复制时，从库会从第一个GTID开始向主库进行请求。那么会导致基于GTID的主从崩溃

**例**：参见[https://pincheng.org/forward/7cf8b47.html](https://pincheng.org/forward/7cf8b47.html#4-4-5%E5%85%B6%E4%BB%96%E5%8F%82%E6%95%B0)
```bash
#GTID环境下备份举例
mysqldump -uroot -p123 -S /data/mysql.sock -A -R -E -F --triggers --master-data=2  --max-allowed-packet=128M --single-transaction |gzip >/tmp/alL_$(date +%F)2.sql.gz
```