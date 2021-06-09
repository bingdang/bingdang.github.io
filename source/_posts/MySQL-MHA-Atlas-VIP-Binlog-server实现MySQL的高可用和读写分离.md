---
title: MySQL-MHA+Atlas+VIP+Binlog server实现MySQL的高可用和读写分离
author: 饼铛
cover: /images/img-71.png
tags:
  - MySQL
  - 主从复制
  - 读写分离
  - 高可用
categories:
  - DBA
abbrlink: 74c8159a
date: 2020-04-30 16:11:00
---
## 0.说明
**MHA&VIP&邮件告警构建参见**：[https://pincheng.org/forward/c919a25c.html](https://pincheng.org/forward/c919a25c.html)
**binlogserver**：实时抓取主库的binlog日志，防止极限情况下的主库宕机，而从库接管时出现数据不全的情况
**Atlas**：配合MHA的vip高可用，实现主从复制的读写分离相关操作

## 1.binlogserver配置：
### 1.2修改配置文件
找一台额外的机器，必须要有5.6以上的版本，支持gtid并开启，我们直接用的第二个slave（db03）
```bash
vim /etc/mha/app1.cnf 
[binlog1]
no_master=1 //表示此节点不参与主从选举
hostname=192.168.56.4
master_binlog_dir=/data/mysql/binlog //用于保存主库Pull过来的二进制的本地路径
```
### 1.3创建必要目录
```bash
mkdir -p /data/mysql/binlog
chown -R mysql.mysql /data/*
```
修改完成后，将主库binlog拉过来（从000001开始拉，之后的binlog会自动按顺序过来）
拉取主库binlog日志
```bash
cd /data/mysql/binlog     ----->必须进入到自己创建好的目录
mysqlbinlog  -R --host=192.168.56.3 --user=mha --password=mha --raw  --stop-never mysql-bin.000003 &
                       主库真实ip    用于拉去的用户                                   从库最后一个binlog
```
**注意**：拉取日志的起点,需要按照目前从库的已经获取到的二进制日志点为起点(show slave status \G)

![binlogserver](/images/img-89.png)

### 1.4重启MHA
```bash
masterha_stop --conf=/etc/mha/app1.cnf

nohup masterha_manager --conf=/etc/mha/app1.cnf --remove_dead_master_conf --ignore_last_failover < /dev/null > /var/log/mha/app1/manager.log 2>&1 &
```

### 1.5故障处理
如果主库宕机，`binlogserver` 自动停掉，`manager` 也会自动停止。
处理思路：
1、重新获取新主库的binlog到binlogserver中
2、重新配置文件binlog server信息
3、最后再启动MHA

### 1.6管理员在高可用架构维护的职责
1. 搭建：MHA+VIP+SendReport+BinlogServer
2. 监控及故障处理
3.  高可用架构的优化

**核心是**：尽可能降低主从的延时，让MHA花在数据补偿上的时间尽量减少。
5.7 版本，开启GTID模式，开启从库SQL并发复制。

## 2.Atlas介绍
> Atlas是由 Qihoo 360, Web平台部基础架构团队开发维护的一个基于MySQL协议的数据中间层项目。
>它是在mysql-proxy 0.8.2版本的基础上，对其进行了优化，增加了一些新的功能特性。
>360内部使用Atlas运行的mysql业务，每天承载的读写请求数达几十亿条。

架构图：

![top](/images/img-90.png)

**下载地址**:[https://github.com/Qihoo360/Atlas/releases](https://github.com/Qihoo360/Atlas/releases)

**注意**：
1. Atlas只能安装运行在64位的系统上
2. Centos 5.X安装 Atlas-XX.el5.x86_64.rpm，Centos 6.X安装Atlas-XX.el6.x86_64.rpm。
3. 后端mysql版本应大于5.1，建议使用Mysql 5.6以上

### 2.1安装配置
```bash
yum install -y Atlas*  或者 yum install -y Atlas-2.2.1.el6.x86_64.rpm
cd /usr/local/mysql-proxy/conf
mv test.cnf test.cnf.bak
```

### 2.2生成配置文件：
```bash
加密密码：
[root@db03 /usr/local/mysql-proxy]# bin/encrypt 123
3yb5jEku5h4=
[root@db03 /usr/local/mysql-proxy]# bin/encrypt mha
O2jBXONX098=

cat > test.cnf <<EOF
[mysql-proxy]
admin-username = user  //管理atlas自身的用户名密码
admin-password = pwd
proxy-backend-addresses = 192.168.56.50:3306  //主库当前绑定的vip，提供写操作
proxy-read-only-backend-addresses = 192.168.56.2:3306,192.168.56.4:3306 //其他从库。提供读操作
pwds = repl:3yb5jEku5h4=,mha:O2jBXONX098=  //数据库连接管理的用户,和加密过的密码
daemon = true //守护运行
keepalive = true //心跳检测
event-threads = 8 //线程个数，默认并发数
log-level = message //日志记录等级
log-path = /usr/local/mysql-proxy/log //日志路径
sql-log=ON //经过atlas路由的sql语句
proxy-address = 0.0.0.0:33060 //代理的地址以及端口号，对外提供服务的端口
admin-address = 0.0.0.0:2345 //管理atlas的端口
charset=utf8
EOF
```
### 2.3启动atlas
```bash
/usr/local/mysql-proxy/bin/mysql-proxyd test start
OK: MySQL-Proxy of test is started


ps -ef |grep proxy
root      9656     1  0 15:18 ?        00:00:00 /usr/local/mysql-proxy/bin/mysql-proxy --defaults-file=/usr/local/mysql-proxy/conf/test.cnf
root      9657  9656  0 15:18 ?        00:00:00 /usr/local/mysql-proxy/bin/mysql-proxy --defaults-file=/usr/local/mysql-proxy/conf/test.cnf

netstat -lntup | grep proxy
tcp        0      0 0.0.0.0:33060           0.0.0.0:*               LISTEN      9657/mysql-proxy    
tcp        0      0 0.0.0.0:2345            0.0.0.0:*               LISTEN      9657/mysql-proxy 
//一个进程为对外提供服务的进程，另一个为自身的管理进程
```

### 2.4测试读写分离
```bash
读：
[root@db03 ~]# /usr/local/mysql-proxy/bin/mysql-proxyd test start
OK: MySQL-Proxy of test is started
[root@db03 ~]# mysql -umha -pmha -h 127.0.0.1 -P33060
db03 [(none)]>select @@server_id;
+-------------+
| @@server_id |
+-------------+
|          53 |
+-------------+
1 row in set (0.00 sec)

db03 [(none)]>select @@server_id;
+-------------+
| @@server_id |
+-------------+
|          51 |
+-------------+
1 row in set (0.00 sec)

db03 [(none)]>select @@server_id;
+-------------+
| @@server_id |
+-------------+
|          53 |
+-------------+
1 row in set (0.00 sec)

db03 [(none)]>select @@server_id;
+-------------+
| @@server_id |
+-------------+
|          51 |
+-------------+
1 row in set (0.00 sec)

写：
db03 [(none)]>begin;select @@server_id;commit;
Query OK, 0 rows affected (0.00 sec)

+-------------+
| @@server_id |
+-------------+
|          52 |
+-------------+
1 row in set (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

db03 [(none)]>begin;select @@server_id;commit;
Query OK, 0 rows affected (0.00 sec)

+-------------+
| @@server_id |
+-------------+
|          52 |
+-------------+
1 row in set (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

db03 [(none)]>begin;select @@server_id;commit;
Query OK, 0 rows affected (0.00 sec)

+-------------+
| @@server_id |
+-------------+
|          52 |
+-------------+
1 row in set (0.00 sec)

Query OK, 0 rows affected (0.00 sec)
```

### 2.5 生产用户要求 (Atlas+MHA+VIP+SENDREPORT+BINLOG)
开发人员申请一个应用用户 app(  select  update  insert)  密码123456,要通过10网段登录

- 1.在主库中,创建用户
`grant select ,update,insert on *.* to app@'192.168.56.%' identified by '123456';`

```bash
从库检查：
db01 [(none)]>select host,user,authentication_string from mysql.user;
| 192.168.56.% | app           | *6BB4837EB74329105EE4568DDA7DC67ED2CA2AD9 |
```

- 2.在atlas中添加生产用户
/usr/local/mysql-proxy/bin/encrypt  123456      ---->制作加密密码

- 3.改配置文件

```bash
vim test.cnf
pwds = repl:3yb5jEku5h4=,mha:O2jBXONX098=,app:/iZxz+0GRoA=

/usr/local/mysql-proxy/bin/mysql-proxyd test restart
[root@db03 conf]# mysql -uapp -p123456  -h 192.168.56.4 -P 33060
```



### 2.6Atlas基本管理

#### 2.6.1连接管理接口
`mysql -uuser -ppwd -h127.0.0.1 -P2345`

#### 2.6.2打印帮助：
`mysql> select * from help;`

#### 2.6.3查询后端所有节点信息
```bash
db03 [(none)]>SELECT * FROM backends;
+-------------+--------------------+-------+------+
| backend_ndx | address            | state | type |
+-------------+--------------------+-------+------+
|           1 | 192.168.56.50:3306 | up    | rw   |
|           2 | 192.168.56.2:3306  | up    | ro   |
|           3 | 192.168.56.4:3306  | up    | ro   |
+-------------+--------------------+-------+------+
```

#### 2.6.4常见管理操作
- `SET OFFLINE $backend_id` 临时下线节点
- `SET ONLINE $backend_id` 上线节点

- `REMOVE BACKEND 3;` 动态添加删除节点
- `ADD SLAVE 10.0.0.53:3306;`动态添加节点

- `SELECT * FROM pwds;`查看用户
- `REMOVE PWD $pwd;`删除用户
- `ADD PWD root:123;`添加 用户:明文
- `ADD ENPWD $pwd;`添加 用户:密文

- `SAVE CONFIG;`持久化配置