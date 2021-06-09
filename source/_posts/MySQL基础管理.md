---
title: MySQL基础管理
author: 饼铛
tags:
  - MySQL
categories:
  - DBA
cover: /images/img-71.png
abbrlink: ddc093b3
date: 2019-04-09 21:16:00
---
### 用户 权限管理
#### 用户管理
- 作用：登录，管理数据库对象。（逻辑结构）

##### 用户的定义
mysql的用户格式：`root@'localhost'`，用户名@白名单。
```bash
白名单例：
 oldguo@'10.0.0.51'
 oldguo@'10.0.0.%'
 oldguo@'10.0.0.5%'
 oldguo@'10.0.0.0/255.255.254.0'
 oldguo@'%'
 oldguo@'oldguo.com'
 oldguo@'localhost'
 oldguo@'db01'
```
##### 用户管理语句
- 创建用户：
```bash
mysql> create user felix@'172.16.1.%' identified by '123';
Query OK, 0 rows affected (0.00 sec)
```
- 查看mysql库中user表中的列
`mysql> desc mysql.user;`
其中 host     user  authentication_string
    字段为主机，用户，和密码
查询以上字段
`mysql> select host,user,authentication_string from mysql.user;`
![user table](/images/img-14.png)
- 删除用户
`mysql> drop user oldboy@'172.16.1.%';`

- 修改用户
`mysql> alter user root@'localhost' identified by '123';`

#### 权限管理
**作业：控制用户登录之后能对MySQL对象做哪些命令。**
**定义：**
```bash
ALL:
SELECT,INSERT, UPDATE, DELETE, CREATE, DROP, RELOAD, SHUTDOWN, PROCESS, FILE, REFERENCES, INDEX, ALTER, SHOW DATABASES, SUPER, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, REPLICATION SLAVE, REPLICATION CLIENT, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, CREATE USER, EVENT, TRIGGER, CREATE TABLESPACE
```
`ALL` : 以上所有权限，一般是普通管理员拥有的
`with grant option`：超级管理员才具备的，给别的用户授权的功能

**8.0 版本新特性（了解）:**加入了role（角色）的概念。

#### 授权管理
##### 给用户授权
```bash
grant ALL on woedpress.*  to wordpress@'10.0.0.%'  identified by '123';
grant 权限 on 范围            to  用户              identified by '123';
```
**范围：**
- \*.\*    #所有库所有表
- wordpress.\*   #wordpress库下的所以表
- wordpress.t1  #wordpress库下t1表

**例子：**
**1.授权远程用户root通过Navicat，远程管理数据库。**
`grant all on *.* to root@'172.16.1.%' identified by '123';`

**2.授权zhihu用户远程连接zhihu库 并给all权限**
`grant select,update,delete,insert on zhihu.* to zhihu@'10.0.0.%' identified by '123';`

**思考一个问题：**
```bash
执行顺序：
1. grant select,update on *.* to oldboy@'10.0.0.%';
2. grant delete on wordpress.* to oldboy@'10.0.0.%';
3. grant insert on wordpress.t1 to oldboy@'10.0.0.%';
```
问:oldboy@'10.0.0.%' 能对t1表具备什么权限？
答:MySQL中的权限是可以继承，多次授权是叠加的。
所以，想要取消某个权限，必须通过回收的方式实现，而不能多次重复授权。

##### 查看用户权限
`mysql> show grants for root@'localhost';`
**USAGE：空权限**
![show grants](/images/img-15.png)
**上图表示：USAGE表示权限为空，只能连接到数据库不可对数据库进行操作**

##### 超级管理员和普通管理员的区别：
`sql结尾的with grant option`

![普通用户&超级管理员对比](/images/img-16.png)
##### 权限回收
`mysql> revoke delete on zhihu.* from 'zhihu'@'10.0.0.%';`
#### MySQL 连接管理
##### mysql命令：
- -u  用户名
- -p  密码
- -h  IP
- -P  端口
- -S  sock文件（配置文件中有路径）
- -e  非交互式运行sql语句
- <  导入sql脚本
**TCP/IP方式（远程、本地）：**
`mysql -uroot -poldboy123 -h 10.0.0.51 -P3306`
**Socket方式(仅本地)：**
`mysql -uroot -poldboy123 -S /tmp/mysql.sock`

##### 远程的客户端工具
Nvichat等

#### MySQL 启动管理
##### 辅助脚本方式（普通的启动关闭）：
```bash
sys-v :/etc/init.d/mysqld
 start ->/application/mysql/bin/mysqld_safe->/application/mysql/bin/mysqld

systemd :/etc/systemd/system/mysqld.service
 start ->/application/mysql/bin/mysqld
```
##### 维护性的启动方式：
```bash
/application/mysql/bin/mysqld_safe --skip-grant-tables --skip-networking &
/application/mysql/bin/mysqld
```
##### 数据库启动验证
```bash
netstat -lnp |grep 3306
ps -ef |grep mysqld
```
### MySQL 初始化配置
#### 预编译时进行设置：只能在编译安装中实现，硬编码配置到程序中。

#### 初始化配置文件(my.cnf)
##### 初始化配置文件默认读取位置
```bash
[root@db01 ~]# mysqld --help --verbose |grep "my.cnf"
#配置文件读取顺序，后读取的会覆盖前面的配置。
/etc/my.cnf --> /etc/mysql/my.cnf --> /usr/local/mysql/etc/my.cnf --> ~/.my.cnf
```


#### 命令行模式
```bash
[root@db01 ~]# mysqld_safe --defaults-file=/opt/my.cnf --socket=/tmp/asdad &
--defaults-file=/opt/my.cnf   #人为强制指定配置默认位置
例如：
mysqld_safe  --defaults-file=/opt/my.cnf 
mysqld
```
##### 配置生效优先级：命令行指定>默认位置>预编译

#### 配置文件书写格式 
##### 初始化配置文件应用
##### 配置文件的作用 
- 数据库的启动：mysqld  mysqld_safe    
- 客户端的连接：mysql  mysqldump  mysqladmin 
```bash
[程序名]
配置项=xxx
配置项=xxx
配置项=xxx
配置项=xxx

服务端
[server]  <==
[mysqld]  <==服务端参数可写在这个标签下
[mysqld_safe]

客户端 
[client]  <==客户端软件中通用的参数写在该标签下
[mysql]
[mysqldump]
```

##### mysql初始化配置常用参数(通用模板)
参考：[https://dev.mysql.com/doc/refman/5.7/en/option-files.html](https://dev.mysql.com/doc/refman/5.7/en/option-files.html)
```bash
[mysqld]#服务器端
user=mysql
basedir=/application/mysql
datadir=/data/mysql/data 
socket=/tmp/mysql.sock 
server_id=6  #大于1，主从复制的节点
port=3306
log_error=/data/mysql/data/mysql.log 
log_bin=/data/mysql/data/mysql-bin #二进制日志，备份恢复主从复制的日志
[mysql]#客户端
socket=/tmp/mysql.sock
```
