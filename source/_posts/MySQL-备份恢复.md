---
title: MySQL-数据备份&恢复&迁移
author: 饼铛
cover: /images/img-71.png
tags:
  - 日志管理
  - 数据备份
  - MySQL
categories:
  - DBA
abbrlink: 5c41384a
date: 2020-04-16 13:56:00
---
## 知识点回顾：
### 1、[存储引擎](https://pincheng.org/forward/3053135c.html#4-InnoDB-%E6%A0%B8%E5%BF%83%E7%89%B9%E6%80%A7%EF%BC%9A)
#### (1)[InnoDB](https://pincheng.org/forward/3053135c.html#8-0-InnoDB%E6%A0%B8%E5%BF%83%E5%8F%82%E6%95%B0)（默认使用引擎，也是企业常用的）
- 热备
- [独立表空间](https://pincheng.org/forward/3053135c.html#6-1-3-%E7%8B%AC%E7%AB%8B%E8%A1%A8%E7%A9%BA%E9%97%B4)（每个表一个表空间）
- [redo](https://pincheng.org/forward/bc8a646.html#3-2-redo-log)：重做日志，用来前滚
- [undo](https://pincheng.org/forward/bc8a646.html#3-2-undo-%E5%9B%9E%E6%BB%9A%E6%97%A5%E5%BF%97)：回滚日志，用来回滚（未提交的事务）
- [行级别锁](https://pincheng.org/forward/49de8711.html#1-2InnoDB%E9%94%81%E7%BA%A7%E5%88%AB)，基于索引来实现的，GAP锁
- [支持事务](https://pincheng.org/forward/bc8a646.html#%E4%BA%8B%E5%8A%A1%E7%9A%84ACID%E7%89%B9%E6%80%A7)。

#### (2)MyISAM
- 温备
- 三个文件构成
- 表级锁


###  2、[二进制日志](https://pincheng.org/forward/663d93c2.html)
#### (1)记录的是什么？
- [DDL](https://pincheng.org/forward/3c4a0863.html#3-%E6%95%B0%E6%8D%AE%E5%AE%9A%E4%B9%89%E8%AF%AD%E8%A8%80DDL)、[DCL](https://pincheng.org/forward/3c4a0863.html#4-%E6%95%B0%E6%8D%AE%E6%8E%A7%E5%88%B6%E8%AF%AD%E8%A8%80DCL)这些种类语句，记录的就是操作语句
- [DML](https://pincheng.org/forward/3c4a0863.html#2-%E6%95%B0%E6%8D%AE%E6%93%8D%E7%BA%B5%E8%AF%AD%E8%A8%80DML)：他记录的已提交的事务日志，并支持多种格式记录（row、statement、mixed）

#### (2)[事件](https://pincheng.org/forward/663d93c2.html#1-2-4-%E4%BA%8C%E8%BF%9B%E5%88%B6%E6%97%A5%E5%BF%97%E4%BA%8B%E4%BB%B6%EF%BC%88event%EF%BC%89)
- 开始位置（at xxx）
- 结束位置(下一个at)
- 一个事务，有多个事件做成（begin到commit）

#### (3)[截取二进制日志](https://pincheng.org/forward/663d93c2.html#1-2-6-%E5%9F%BA%E4%BA%8E%E4%BA%8C%E8%BF%9B%E5%88%B6%E6%97%A5%E5%BF%97%E6%95%B0%E6%8D%AE%E6%81%A2%E5%A4%8D%E6%A1%88%E4%BE%8B)
- 1、分析二进制日志
  - 找到要截取日志的开始位置（start-position）和结束位置（stop-position）
  - 解码查看：mysqlbinlog --base64-output=decode=rows -vvv
- 2、截取日志
  - mysqlbinlog --start-position=xxx --stop-position=xxx。//[基于position号截取](https://pincheng.org/forward/663d93c2.html#%E6%8C%89%E9%9C%80%E6%88%AA%E5%8F%96%E6%97%A5%E5%BF%97)
  - mysqlbinlog --skip-gtids --include-gtids='UUID:gitd号' //[基于gtid号截取](https://pincheng.org/forward/93ea067.html#1-5%E5%9F%BA%E4%BA%8EGTDI%E6%88%AA%E5%8F%96)

---
## 1.运维DBA 在数据库备份恢复方面的职责
### 1.1设计备份策略
**全备/增量**：
 - 数据量大：
   - 定期全量+每天增量的方式
 - 数据量小：
   - 可直接每天全量

**时间**：触发时间，业务低谷。一般为晚上
**自动**：可crontab+rersync
### 1.2日常备份检查
- **备份存在性**
- **备份空间够用否**

### 1.3定期恢复演练（测试库）
一季度 或 半年

### 1.4故障恢复
通过现有备份,能够将数据库恢复到故障之前的时间点

### 1.5迁移
1. 停机时间
2. 回退方案

### 1.6备份是为了什么？
为了防止数据库损坏
### 1.7数据库损坏
- 物理损坏
  - 高可用架构可以很好解决
- 逻辑损坏
  - 只能用备份就解决

## 2.备份类型

- 冷备份
  - 在数据库未工作时进行备份。数据一致性高，可靠性高。影响所有读写。
- 温备份
  - 数据库不停止工作，只是在备份时对表进行加锁，不影响读，但是影响写操作。（myisam）
- 热备份
  - 数据库不停止工作，基于事务的特点进行数据库在线备份，读写影响小。受限于存储引擎类型（innoDB）。

## 3.备份工具介绍
### 3.1 逻辑备份工具
基于SQL语句进行备份
- mysqldump（MDP）
- mysqlbinlog

### 3.2 物理备份工具
基于磁盘数据文件备份
- xtrabackup(XBK) ：Percona 第三方  
- MySQL Enterprise Backup（MEB）

## 4.备份策略
### 4.1逻辑备份和物理备份比较
#### 4.1.1mysqldump（MDP）
**优点**：
1. 不需要单独下载安装
2. 备份出来的是SQL脚本，文本格式。可读性高，便于备份处理
3. 压缩比较高，节省备份的磁盘空间

**缺点**：
1. 依赖于数据库引擎，需要从磁盘把数据读出，然后转换成SQL进行转储，比较耗费资源，数据量大的话效率较低

**建议**：
 * 100G以内的数据量级，可以使用mysqldump
 * 超过TB以上，我们也可能选择的是mysqldump，配合分布式的系统
   * 1EB  =1024 PB = 1000000 TB

#### 4.1.2xtrabackup(XBK)
**优点**：
1. 类似于直接cp数据文件，不需要管逻辑结构，相对来说性能较高

**缺点**：
2. 可读性差
3. 压缩比低，需要更多磁盘空间

**建议**：
 * >100G<TB

### 4.2 备份方式：
 * 全备:全库备份，备份所有数据
 * 增量:备份变化的数据
 * 逻辑备份=mysqldump(全备)+mysqlbinlog(增量)
 * 物理备份=xtrabackup_full(全备)+xtrabackup_incr(增量)+binlog   或者   xtrabackup_full(全备)+binlog(增量)

### 4.3备份周期
根据数据量设计备份周期
* 比如：周日全备，周1-周6增量
* 其他：通过主从复制备份（实时复制）

### 4.4逻辑备份工具-mysqldump
#### 4.4.1 客户端通用参数【和连接有关】
* \-u 用户名
* \-p 密码
* \-S sock文件
* \-h 主机
* \-P 端口号

##### 4.4.1.1本地备份连接方式
`mysqldump -uroot -pxxx -S /tmp/mysql.sock`
##### 4.4.1.2远程备份的连接方式
`mysqldump -uroot -pxxx -S /tmp/mysql.sock`

#### 4.4.2基本备份参数
* `-A` 全库备份
`mysqldump -uroot -p123 -A -S /data/3307/mysql.sock > /data/backup/full.sql`
* `-B` 单个、多个库备份<注意不能加-B，-B后面只能全是数据库>
`mysqldump -uroot -p123 -B oldboy world -S /data/3307/mysql.sock > /data/backup/db.sql`
*  库名 表名
`mysqldump -uroot -p123 world city country -S /data/3307/mysql.sock > /data/backup/tab.sql`
注意：此种方法只会备份建表+insert语句。所以恢复前需要吧库建好，并提前use到库中进行恢复。

```bash
** 思考并验证以下命令的区别：
mysqldump -uroot -p123 -B world >/backup/world.sql
与
mysqldump -uroot -p123 world >/backup/world1.sql

vimdiff wordpres.sql world1.sql

结论：
1、-B 在备份时，会添加create database和use语句
2、-B的备份恢复时，直接source
3、不加-B备份恢复时，需要事先创建好数据库，use进去进行source
```

```bash
如果备份对象下的数据库绝大多数都是myisam类型表，为了保证数据的一致性，备份时需要锁定表
如果是针对innodb的表进行备份由于innodb是事务型的引擎，会话与会话之间是隔离的，所以备份的时候不影响数据库的正常使用，无需锁表

如果添加了此参数，会自动对备份的表加锁，对于加了--single-transaction参数的时候，
如果是innodb表则会实行“热备”
```

#### 4.4.3必加参数<1>
`—R`在备份是，同时备份存储过程和函数，如果没有会自动忽略(mysql人为开发的代码块，类系统中shell脚本)
`-E`在备份时，同时备份EVENT，如果没有会自动忽略(类系统 crontab)
`--triggers` 在备份时，同时备份触发器，如果没有会自动忽略

```bash
mysqldump -uroot -p123 —R -E --triggers world city country -S /data/3307/mysql.sock > /data/backup/tab.sql
```

#### 4.4.4必加参数<2>
* `--master-data=1` //记录增加binlog日志文件名和 对应的位置点可执行的语句
* `--master-data=2` //记录备份开始时 `position`号,可作为将来做日志截取的起点
配合-F参数，备份时前滚一个binlog
二者区别：
```bash
30 CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000014', MASTER_LOG_POS=194;|30 -- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000013', MASTER_LOG_POS=194; 
1：表示前滚一个日志，写入到备份文件中
2：以注释的方式写入
```
功能： 
1. 记录备份时的`position` 
2. 自动锁表 
3. 配合`--single-transaction`，减少锁的时间(innodb引擎不锁表)

`--single-transaction` //针对innodb表，在备份时生成一个事务生成原始数据的快照（undo技术），备份的是快照不是原表数据。不锁表（快照备份"热备份"）
例子：
```bash
[root@db01 ~]# ll /data/3307/mysql-bin.0* | wc -l
11
[root@db01 ~]# mysqldump -uroot -p123 -S /data/3307/mysql.sock -A -R --triggers --master-data=2 --single-transaction  -F |gzip >/tmp/alL_$(date +%F).sql.gz
[root@db01 ~]# ll /data/3307/mysql-bin.0* | wc -l
12
[root@db01 /tmp]# ll /data/3307/mysql-bin.0* | wc -l13
[root@db01 /tmp]# gzip -d alL_2020-04-16.sql.gz 
-- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000013', MASTER_LOG_POS=194;
//加上-F --master-data=2 后向后滚动了一个日志，最后一个事务的结束position就是将来日常恢复要找的第一个postition起点

[root@db01 /tmp]# mysqlbinlog /data/3307/mysql-bin.000013
/*!50530 SET @@SESSION.PSEUDO_SLAVE_MODE=1*/;
/*!50003 SET @OLD_COMPLETION_TYPE=@@COMPLETION_TYPE,COMPLETION_TYPE=0*/;
DELIMITER /*!*/;
# at 4
#200416 23:11:20 server id 7  end_log_pos 123 CRC32 0x32b19ec2  Start: binlog v 4, server v 5.7.26-log created 200416 23:11:20
# Warning: this binlog is either in use or was not closed properly.
BINLOG '
mHWYXg8HAAAAdwAAAHsAAAABAAQANS43LjI2LWxvZwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
AAAAAAAAAAAAAAAAAAAAAAAAEzgNAAgAEgAEBAQEEgAAXwAEGggAAAAICAgCAAAACgoKKioAEjQA
AcKesTI=
'/*!*/;
# at 123
#200416 23:11:20 server id 7  end_log_pos 194 CRC32 0x7213cfc8  Previous-GTIDs
# cca7bb3f-687e-11ea-b0d9-0800273e0795:1-14
SET @@SESSION.GTID_NEXT= 'AUTOMATIC' /* added by mysqlbinlog */ /*!*/;
DELIMITER ;
# End of log file
/*!50003 SET COMPLETION_TYPE=@OLD_COMPLETION_TYPE*/;
/*!50530 SET @@SESSION.PSEUDO_SLAVE_MODE=0*/;
```
mysqldump 热备的实现原理是什么？
1、热备的前提是，只能对innodb表才能实现的
2、热备的实现原理，基于时间点的的快照
3、我的理解是，给全体员工（mysql数据）拍个照（快照），对照片上的人数进行统计（备份）。

#### 4.4.5其他参数
`-F` //前滚binlog，默认按库的个数进行前滚

`--set-gtid-purged=auto`|auto|on|off :忽略或打开gtid

`--max-allowed-packet=128M`
使用场景:
1. --set-gtid-purged=OFF,可以使用在日常备份参数中.

```bash
mysqldump -uroot -p123 -S /data/3307/mysql.sock -A -R -E -F --triggers --master-data=2  --max-allowed-packet=128M --single-transaction --set-gtid-purged=OFF  |gzip >/tmp/alL_$(date +%F)2.sql.gz
参数解释
-A：全量备份     
-R：同时备份数据库中的代码块     
-E：同时备份事件
-F：备份时前滚日志
--triggers：同时备份触发器    
--master-data=2：备份当前时刻字节偏移量，即最后一个position号    
--max-allowed-packet=128M：备份大表时调整数据包的阀值
--single-transaction：针对innodb引擎，减少锁表时间&开启快照备份（“热备”）
--set-gtid-purged=OFF：普通环境下备份时忽略gtid，可不加。即恢复时对恢复的数据产生新的gtid和position号
```

2. auto , on:在构建主从复制环境时需要的参数配置

```bash
mysqldump -uroot -p123 -S /data/3307/mysql.sock -A -R -E -F --triggers --master-data=2  --max-allowed-packet=128M --single-transaction --set-gtid-purged=ON  |gzip >/tmp/alL_$(date +%F)2.sql.gz
参数解释
-A：全量备份     
-R：同时备份数据库中的代码块     
-E：同时备份事件
-F：备份时前滚日志
--triggers：同时备份触发器 
--master-data=2：备份当前时刻字节偏移量，即最后一个position号  
--max-allowed-packet=128M：备份大表时调整数据包的阀值
--single-transaction：针对innodb引擎，减少锁表时间&开启快照备份（“热备”）
--set-gtid-purged=ON：针对主从环境下的数据备份，必须设置成ON，备份GTID号.在恢复数据时采用原有的GTID和position号。确保主从环境中数据的一致性
```

二者备份完成后的区别：
```bash
--set-gtid-purged=ON                                                                                    --set-gtid-purged=OFF
    17 SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;                                      |       ------------------------------------------------------------------------------------------
    18 SET @@SESSION.SQL_LOG_BIN= 0;                                                             |       ------------------------------------------------------------------------------------------
    19                                                                                           |       ------------------------------------------------------------------------------------------
    20 --                                                                                        |       ------------------------------------------------------------------------------------------
    21 -- GTID state at the beginning of the backup                                              |       ------------------------------------------------------------------------------------------
    22 --                                                                                        |       ------------------------------------------------------------------------------------------
    23                                                                                           |       ------------------------------------------------------------------------------------------
    24 SET @@GLOBAL.GTID_PURGED='cca7bb3f-687e-11ea-b0d9-0800273e0795:1-14';                     |       ------------------------------------------------------------------------------------------
    
    1623 SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;                                    |       ------------------------------------------------------------------------------------------
```
---

## 5.企业备份恢复案例（mysqldump+binlog）：
### 5.1 frm误删除
#### 有全备情况下
1. 找出建表语句，在测试库中进行恢复。
2. 拷贝恢复好的frm文件到误删的数据库中进行恢复。
3. `chmod mysql.mysql /data/3307/data/world/*` 不要忘记授权

#### 没有全备情况下
参照：[表空间迁移](https://pincheng.org/forward/3053135c.html#7-0-%E8%A1%A8%E7%A9%BA%E9%97%B4%E8%BF%81%E7%A7%BB)
思路：找到建表语句，测试库恢复表结构。-->恢复数据

### 5.2 年终故障恢复演练。
**案例背景**： 某中小型互联网公司。MySQL 5.7.26 ，Centos 7.6 ，数据量级80G，每日数据增量5-6M，开启了[GTID](https://pincheng.org/forward/93ea067.html)。
**备份策略**： 每天mysqldump全备+binlog备份，每天23:00进行。
**故障描述**： 周三下午2点，数据由于某原因数据损坏。
**处理思路**： 
1. 挂出维护页
2. 评估一下数据损坏状态
  - 2.1 全部丢失-->推荐直接生产恢复
  - 2.2 部分丢失
    - (1)从备份中导出单表数据  
    - (2)测试库进行全备恢复
3.  恢复全备，将数据追溯到周二晚上23:00状态
4.  截取并恢复从备份时刻，到下午两点误删除之前binlog。
5.  校验数据一致性
6.  撤维护页，恢复生产。
**处理结果**：
 1.  经过30-40分钟处理，业务恢复
 2.  评估此次故障的处理的合理性和实用性

#### 灾后恢复具体过程：
1. **模拟前一天全备[参数解释见：[mysqldump](https://pincheng.org/forward/7cf8b47.html#3-4%E9%80%BB%E8%BE%91%E5%A4%87%E4%BB%BD%E5%B7%A5%E5%85%B7-mysqldump)]**

```bash
show master status;
    mysql-bin.000021

mysqldump -uroot -p123 -S /data/3307/mysql.sock -A -R -E -F --triggers --master-data=2  --max-allowed-packet=128M --single-transaction |gzip >/tmp/alL_$(date +%F).sql.gz

show master status;
    mysql-bin.000022 //执行完成后binlog向前滚动了一个日志
```

2.**查看备份数据**

```bash
gzip -d /tmp/alL_2020-04-20.sql.gz 

[root@db01 ~]# vim /tmp/alL_2020-04-20.sql 
SET @@GLOBAL.GTID_PURGED='cca7bb3f-687e-11ea-b0d9-0800273e0795:1-14';   //记录了备份数据时刻最后的gtid号
-- CHANGE MASTER TO MASTER_LOG_FILE='mysql-bin.000022', MASTER_LOG_POS=194;    //记录了binlog在备份时刻使用的日志文件和结束位置的position号
```

3.**全备之后到下午两点前业务操作**
```bash
mysql> create database mdp charset utf8mb4;
mysql> use mdp
mysql> create table t1(id int);
mysql> insert into t1 values(1),(2),(3);
mysql> commit;
mysql> insert into t1 values(11),(12),(13);
mysql> commit;
mysql> update t1 set id=20 where id>10;
mysql> commit;

mysql> select * from t1;
+------+
| id   |
+------+
|    1 |
|    2 |
|    3 |
|   20 |
|   20 |
|   20 |
+------+
```

4.**模拟数据库被删**
```bash
[root@db01 /data/3307/data]# ls
111    auto.cnf  binlog    ff              ibdata1      ib_logfile1  mdp    oldboy  performance_schema  sys    world
aa_bb  _bb       db01.pid  ib_buffer_pool  ib_logfile0  ibtmp1       mysql  oldguo  school              test1  xyz
[root@db01 /data/3307/data]# \rm -rf *
[root@db01 /data/3307/data]# pkill mysqld
[root@db01 /data/3307/data]# ls
ib_buffer_pool
[root@db01 /data/3307/data]# \rm -rf *
```

5.**开始恢复**
5.1 重新初始化数据
```bash
mysqld --initialize-insecure  --user=mysql --datadir=/data/3307/data --basedir=/application/mysql
[root@db01 ~]# ls /data/3307/data/
auto.cnf  ib_buffer_pool  ibdata1  ib_logfile0  ib_logfile1  mysql  performance_schema  sys

[root@db01 ~]# systemctl restart mysqld3307
[root@db01 ~]# systemctl status mysqld3307
● mysqld3307.service - MySQL Server
   Loaded: loaded (/etc/systemd/system/mysqld3307.service; enabled; vendor preset: disabled)
   Active: active (running) since 一 2020-04-20 16:00:59 CST; 12s ago
     Docs: man:mysqld(8)
           http://dev.mysql.com/doc/refman/en/using-systemd.html
 Main PID: 1488 (mysqld)
   CGroup: /system.slice/mysqld3307.service
           └─1488 /application/mysql/bin/mysqld --defaults-file=/data/3307/my.cnf

4月 20 16:00:59 db01 systemd[1]: Started MySQL Server.
```

5.2 前一天全备恢复
```bash
[root@db01 ~]# mysql -S /data/3307/mysql.sock
mysql> set sql_log_bin=0;  //临时关闭当前会话二进制日志记录
mysql> source /tmp/alL_2020-04-20.sql

mysql> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| 111                |
| _bb                |
| aa_bb              |
| binlog             |
| ff                 |
| mysql              |
| oldboy             |
| oldguo             |
| performance_schema |
| school             |
| sys                |
| test1              |
| world              |
| xyz                |
+--------------------+

mysql> flush privileges; #刷新权限
mysql> ^DBye
[root@db01 ~]# mysql -uroot -h 192.168.56.2 -P3307 -p //再次登陆就需要账号密码了
Enter password:
```

5.3 截取备份时刻到宕机之前的binlog
[基于GTDI截取](https://pincheng.org/forward/93ea067.html#1-5%E5%9F%BA%E4%BA%8EGTDI%E6%88%AA%E5%8F%96)：
[基于Position截取](https://pincheng.org/forward/663d93c2.html#%E6%8C%89%E9%9C%80%E6%88%AA%E5%8F%96%E6%97%A5%E5%BF%97)：查看备份文件的
```bash
mysql> show binlog events in "mysql-bin.000022";
根据全备中的binlog日志文件，和gtid号，找到全备之后到宕机之前的日志
应当是：GTID=15开始 到最后结尾

mysqlbinlog --skip-gtids --include-gtids='cca7bb3f-687e-11ea-b0d9-0800273e0795:15-19' /data/3307/mysql-bin.000022 >/tmp/binlog-000022.sql

或者

mysqlbinlog --skip-gtids --start-position=194 --stop-position=1325 /data/3307/mysql-bin.000022 >/tmp/bin.sql
```

5.4 binlog.sql恢复
```bash
set sql_log_bin=0;
source /tmp/binlog-000022.sql

mysql> use mdp;
Database changed
mysql> show tables;
+---------------+
| Tables_in_mdp |
+---------------+
| t1            |
+---------------+
1 row in set (0.00 sec)

mysql> select * from t1;
+------+
| id   |
+------+
|    1 |
|    2 |
|    3 |
|   20 |
|   20 |
|   20 |
+------+
```

#### 单表恢复具体过程：
```bash
mysql> use world;
mysql> show tables;
+-----------------+
| Tables_in_world |
+-----------------+
| city            |
| city1           |
| country         |
| countrylanguage |
+-----------------+
mysql> drop table city1;
```

思路：
```bash
从全备获取获取单库以及所有表的备份
# sed -n '/^-- Current Database: `world`/,/^-- Current Database: `/p' all.sql >world.sql
只截取db1库的二进制日志
# mysqlbinlog -d db1 --stop-position=974 /data/mysql/mysql-bin.000003 >/tmp/part.sql
获得表结构
# sed -e'/./{H;$!d;}' -e 'x;/CREATE TABLE `city1`/!d;q'  alL_2020-04-20.sql>city1.sql
获得INSERT INTO 语句，用于数据的恢复
# grep -i 'INSERT INTO `city1`'  alL_2020-04-20.sql >city1_data.sql
```

恢复：
```bash
mysql> set sql_log_bin=0;
mysql> source /tmp/city1.sql;
mysql> source /tmp/city1_data.sql
Query OK, 20395 rows affected (0.25 sec)
Records: 20395  Duplicates: 0  Warnings: 0
mysql> select * from city1;
+-------+------------------------------------+-------------+------------------------+------------+
| ID    | Name                               | CountryCode | District               | Population |
+-------+------------------------------------+-------------+------------------------+------------+
|     1 | Kabul                              | AFG         | Kabol                  |    1780000 |
```

## 6.XtraBackup简介及安装
### 6.1安装
安装依赖包：
```bash
wget -O /etc/yum.repos.d/epel.repo http://mirrors.aliyun.com/repo/epel-7.repo
yum -y install perl perl-devel libaio libaio-devel perl-Time-HiRes perl-DBD-MySQL libev
```
安装rpm包：
```bash
CentOS7:
wget https://www.percona.com/downloads/XtraBackup/Percona-XtraBackup-2.4.12/binary/redhat/7/x86_64/percona-xtrabackup-24-2.4.12-1.el7.x86_64.rpm
CentOS6:
https://www.percona.com/downloads/XtraBackup/Percona-XtraBackup-2.4.4/binary/redhat/6/x86_64/percona-xtrabackup-24-2.4.4-1.el6.x86_64.rpm

[root@db01 ~]# yum -y install percona-xtrabackup-24-2.4.4-1.el6.x86_64.rpm 
```

### 6.2备份命令介绍:
xtrabackup
innobackupex    ******

### 6.3 备份方式——物理备份
（1）对于非Innodb表（比如 myisam）是，锁表cp数据文件，属于一种温备份。
（2）对于Innodb的表（支持事务的），不锁表，拷贝数据页(触发[CKPT](https://pincheng.org/forward/bc8a646.html)将脏页也刷写到磁盘)，最终以数据文件的方式保存下来，把一部分redo和undo一并备走，属于热备方式。

**面试题**： xbk 在innodb表备份恢复的流程
0、xbk备份执行的瞬间,立即触发ckpt,已提交的数据脏页,从内存刷写到磁盘,并记录此时的LSN号
1、备份时，拷贝磁盘数据页，并且记录备份过程中产生的redo和undo一起拷贝走,也就是checkpoint LSN之后的日志
2、在恢复之前，模拟Innodb“自动故障恢复”的过程，将redo（前滚）与undo（回滚）进行应用
3、恢复过程是cp 备份到原来数据目录下

**备份过程**：
   1. ckpt ，记录ckpt后LSN ,to  lsn
   2. 拷贝数据页 ，保存为数据文件
   3. 自动将备份过程redo，会一并备份走，提取redo当中最后的last LSN
   
**恢复**： 
   1. 其实就是模拟了[CSR](https://pincheng.org/forward/bc8a646.html)过程
   2. 对比LAST LSN ,to lsn
   3. 使用redo进行前滚，对未提交的事务进行回滚
   4. 最后得到一个一致性备份

```bash
物理备份，类型cp 数据目录下的数据文件到备份路径
MyIsam，进行锁表备份
innodb，进行热备，备份数据的同时，会将备份过程中产生的数据变化(redo+undo)。
在恢复时，提前进行备份准备，“合并”redo和undo到全备数据文件，前滚和回滚的过程。
模拟的MySQL的CSR
```
### 6.3 innobackupex使用
### 6.4全备
`[root@db01 backup]# innobackupex --user=root --password=123  /data/bak`
//依赖于mysql的配置文件，否则需要手工指定
```bash
[root@db01 ~]# mkdir -p /tmp/my_bak/

vim /data/3307/my.cnf
注意：
备份工具是依赖于/etc/my.cnf   
[mysqld] 
[client]
socket=/data/3307/mysql.sock //依赖
或
[innobackupex]
socket=/data/3307/mysql.sock
```

如果说配置文件没有在/etc  ，可以如下操作
```bash
[root@db01 ~]# innobackupex --defaults-file=/data/3307/my.cnf --user=root --password=123  /tmp/my_bak/
200422 11:15:33 completed OK!
```
自主定制备份路径名
`[root@db01 backup]# innobackupex --defaults-file=/data/3307/my.cnf --user=root --password=123 --no-timestamp /data/bak/full_$(date +%F)`

备份文件说明：
```bash
[root@db01 /tmp/my_bak/2020-04-22_11-15-31]# ll
总用量 12344
-rw-r----- 1 root root       63 4月  22 11:15 xtrabackup_binlog_info
mysql-bin.000024        194     cca7bb3f-687e-11ea-b0d9-0800273e0795:1-19
//二进制日志文件        position号    GTID
//记录的是备份时刻，binlog的文件名字和当时的结束的position，可以用来作为截取binlog时的起点。

-rw-r----- 1 root root      115 4月  22 11:15 xtrabackup_checkpoints
backup_type = full-backuped
from_lsn = 0    //上次所到达的LSN号(对于全备就是从0开始,对于增量有别的显示方法)
to_lsn = 11690217    //备份开始时间(ckpt)点数据页的LSN  
last_lsn = 11690226    //备份结束后，redo日志最终的LSN（前后差9个，其实是一样的。被gtid占用。在5.7以后的版本）
compact = 0
recover_binlog_info = 0
//LSN号的记录，用于恢复后进行CSR。保证恢复后数据的一致性

-rw-r----- 1 root root      574 4月  22 11:15 xtrabackup_info
uuid = 86e77f87-8447-11ea-a606-0800273e0795
name = 
tool_name = innobackupex
tool_command = --defaults-file=/data/3307/my.cnf --user=root --password=... /tmp/my_bak/
tool_version = 2.4.12
ibbackup_version = 2.4.12
server_version = 5.7.26-log
start_time = 2020-04-22 11:15:31
end_time = 2020-04-22 11:15:32
lock_time = 0
binlog_pos = filename 'mysql-bin.000024', position '194', GTID of the last change 'cca7bb3f-687e-11ea-b0d9-0800273e0795:1-19'
innodb_from_lsn = 0
innodb_to_lsn = 11690217
partial = N
incremental = N
format = file
compact = N
compressed = N
encrypted = N
//总体信息

-rw-r----- 1 root root     2560 4月  22 11:15 xtrabackup_logfile
//部分rudo的数据，在备份过程中产生的新的数据变化
```

### 6.5全备恢复
利用xtrabackup工具进行全备恢复的过程：
 -  恢复了全备
 -  CSR利用备份中以备份好的部分redo和undo日志对备份进行前滚和回滚操作
```bash
[root@db01 ~]# pkill mysqld
[root@db01 ~]# mysql -uroot -h 192.168.56.2 -P3307 -p
Enter password: 
ERROR 2003 (HY000): Can't connect to MySQL server on '192.168.56.2' (111)
[root@db01 ~]# \rm -rf /data/3307/data/*
[root@db01 ~]# ls /data/3307/data/
```

prepare阶段：
 - 在备份完成后，数据不能直接用于生产恢复操作，因为备份的数据中可能会包含尚未提交的事务或已经提交但尚未同步至数据文件中的事务。
 - 因此，此时数据文件仍处于不一致状态。“准备”的主要作用正是通过回滚未提交的事务及同步已经提交的事务至数据文件也使得数据文件处于一致性状态（追平LSN号）。
 - 将redo进行重做，已提交的写到数据文件，未提交的使用undo回滚掉。模拟了CSR的过程
```bash
[root@db01 ~]# innobackupex --apply-log /tmp/my_bak/2020-04-22_11-15-31/
200422 14:12:27 completed OK!
```

**恢复备份**
前提：
 - 被恢复的目录是空
 - 被恢复的数据库的实例是关闭
```bash
[root@db01 ~]# cp -a /tmp/my_bak/2020-04-22_11-15-31/* /data/3307/data/
[root@db01 ~]# chown -R mysql.mysql /data/3307/data/
[root@db01 ~]# systemctl restart mysqld3307
[root@db01 ~]# mysql -uroot -h 192.168.56.2 -P3307 -p
Enter password: 
mysql> show databases;
```

### 6.6XBK增量备份
**备份方式**：基于上次的备份的增量
**恢复方式**：增量备份不能单独恢复，必须合并到全备中，一起恢复
#### 6.6.1 周日全备
```bash
innobackupex --defaults-file=/data/3307/my.cnf --user=root --password=123 --no-timestamp /tmp/my_bak/full_$(date +%F)
200422 15:00:24 completed OK!
```
#### 6.6.1 模拟周一变化
```bash
create database xbk charset utf8mb4;	
use xbk
create table t1(id int);
insert into t1 values(1),(2),(3);
commit;
```

#### 6.6.2 模拟周一晚上的增量备份
```bash
innobackupex --defaults-file=/data/3307/my.cnf --user=root --password=123 --no-timestamp --incremental --incremental-basedir=/tmp/my_bak/full_2020-04-22/ /tmp/my_bak/inc1_$(date +%F)
200422 15:06:36 completed OK!
--no-timestamp //备份目录不带时间戳
--incremental //增量备份
--incremental-basedir //指定上一次备份的路径
```

#### 6.6.3 模拟周二变化
```bash
use xbk
create table t2(id int);
insert into t2 values(1),(2),(3);
commit;
```

#### 6.6.4 模拟周二晚上的增量备份
```bash
innobackupex --defaults-file=/data/3307/my.cnf --user=root --password=123 --no-timestamp --incremental --incremental-basedir=/tmp/my_bak/inc1_2020-04-22/ /tmp/my_bak/inc2_$(date +%F)
200422 15:12:38 completed OK!
```

#### 6.6.4 检查备份
```bash
[root@db01 ~]# cat /tmp/my_bak/full_2020-04-22/xtrabackup_checkpoints /tmp/my_bak/inc1_2020-04-22/xtrabackup_checkpoints /tmp/my_bak/inc2_2020-04-22/xtrabackup_checkpoints
backup_type = full-backuped
from_lsn = 0
to_lsn = 11692091
last_lsn = 11692100 //减9 比较下一个from_lsn
compact = 0
recover_binlog_info = 0

backup_type = incremental
from_lsn = 11692091 //加9 比较上一个last_lsn
to_lsn = 11707474
last_lsn = 11707483  //减9 比较下一个from_lsn
compact = 0
recover_binlog_info = 0
backup_type = incremental

from_lsn = 11707474  //加9 比较上一个last_lsn
to_lsn = 11713070
last_lsn = 11713079
compact = 0
recover_binlog_info = 0
```

### 6.7XBK增量恢复
**思路**：合并所以增量到全备，每个XBK备份都需要恢复准备（prepare）
--apply-log（该回滚的回滚，该前滚的前滚）   --redo-only（防止LSN号出现断点，防止回滚）
#### 1. 整理全备：
```bash
[root@db01 ~]# innobackupex --apply-log --redo-only /tmp/my_bak/full_2020-04-22/
200422 15:44:55 completed OK!
```

#### 2. 合并周一增量并整理到全备
```bash
[root@db01 ~]# innobackupex --apply-log --redo-only --incremental-dir=/tmp/my_bak/inc1_2020-04-22/ /tmp/my_bak/full_2020-04-22/
                               追平LSN。   防止UNDO     需要合并的增备                                  合并到哪里
200422 16:32:04 completed OK!
此时 5.4.2中 block1的last_lsn应该等于block2的last_lsn
```

#### 3. 合并周二增量并整理到全备
```bash
[root@db01 ~]# innobackupex --apply-log --incremental-dir=/tmp/my_bak/inc2_2020-04-22/ /tmp/my_bak/full_2020-04-22/
200422 16:38:30 completed OK!
最后一次合并不需要加--redo-only

此时 5.4.2中 block1的last_lsn应该等于block3的last_lsn
```

#### 4. 再次整理全备
```bash
innobackupex --apply-log /tmp/my_bak/full_2020-04-22/
200422 16:42:39 completed OK!
```

#### 5. 全备+增量恢复
```bash
恢复：
[root@db01 ~]# innobackupex --defaults-file=/data/3307/my.cnf --copy-back /tmp/my_bak/full_2020-04-22/
                             这个参数必须放第一位
200422 16:47:40 completed OK!
授权：
[root@db01 ~]# chown -R mysql.mysql /data/3307/data/
[root@db01 ~]# systemctl restart mysqld3307
[root@db01 ~]# mysql -uroot -h 192.168.56.2 -P3307 -p
```

### 5.8 企业备份恢复案例（XBK full+inc+binlog）
**案例背景**： 某中型互联网公司。MySQL 5.7.26 ，Centos 7.6 ，数据量级600G，每日数据增量15-50M
**备份策略**： 周日XBK全备+周一到周六inc增量+binlog备份，每天23:00进行。
**故障描述**： 周三下午2点，数据由于某原因数据损坏。
**处理思路**： 
  1. 挂出维护页
  2. 评估一下数据损坏状态
   - 2.1 全部丢失-->推荐直接生产恢复
   - 2.2 部分丢失
 3. 整理合并所有备份：full+inc1+inc2 
 4. 截取 周二晚上到周三下午午故障点的binlog日志
 5. 恢复全备，恢复binlog
 6. 检查数据完整性
 7. 恢复业务

**处理结果**：
 1. 经过70-80分钟处理，业务恢复
 2. 评估此次故障的处理的合理性和实用性

**案例模拟**：
#### 1. 模拟周日的全备
```bash
innobackupex --defaults-file=/data/3307/my.cnf --user=root --password=123 --no-timestamp /tmp/my_bak/full //全备

cat /tmp/my_bak/full/xtrabackup_checkpoints //检查备份
backup_type = full-backuped
from_lsn = 0
to_lsn = 11713915
last_lsn = 11713924
compact = 0
recover_binlog_info = 0
```
#### 2. 模拟周一的数据变化
```bash
mysql> create database hisoss charset utf8mb4;
mysql> use hisoss
mysql> create table his_order(id int);
mysql> insert into his_order values(1),(2),(3);
mysql> commit;
```
#### 3. 模拟周一晚上增量备份
```bash
innobackupex --defaults-file=/data/3307/my.cnf --user=root --password=123 --no-timestamp --incremental --incremental-basedir=/tmp/my_bak/full/ /tmp/my_bak/inc1

检查备份：
[root@db01 ~]# cat /tmp/my_bak/full/xtrabackup_checkpoints 
backup_type = full-backuped
from_lsn = 0
to_lsn = 11713915
last_lsn = 11713924 //
compact = 0
recover_binlog_info = 0
[root@db01 ~]# cat /tmp/my_bak/inc1/xtrabackup_checkpoints 
backup_type = incremental
from_lsn = 11713915 //
to_lsn = 11720266
last_lsn = 11720275
compact = 0
recover_binlog_info = 0
```
#### 4. 模拟周二的数据变化
```bash
insert into his_order values(11),(22),(33);
commit;
```
#### 5. 模拟周二晚上增量备份
```bash
innobackupex --defaults-file=/data/3307/my.cnf --user=root --password=123 --no-timestamp --incremental --incremental-basedir=/tmp/my_bak/inc1 /tmp/my_bak/inc2

检查备份：
[root@db01 ~]# cat /tmp/my_bak/full/xtrabackup_checkpoints backup_type = full-backuped
from_lsn = 0
to_lsn = 11713915
last_lsn = 11713924 //
compact = 0
recover_binlog_info = 0
[root@db01 ~]# cat /tmp/my_bak/inc1/xtrabackup_checkpoints backup_type = incremental
from_lsn = 11713915  //
to_lsn = 11720266
last_lsn = 11720275  //
compact = 0
recover_binlog_info = 0
[root@db01 ~]# cat /tmp/my_bak/inc2/xtrabackup_checkpoints 
backup_type = incremental
from_lsn = 11720266  //
to_lsn = 11722449
last_lsn = 11722458
compact = 0
recover_binlog_info = 0
```
#### 6. 模拟周三的数据变化
```bash
insert into his_order values(111),(222),(333);
commit;
```

#### 7. 有一个傻子，把数据库data目录给rm掉了
```bash
pkill mysqld
\rm -rf /data/3307/data/*
```

#### 8.整理 合并 备份
（1）整理全备 `innobackupex --apply-log --redo-only /tmp/my_bak/full/`
（2）inc1 合并并整理到full `innobackupex --apply-log --redo-only --incremental-dir=/tmp/my_bak/inc1 /tmp/my_bak/full/`
（3）inc2 合并并整理到full `innobackupex --apply-log --redo-only --incremental-dir=/tmp/my_bak/inc2 /tmp/my_bak/full/`
（4）检查备份是否整理完整

```bash
cat /tmp/my_bak/full/xtrabackup_checkpoints /tmp/my_bak/inc2/xtrabackup_checkpoints

last_lsn = 11722458

last_lsn = 11722458
```
（5）整体整理在做一次`innobackupex --apply-log /tmp/my_bak/full/`

#### 9. 恢复备份数据
```bash
cp -na /tmp/my_bak/full/* /data/3307/data/  拷贝
chown -R mysql.mysql /data/3307/data/* 授权
systemctl restart mysqld3307
```

#### 10. 从最后一次增备中查看binlog起点
```bash
[root@db01 ~]# cat /tmp/my_bak/inc2/xtrabackup_binlog_info 
mysql-bin.000027        1136    bd623560-8476-11ea-ba73-0800273e0795:1-4, //看这个，在数据库中也是这个UUID:GTID
cca7bb3f-687e-11ea-b0d9-0800273e0795:1-19,
dd4ce0c3-8463-11ea-9af9-0800273e0795:1-8
[root@db01 ~]# mysql -uroot -h 192.168.56.2 -P3307 -p
Enter password: 
mysql> show binlog events in 'mysql-bin.000027';
| mysql-bin.000027 | 1136 | Gtid           |         7 |        1201 | SET @@SESSION.GTID_NEXT= 'bd623560-8476-11ea-ba73-0800273e0795:5'                  
| mysql-bin.000027 | 1201 | Query          |         7 |        1275 | BEGIN                                                                               
| mysql-bin.000027 | 1275 | Table_map      |         7 |        1329 | table_id: 482 (hisoss.his_order)                                                    
| mysql-bin.000027 | 1329 | Write_rows     |         7 |        1379 | table_id: 482 flags: STMT_END_F                                                     
| mysql-bin.000027 | 1379 | Xid            |         7 |        1410 | COMMIT /* xid=91 */                                                                 
| mysql-bin.000027 | 1410 | Stop           |         7 |        1433 |                                                                                     

//分析：通过检查最后一次增备中记录的binlog日志文件（000027）信息，和最后一个GTID号为4。所以我们只需要截取 GTID=4 往后的日志内容。这里只有一个事务 GTID=5. 

截取日志：
[root@db01 ~]# mysqlbinlog --skip-gtids --include-gtids='bd623560-8476-11ea-ba73-0800273e0795:5' /data/3307/mysql-bin.000027 > /tmp/my_bak/bin.sql

恢复：
mysql> set sql_log_bin=0;
mysql> source /tmp/my_bak/bin.sql

检查：
mysql> use hisoss;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
mysql> show tables;
+------------------+
| Tables_in_hisoss |
+------------------+
| his_order        |
+------------------+
1 row in set (0.00 sec)

mysql> select * from his_order;
+------+
| id   |
+------+
|    1 |
|    2 |
|    3 |//周一
|   11 |
|   22 |
|   33 |//周二
|  111 |
|  222 |
|  333 |//周三
+------+
9 rows in set (0.00 sec)
```
#### 11. 部分数据丢失处理方法
假如，只是少量数据被损坏，以上方法有哪些不妥的地方？
```bash
处理方法：
    找到表结构，建表语句。
    从备份中提取指定表的ibd文件
进行表空间迁移
alter table t1  discard tablespace
alter table t1  import  tablespace
```

```bash
innobackupex --user=root --password=123 --defaults-file=/etc/my.cnf --no-timestamp --stream=tar --use-memory=256M  --parallel=8 /data/mysql_backup | gzip | ssh root@10.0.0.52 " cat - > /data/mysql_backup.tar.gz"

 --stream=tar //启用流的压缩方式进行备份
 --use-memory=256M  //指定划分部分内存大小
 --parallel=8  //开启并发备份
 --ssh root@10.0.0.52 " cat - > /data/mysql_backup.tar.gz"  //将本地备份好的备份，推送到远程服务器上
```

## 7.MySQL数据迁移
### 7.2技术方面
- 工具选择，MDP/XBK
### 7.3其他
- 停机时间
- 回退方案

### 7.1更换服务器
#### 7.1.1数据量小
思路：
1. 在线进行 MDP，XBK备份处理，scp到目标进行恢复
2. 追加所有备份后的binlog日志
3. 申请停机
4. 剩余部分的binlog继续恢复（搭建主从的方式替代）
5. 校验数据，进行业务各界割接

#### 7.1.2数据量大
1. XBK备份处理，scp到目标进行恢复
2. 搭建主从的方式
3. 申请停机15分钟
4. 校验数据，进行业务各界割接


### 7.3换版本升级（如5.6-->5.7）
1. 安装新版本 
2. 替换旧的环境变量
3. mysqld_safe //启动到维护模式拉起数据
4. mysql_upgrade //重建数据字典
或：
1. 建议使用mysqldump逻辑备份方式，按业务库为单位进行备份（排除：information_schema,performance_schema,sys）。
2. mysql_upgrade //重建数据字典
3. 追加日志
或：
不同版本进行主从复制，进行过滤复制，（排除：information_schema,performance_schema,sys）

### 7.4异构迁移（win->linux）
只能用逻辑备份！

### 7.5异构迁移（数据库产品不同）
Oracle --OGG--> MySQL
MySQL--到处为CSV格式-->MongoDB
MySQL--JSON-->MongoDB