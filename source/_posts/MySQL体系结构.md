---
title: MySQL体系结构
author: 饼铛
tags:
  - MySQL
categories:
  - DBA
cover: /images/img-71.png
abbrlink: 3c4a0863
date: 2019-04-08 20:39:00
---
## MySQL C/S结构
![C/S](/images/img-9.png)
### 两类连接方法：
#### 针对本地用户，针对网络用户。
- TCP/IP方式（远程、本地）：
`mysql -uroot -poldboy123 -h 10.0.0.51 -P3306`
- Socket方式(仅本地)：
`mysql -uroot -poldboy123 -S /tmp/mysql.sock`

### MySQL实例的构成
**公司：老板   +   经理   +   员工   +   办公区**
**实例：mysqld+master thread +干活的Thread+预分配的内存**

### MySQL中mysqld服务器进程结构
#### SQL语句引入(结构化的查询语句)
#### SQL语言共分为四大类
- 数据查询语言DQL
- 数据操纵语言DML
- 数据定义语言DDL
- 数据控制语言DCL

#### 1.数据查询语言DQL
**数据查询语言DQL基本结构是由SELECT子句，FROM子句，WHERE**
子句组成的查询块：
- SELECT <字段名表>
- FROM <表或视图名>
- WHERE <查询条件>

#### 2.数据操纵语言DML
数据操纵语言DML主要有三种形式：
- 插入：INSERT
- 更新：UPDATE
- 删除：DELETE

#### 3. 数据定义语言DDL
**数据定义语言DDL用来创建数据库中的各种对象-----表、视图、**
**索引、同义词、聚簇等如：**
```bash
CREATE TABLE/VIEW/INDEX/SYN/CLUSTER
        表   视图  索引  同义词 簇
```
DDL操作是隐性提交的！不能rollback 

#### 4. 数据控制语言DCL
数据控制语言DCL用来授予或回收访问数据库的某种特权，并控制数据库操纵事务发生的时间及效果，对数据库实行监视等。如：
- GRANT：授权。
- ROLLBACK [WORK] TO [SAVEPOINT]：回退到某一点。
回滚---ROLLBACK
回滚命令使数据库状态回到上次最后提交的状态。其格式为：
`SQL>ROLLBACK;`

### mysqld程序运行原理
![物理结构](/images/img-10.png)
#### 连接层功能
（1）提供连接协议
- Socket
- TCP/IP

（2）验证用户名(root@localhost)密码合法性，进行匹配专门的授权表。

（3）派生一个专用连接线程（接收SQL，返回结果）
- mysql> show processlist;查看连接线程。

思考：mysql启动到维护模式时的命令
```bash
mysqld_safe --skip-grant-tables --skip-networking &
 --skip-grant-tables  #跳过第二步，不验证密码
 --skip-networking  #跳过TCP/IP连接，防止数据库在网络中裸奔。
```

#### SQL层(优化方面至关重要的)
- 验证SQL语法和SQL_MODE<==它定义了你MySQL应该支持的sql语法，对数据的校验
- 验证语义，验证所执行语句的类型：DQL,DDL,DML,DCL
- 验证权限，用户是否有权限执行
- 解析器进行语句解析，生成执行计划（解析树 即查找数据的方法）
- 优化器（各种算法，基于执行代价），根据算法，找到代价最低的执行计划。
 - 代价：CPU IO MEM
- 执行器按照优化器选择执行计划，执行SQL语句，得出获取数据的方法。
- 提供query cache（默认不开），一般不开，会用redis
- 记录操作日志（binlog，只记录修改），默认没开

#### 存储引擎层
**真正和磁盘打交道的层次**
- 根据SQL层提供的取数据的方法拿到数据。
- 返回给SQL，结构化成表
- 再由连接层线程返回给用户

![mysql运行原理](/images/img-11.png)

### 逻辑结构
![逻辑结构](/images/img-12.png)
### 物理结构：
#### 宏观：
- 库：存储在操作系统的目录中 /data/mysql/data
- 表：MyISAM存储引擎，相当于操作系统的文件系统中的（ext2）
```bash
[root@db01 /data/mysql/data/mysql]# ll user.*
user.frm  #列的定义信息，列的属性
user.MYD  #数据行 记录
user.MYI   #索引信息，目录
```
- InnoDB 带日志的存储引擎，相当于ext3 ext4 xfs
```bash
time_zone.frm  #列的定义信息，列的属性
time_zone.ibd  #数据行和索引
```
#### 微观
![物理&逻辑结构](/images/img-13.png)
