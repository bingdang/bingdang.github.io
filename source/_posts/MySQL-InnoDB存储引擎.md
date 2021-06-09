---
title: MySQL-InnoDB存储引擎&优化
author: 饼铛
tags:
  - MySQL
categories:
  - DBA
cover: /images/img-71.png
abbrlink: 3053135c
date: 2020-04-11 21:32:00
---
### 存储引擎
	目标：熟悉InnoDB核心原理：ACID MVCC,事务,锁等
### 1. 介绍
	类似于Linux系统中文件系统
### 2. 功能
- 数据读写
- 数据安全和一致性
- 提高性能
- 热备份
- 自动故障恢复
- 高可用方面支持 等.
---
### 3. 种类
#### 3.1 Oracle的MySQL的引擎
- InnoDB
- MyISAM
- CSV
- MEMORY
- ARCHIVE

```bash
mysql> show engines;   //查看支持的存储引擎 
mysql> select table_schema,table_name ,engine   //查看所有InnoDB的表
from information_schema.tables 
where engine='innodb';
```

##### 说明：
	存储引擎是作用在表上的，也就意味着，不同的表可以有不同的存储引擎类型。
#### 3.2 其他MySQL的引擎
- PerconaDB:默认是XtraDB
- MariaDB:默认是InnoDB

##### 其他的存储引擎支持:
- TokuDB    
- RocksDB
- MyRocks

##### 以上三种存储引擎的共同点:压缩比较高,数据插入性能极高
**现在很多的NewSQL,使用比较多的功能特性.**

---
#### 1）项目案例——监控系统架构整改
- 环境: zabbix 3.2    mariaDB 5.5  centos 7.3
**现象:** zabbix卡的要死 ,  每隔3-4个月,都要重新搭建一遍zabbix,存储空间经常爆满.
##### 问题 :
 1. zabbix 版本 
 2. 数据库版本
 3. zabbix数据库500G,存在一个文件

##### 优化建议:
 1. 数据库版本升级到10.0版本,zabbix升级更高版本
 2. 存储引擎改为tokudb
 3. 监控数据按月份进行切割(二次开发:zabbix 数据保留机制功能重写,数据库分表)
 4. 关闭binlog和双1
 5. 参数调整....
优化结果：监控状态良好

##### 为什么?
 1. 原生态支持TokuDB,另外经过测试环境,10.0要比5.5 版本性能 高  2-3倍
 2. TokuDB:insert数据比Innodb快的多，数据压缩比要Innodb高
 3. 监控数据按月份进行切割,为了能够truncate每个分区表,立即释放空间
 4. 关闭binlog ----->减少无关日志的记录.zabbix不需要注重安全，注重性能
 5. 参数调整...----->安全性参数关闭,提高性能.
---
#### 2）项目案例——单机web环境下的mysql优化
- 环境: centos 5.8 ,MySQL 5.0版本,MyISAM存储引擎,网站业务(LNMP),数据量50G左右
**现象问题:**业务压力大的时候,非常卡;经历过宕机,会有部分数据丢失.

##### 问题分析:
 1. MyISAM存储引擎表级锁,在高并发时,会有很高锁等待
 2. MyISAM存储引擎不支持事务,在断电时,会有可能丢失数据

##### 职责：
1.监控锁的情况:有很多的表锁等待 
2.存储引擎查看:所有表默认是MyISAM

##### 解决方案:
 1. 升级MySQL 5.6.10版本
 2. 迁移所有表到新环境
 3. 开启双1安全参数
 4. 重新主从
---
### 4.InnoDB 核心特性：
![InnoDB](/images/img-51.png)

#### 4.1InnoDB和MyISAM 区别：
**InnoDB：支持事物，行锁，MVCC多版本并发控制，支持外键，支持热备，支持自动故障恢复（CSR）**
- 1、事务（Transaction）
- 2、MVCC（Multi-Version Concurrency Control多版本并发控制）
- 3、行级锁(Row-level Lock)
- 4、ACSR（Auto Crash Safey Recovery）自动的故障安全恢复
- 5、支持热备份(Hot Backup)
- 6、复制Replication: Group Commit , GTID (Global Transaction ID) ,多线程(MTS,Multi-Threads-SQL ) 
**MyISAM：不支持**

### 5. 存储引擎操作类命令
![1](/images/img-54.png)
#### 5.1 使用 SELECT 确认会话存储引擎
```bash
SELECT @@default_storage_engine;
mysql> show variables like '%engine%';
```
#### 5.2 默认存储引擎设置(不代表生产操作)
会话级别:
`set default_storage_engine=myisam;`
全局级别(仅影响新会话):
`set global default_storage_engine=myisam;`
**重启之后,所有参数均失效.**
如果要永久生效:
写入配置文件
```bash
vim /etc/my.cnf
[mysqld]
default_storage_engine=myisam
存储引擎是表级别的,每个表创建时可以指定不同的存储引擎,但是我们建议统一为innodb.
```
##### 扩展： 
**在线修改MySQL参数：
会话级别，例如：**
`set default_storage_engine=myisam;`
**功能：只会影响到当前会话
全局级别，例如：**
`set global default_storage_engine=myisam;`
**功能: 不影响当前和历史会话，只影响到新开的会话
以上两种方法，在重启之后会失效，除非参数添加至**`my.cnf`

#### 5.3 SHOW 确认每个表的存储引擎：
```bash
SHOW CREATE TABLE City\G;
SHOW TABLE STATUS LIKE 'CountryLanguage'\G
```
#### 5.4 INFORMATION_SCHEMA 确认每个表的存储引擎
```bash
[world]>select table_schema,table_name ,engine 
from information_schema.tables 
where table_schema not in ('sys','mysql','information_schema','performance_schema');
```
#### 5.5 修改一个表的存储引擎
`db01 [oldboy]>alter table t1 engine innodb;`
**注意：**此命令我们经常使用他，进行innodb表的碎片整理
**生产需求：**
将oldboy数据库下的所有1000表，存储引擎从MyISAM替换为innodb 
```bash
select concat("alter table ",table_name," engine Innodb") 
from information_schema.tables 
where table_schema='oldboy'
into outfile '/tmp/alter.sql';
```
#### 5.6 平常处理过的MySQL问题--碎片处理
**环境:**`centos7.4`,`MySQL 5.7.20`,`InnoDB`存储引擎
**业务特点:**数据量级较大,经常需要按月删除历史数据.
**问题:**磁盘空间占用很大,不释放
**处理方法:**
**以前:**将数据逻辑导出,手工drop表,然后导入进去
**现在:**
对表进行按月进行分表(partition,中间件)
业务替换为truncate方式

**定期执行：**
`alter table t1 engine='innodb';`

#### 5.6 扩展:如何批量修改
**需求:** 将zabbix库中的所有表,innodb替换为tokudb
```bash
select concat("alter table zabbix.",table_name," engine tokudb;") 
from information_schema.tables 
where table_schema='zabbix' into outfile '/tmp/tokudb.sql';
```

### 6. 最直观的存储方式(/data/mysql/data)
- `ib_buffer_pool`：热数据缓存数据，下次启动优先加载。
- `ibdata1`：系统数据字典信息(整个数据库统计信息，表的元数据)，UNDO（回滚）表空间等数据。又被称为共享表空间
- `ib_logfile0 ~ ib_logfile1`: REDO（重做日志）日志文件，事务日志文件。
- `ibtmp1`： 临时表空间磁盘位置，存储临时表
- `frm`：存储表的列信息
- `ibd`：表的数据行和索引

![宏观结构](/images/img-55.png)
#### 6.1 表空间(Tablespace)
##### 6.1.1 共享表空间(ibdata1)
- 需要将所有数据存储到同一个表空间中 ，管理比较混乱
- 5.5版本出现的管理模式，也是默认的管理模式。（数据字典，undo，临时表，索引，表数据）
- 5.6版本以，共享表空间保留，只用来存储:数据字典信息,undo,临时表。
- 5.7 版本,临时表被独立出来了
- 8.0版本,undo也被独立出去了

![微观结构](/images/img-56.png)
**具体变化参考官方文档:**
[https://dev.mysql.com/doc/refman/5.6/en/innodb-architecture.html](https://dev.mysql.com/doc/refman/5.6/en/innodb-architecture.html)
[https://dev.mysql.com/doc/refman/5.7/en/innodb-architecture.html](https://dev.mysql.com/doc/refman/5.7/en/innodb-architecture.html)
[https://dev.mysql.com/doc/refman/5.8/en/innodb-architecture.html](https://dev.mysql.com/doc/refman/5.7/en/innodb-architecture.html)

##### 6.1.2 共享表空间设置
```bash
共享表空间设置(在搭建MySQL时，初始化数据之前设置到参数文件中)
mysql> select @@innodb_file_per_table;  //查看表空间模式 1为独立，0为共享。
	共享表空间将表的数据行及索引放到了ibdata1中（没有ibd文件）。耦合性过大
mysql> set global innodb_file_per_table=0; //设置表空间模式为共享表空间模式

[(none)]>select @@innodb_data_file_path;//查看共享表空间
[(none)]>show variables like '%extend%'; //查看每次自增大小
innodb_data_file_path=ibdata1:512M:ibdata2:512M:autoextend  //在初始化之前设置共享表空间大小，加入配置文件
innodb_autoextend_increment=64 //自增大小
innodb_file_per_table=1  是否使用共享以及独占表空间（1 为使用独占表空间，0 为使用共享表空间）
```
##### 6.1.3 独立表空间
- 从5.6，默认表空间不再使用共享表空间，替换为独立表空间。
- 主要存储的是用户数据
- 存储特点为：一个表一个ibd文件，存储数据行和索引信息
**基本表结构元数据存储：**xxx.frm
```bash
最终结论：
      元数据            数据行+索引
mysql表数据    =（ibdataX+frm）+ibd(段、区、页)
       DDL             DML+DQL
```

##### 思考：
问：为啥不能把ibd和frm文件直接拷到新的数据库直接打开呢？
答：因为innodb的数据表是由ibdataX（数据字典）+frm（表结构文件）+ibd（数据行+索引）构成的。（myisam可以直接拷贝打开）

### 7.0 表空间迁移
`alter table  confulence.t1 discard tablespace;`  //仅删除ibd文件
`alter table confulence.t1 import tablespace;` //倒入ibd文件，注意权限

#### 硬件及软件环境:
- 联想服务器（IBM） 
- 磁盘500G 没有raid
- centos 6.8
- mysql 5.6.33  innodb引擎  独立表空间
- 备份没有，日志也没开
- 开发用户专用库:
 - jira(bug追踪) 、 confluence(内部知识库)    ------>LNMT

#### 故障描述:
- 断电了，启动完成后“/” 只读
 - fsck  重启,系统成功启动,mysql启动不了。//修复系统，但可能会破坏数据
- 结果：confulence库在  ， jira库不见了

#### 解决confulence过程
##### 需求：能不能暂时把confulence库先打开用着
**将生产库`confulence`，拷贝到1:1虚拟机上`/var/lib/mysql`,直接访问时访问不了的**

**问：有没有工具能直接读取ibd
我说：我查查，最后发现没有**

我想出一个办法来：
表空间迁移:
```bash
create table xxx
alter table  confulence.t1 discard tablespace;
alter table confulence.t1 import tablespace;
```
虚拟机测试可行。

处理问题思路:
`confulence`库中一共有107张表。

#### 1、创建107和和原来一模一样的表。
他有2016年的历史库，我让他去他同时电脑上 mysqldump备份confulence库
```bash
mysqldump -uroot -ppassw0rd -B  confulence --no-data >test.sql   //只导出建表语句
```
**拿到你的测试库，进行恢复，到这步为止，表结构有了。**

#### 2、表空间删除。
```bash
select concat('alter table ',table_schema,'.'table_name,' discard tablespace;') 
from information_schema.tables 
where table_schema='confluence' 
into outfile '/tmp/discad.sql';
```
进入测试库执行语句
`source /tmp/discard.sql`
执行过程中发现，有20-30个表无法成功。主外键关系，很绝望，一个表一个表分析表结构，很痛苦。
`set foreign_key_checks=0` 跳过外键检查，再执行。
把有问题的表表空间也删掉了。

#### 3、拷贝生产中confulence库下的所有表的ibd文件拷贝到准备好的环境中
```bash
select concat('alter table ',table_schema,'.'table_name,' import tablespace;') 
from information_schema.tables 
where table_schema='confluence' 
into outfile '/tmp/import.sql';   //对拷出的ibd文件进行批量导入
```
#### 4、验证数据
**表都可以访问了，数据挽回到了出现问题时刻的状态**

### 8.0 InnoDB核心参数
#### 双1标准其1： 
```bash
innodb_flush_log_at_trx_commit=1
#介绍：控制了redo buffer 刷写策略，是一个安全参数，在5.6版本以上的默认参数。
```

#### 查看:
```bash
mysql> select @@innodb_flush_log_at_trx_commit;
+----------------------------------+
| @@innodb_flush_log_at_trx_commit |
+----------------------------------+
|                                1 |
+----------------------------------+  
```

#### 作用：
- 主要控制了innodb将log buffer中的数据写入日志文件并flush磁盘的时间点，取值分别为0、1、2三个，是一个安全参数，是在5.6以上的默认的参数
 - 1:每次事务提交，都会立即刷写redo到磁盘（完美安全）
（redo buffer ---每事务----os buffer---每事务---磁盘）
 - 0:表示当事务提交时，不立即做日志写入操作（注重性能，可能会丢失1秒的事务）
（redo buffer ---每秒----os buffer---每秒---磁盘）
 - 2:每次事务提交引起写入文件系统缓存
（redo buffer ---每事务----os buffer---每秒---磁盘）
适用情况:对于业务安全要求性高则1 

#### 刷写策略
![双1标准](/images/img-65.png)
`InnoDB_flush_method=(O__DIRECT)`
查看：
```bash
mysql> select @@innodb_flush_method;  //默认都走文件系统缓存
+-----------------------+
| @@innodb_flush_method |
+-----------------------+
| NULL                  |
+-----------------------+
show variables like '%innodb_flush%'
```
#### 作用：
控制了`redo buffer`和`data buffer`刷写磁盘的方式
`O_DIRECT`	:数据缓冲区写磁盘,不走OS buffer 日志走OS buffer 以后的工作标准
`fsync`		:日志和数据缓冲区写磁盘,都走OS buffer
`O_DSYNC`	:日志缓冲区写磁盘,不走 OS buffer 数据缓冲区走OS buffer

#### 使用建议：
##### 最高安全模式
```bash
innodb_flush_log_at_trx_commit=1  //每次事务提交，都会立即刷写redo到磁盘
innodb_flush_method=O_DIRECT //（必须大写），控制mysql数据脏页直接刷写到磁盘。redo依然会走操作系统缓存
```
##### 最大性能模式（适用于查询类到库，监控库）
```bash
innodb_flush_log_at_trx_commit=0 //表示当事务提交时，不立即做日志写入操作（注重性能，可能会丢失1秒的事务）
innodb_flush_method=fsync  //从mysql的脏页，写到操作系统缓存。一个内存结构到另一个内存结构所以性能高
```

![刷写策略](/images/img-81.png)

#### 关于redo设置
```bash
innodb_log_buffer_size=128M（4G内存）#起，和业务系统CPU压力有关（redo_buffer越大，可并发的事务量就越多，500M内）
innodb_log_file_size=256M		一般是log_buffer的1-2倍
innodb_log_files_in_group=3		redo.log个数3-4组
```
#### innodb_buffer_pool
```bash
select @@innodb_buffer_pool_size; //查看
+---------------------------+
| @@innodb_buffer_pool_size |
+---------------------------+
|                 134217728 |
+---------------------------+
```
**前提只有一个mysql实例 一般调整为物理内存的50%~80%，70以内就行**