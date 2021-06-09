---
title: MySQL-事务的ACID特性
author: 饼铛
tags:
  - ACID
  - MySQL
  - 事务
categories:
  - DBA
cover: /images/img-71.png
abbrlink: bc8a646
date: 2020-04-11 22:07:00
---
### 事务的ACID特性
#### 1.作用是什么？
- 影响了DML语句（insert  update   delete  一部分select）
- Atomic（原子性）》我收你发要么全部成功，要么一起失败，原子性(所有语句作为一个单元全部成功执行或全部取消。不能出现中间状态。)
- Consistent（一致性）》我发多少你收多少，不出现错误。一致性(如果数据库在事务开始时处于一致状态，则在执行该事务期间将保留一致状态。)
- Isolated（隔离性）》不能并发修改同一数据(事务之间不相互影响。)
- Durable（持久性）》不管宕机与否，业务操作都落地到磁盘中
(事务成功完成后，所做的所有更改都会准确地记录在数据库中。所做的更改不会丢失。)

![ACID](/images/img-57.png)
##### 定义：具备ACID特性的一组操作，被定义为事物

#### 2.事务的生命周期（事务控制语句）
![事务控制语句](/images/img-53.png)
##### 2.1 事务的开始
`begin; / start transaction;`
**说明:**在5.5 以上的版本，不需要手工begin，只要你执行的是一个DML，会自动在前面加一个begin命令。

##### 2.2 事务的结束
- `commit`：提交事务(完成一个事务，一旦事务提交成功 ，就说明具备ACID特性了。)
- `rollback`：回滚事务(将内存中，已执行过的操作，回滚回去)

##### 2.3 自动提交策略（autocommit）
```bash
db01 [(none)]>select @@autocommit;
db01 [(none)]>set autocommit=0;
db01 [(none)]>set global autocommit=0;

注：
自动提交是否打开，一般在有事务需求的MySQL中，将其关闭
不管有没有事务需求，我们一般也都建议设置为0，可以很大程度上提高数据库性能
(1)在线修改
set autocommit=0;   
set global autocommit=0;
(2)写入配置文件
vim /etc/my.cnf
autocommit=0   //开启后执行DML必须要commit(对事务进行提交)或者rollback( 对事物进行回滚)
```
##### 2.4 事务的隐式控制
用于隐式提交的SQL语句
```bash
begin <事物开始
a  //dml语句
b //dml语句
bengin <在同一会话中开启新事物，那么上面的事物会被提交
```
导致提交的非事务语句：
DDL语句： （ALTER、CREATE 和 DROP）
DCL语句： （GRANT、REVOKE 和 SET PASSWORD）
锁定语句： （LOCK TABLES 和 UNLOCK TABLES）

导致隐式提交的语句示例：
`TRUNCATE TABLE`
`LOAD DATA INFILE`
`SELECT FOR UPDATE`
在同一会话中，出现以上语句都会出发提交上一个事物。

##### 2.5 开始事务流程：
1、检查autocommit是否为关闭状态
`select @@autocommit;`
或者：
`show variables like 'autocommit';`
2、开启事务,并结束事务
```bash
begin
delete from student where name='alexsb';
update student set name='alexsb' where name='alex';
rollback;

begin
delete from student where name='alexsb';
update student set name='alexsb' where name='alex';
commit;
```

### 3. InnoDB 事务的ACID如何保证?
#### 3.1 一些概念

- `redo log` ---> 重做日志 ib_logfile0~1  50M ,轮询使用
	- redo log buffer ---> redo内存区
- `t1.ibd`     ----> 存储 数据行和索引 
	- buffer pool --->数据缓冲区池,数据和索引的缓冲(存放数据页的内存区域)
- `LSN` : 日志序列号 （数据页变更一次就加一个版本号）
- 磁盘数据页,redo文件,buffer pool,redo buffer

**注意：**MySQL 每次数据库启动,都会比较磁盘数据页和redolog的LSN,必须要求两者LSN一致数据库才能正常启动
- `WAL` : write ahead log 日志优先写的方式实现持久化，日志落地
- 脏页: 内存脏页,内存中发生了修改,没写入到磁盘之前,我们把内存页称之为脏页.
- `CKPT`:Checkpoint,检查点,就是将脏页刷写到磁盘的动作
- `TXID`: 事务号,`InnoDB`会为每一个事务生成一个事务号,伴随着整个事务.
![redo&undo](/images/img-52.png)

#### 3.2 redo log
##### 3.1.1 Redo是什么？
`redo`,顾名思义“重做日志”，是事务日志的一种。用于存放内存脏页变化过程的日志叫做redo日志。
![一些概念](/images/img-58.png)

##### 3.1.2 作用是什么？
在事务ACID过程中，实现的是“D”持久化的作用。对于AC也有相应的作用

##### 3.1.3 redo日志位置
redo的日志文件：iblogfile0 iblogfile1

##### 3.1.4 redo buffer
`redo`的`buffer`:数据页的变化信息+数据页当时的LSN号
`LSN`：日志序列号  磁盘数据页、内存数据页、redo buffer、redolog

##### 3.1.5 redo的刷新策略
`commit`;
刷新当前事务的redo buffer到磁盘
还会顺便将一部分redo buffer中没有提交的事务日志也刷新到磁盘

##### 3.1.6 MySQL CSR——前滚
MySQL : 在启动时,必须保证`redo日志`文件和`数据文件``LSN`必须一致, 如果不一致就会触发CSR,最终保证一致
#### 情况一:
**我们做了一个事务,begin;update;commit.**
- 1.在begin ,会立即分配一个TXID=tx_01.
- 2.update时,会将需要修改的数据页(dp_01,LSN=101),加载到data buffer中
- 3.DBWR线程,会进行dp_01数据页修改更新,并更新LSN=102
- 4.LOGBWR日志写线程,会将dp_01数据页的变化+LSN+TXID存储到redobuffer
- 5. 执行commit时,LGWR日志写线程会将redobuffer信息写入redolog日志文件中,基于WAL原则,在日志完全写入磁盘后,commit命令才执行成功,(会将此日志打上commit标记)
- 6.假如此时宕机,内存脏页没有来得及写入磁盘,内存数据全部丢失
- 7.MySQL再次重启时,必须要redolog和磁盘数据页的LSN是一致的.但是,此时dp_01,TXID=tx_01磁盘是LSN=101,dp_01,TXID=tx_01,redolog中LSN=102
- MySQL此时无法正常启动,MySQL触发CSR.在内存追平LSN号,触发ckpt,将内存数据页更新到磁盘,从而保证磁盘数据页和redolog LSN一值.这时MySQL正长启动
以上的工作过程,我们把它称之为基于REDO的"前滚操作"

![CSR前滚操作](/images/img-59.png)

#### 3.2 undo 回滚日志
##### 3.2.1 undo是什么？
存放调度到内存数据页原始的状态的日志叫做undo日志（记录数据页变化之前的数据状态以及TXID（数据页的id））
undo,顾名思义“回滚日志”

##### 3.2.2 作用是什么？
- 在事务ACID过程中，实现的是“A” 原子性的作用
- - 另外CI也依赖于Undo
- 在手动rolback（回滚）时,将数据恢复到修改之前的状态
- 在CSR（前滚）实现的是,将redo当中记录了未提交的事物时进行回滚.通过redo中为提交事务的txid找到undo中对应的txid进行关联

**未提交事物回滚过程**：1.先前滚再回滚 原因：如果undo buffer中的原始数据没来得及进行WAL持久化动作时，需要通过redo先恢复undo，再通过undo回滚回来。一个被回滚了的事务在恢复时的操作就是先redo再undo，因此不会破坏数据的一致性。

undo提供快照技术,保存事务修改之前的数据状态.保证了MVCC,隔离性,mysqldump的热备
![UNDO回滚操作](/images/img-60.png)

#### 3.3 概念性的东西:
- redo怎么应用的
- undo怎么应用的
- CSR(自动故障恢复)过程
- LSN :日志序列号
- TXID:事务ID
- CKPT(Checkpoint)

![test](/images/img-64.png)
