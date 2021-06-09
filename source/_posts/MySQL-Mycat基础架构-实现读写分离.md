---
title: MySQL-MyCAT基础架构&实现高可用和读写分离
author: 饼铛
cover: /images/img-71.png
tags:
  - MySQL
  - 主从复制
  - 读写分离
  - 分布式
  - MyCAT
  - 高可用
categories:
  - DBA
abbrlink: 84c0fcc7
date: 2020-05-05 00:05:00
---
## 1.环境准备：
两台虚拟机 db01 db02
创建四个mysql实例：3307 3308 3309 3310
架构图：
![基础架构](/images/img-91.png)

## 2.删除历史环境
pkill mysqld
rm -rf /data/*
mv /etc/my.cnf /etc/my.cnf.bak

## 3.创建数据目录，并初始化数据
```bash
mkdir /data/33{07..10}/data -p
mysqld --initialize-insecure  --user=mysql --datadir=/data/3307/data --basedir=/application/mysql
mysqld --initialize-insecure  --user=mysql --datadir=/data/3308/data --basedir=/application/mysql
mysqld --initialize-insecure  --user=mysql --datadir=/data/3309/data --basedir=/application/mysql
mysqld --initialize-insecure  --user=mysql --datadir=/data/3310/data --basedir=/application/mysql
```
## 4.准备配置文件和启动脚本
### 4.1-db01:
```bash
cat >/data/3307/my.cnf<<EOF
[mysqld]
basedir=/application/mysql
datadir=/data/3307/data
socket=/data/3307/mysql.sock
port=3307
log-error=/data/3307/mysql.log
log_bin=/data/3307/mysql-bin
binlog_format=row
skip-name-resolve
server-id=7
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
EOF

cat >/data/3308/my.cnf<<EOF
[mysqld]
basedir=/application/mysql
datadir=/data/3308/data
port=3308
socket=/data/3308/mysql.sock
log-error=/data/3308/mysql.log
log_bin=/data/3308/mysql-bin
binlog_format=row
skip-name-resolve
server-id=8
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
EOF

cat >/data/3309/my.cnf<<EOF
[mysqld]
basedir=/application/mysql
datadir=/data/3309/data
socket=/data/3309/mysql.sock
port=3309
log-error=/data/3309/mysql.log
log_bin=/data/3309/mysql-bin
binlog_format=row
skip-name-resolve
server-id=9
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
EOF
cat >/data/3310/my.cnf<<EOF
[mysqld]
basedir=/application/mysql
datadir=/data/3310/data
socket=/data/3310/mysql.sock
port=3310
log-error=/data/3310/mysql.log
log_bin=/data/3310/mysql-bin
binlog_format=row
skip-name-resolve
server-id=10
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
EOF

cat >/etc/systemd/system/mysqld3307.service<<EOF
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
ExecStart=/application/mysql/bin/mysqld --defaults-file=/data/3307/my.cnf
LimitNOFILE = 5000
EOF

cat >/etc/systemd/system/mysqld3308.service<<EOF
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
EOF

cat >/etc/systemd/system/mysqld3309.service<<EOF
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
EOF
cat >/etc/systemd/system/mysqld3310.service<<EOF
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
ExecStart=/application/mysql/bin/mysqld --defaults-file=/data/3310/my.cnf
LimitNOFILE = 5000
EOF
```
### 4.2-db02
```bash
cat >/data/3307/my.cnf<<EOF
[mysqld]
basedir=/application/mysql
datadir=/data/3307/data
socket=/data/3307/mysql.sock
port=3307
log-error=/data/3307/mysql.log
log_bin=/data/3307/mysql-bin
binlog_format=row
skip-name-resolve
server-id=17
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
EOF
cat >/data/3308/my.cnf<<EOF
[mysqld]
basedir=/application/mysql
datadir=/data/3308/data
port=3308
socket=/data/3308/mysql.sock
log-error=/data/3308/mysql.log
log_bin=/data/3308/mysql-bin
binlog_format=row
skip-name-resolve
server-id=18
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
EOF
cat >/data/3309/my.cnf<<EOF
[mysqld]
basedir=/application/mysql
datadir=/data/3309/data
socket=/data/3309/mysql.sock
port=3309
log-error=/data/3309/mysql.log
log_bin=/data/3309/mysql-bin
binlog_format=row
skip-name-resolve
server-id=19
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
EOF


cat >/data/3310/my.cnf<<EOF
[mysqld]
basedir=/application/mysql
datadir=/data/3310/data
socket=/data/3310/mysql.sock
port=3310
log-error=/data/3310/mysql.log
log_bin=/data/3310/mysql-bin
binlog_format=row
skip-name-resolve
server-id=20
gtid-mode=on
enforce-gtid-consistency=true
log-slave-updates=1
EOF

cat >/etc/systemd/system/mysqld3307.service<<EOF
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
ExecStart=/application/mysql/bin/mysqld --defaults-file=/data/3307/my.cnf
LimitNOFILE = 5000
EOF

cat >/etc/systemd/system/mysqld3308.service<<EOF
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
EOF

cat >/etc/systemd/system/mysqld3309.service<<EOF
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
EOF
cat >/etc/systemd/system/mysqld3310.service<<EOF
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
ExecStart=/application/mysql/bin/mysqld --defaults-file=/data/3310/my.cnf
LimitNOFILE = 5000
EOF
```

## 5.修改权限，启动多实例
```bash
chown -R mysql.mysql /data/*
systemctl start mysqld3307
systemctl start mysqld3308
systemctl start mysqld3309
systemctl start mysqld3310

mysql -S /data/3307/mysql.sock -e "show variables like 'server_id'"
mysql -S /data/3308/mysql.sock -e "show variables like 'server_id'"
mysql -S /data/3309/mysql.sock -e "show variables like 'server_id'"
mysql -S /data/3310/mysql.sock -e "show variables like 'server_id'"

ps -ef | grep mysqld
```

## 6.节点主从规划
**箭头指向谁是主库：**
```bash
    10.0.0.51:3307    <----->  10.0.0.52:3307
    10.0.0.51:3309    ------>  10.0.0.51:3307
    10.0.0.52:3309    ------>  10.0.0.52:3307

    10.0.0.52:3308    <----->  10.0.0.51:3308
    10.0.0.52:3310    ------>  10.0.0.52:3308
    10.0.0.51:3310    ------>  10.0.0.51:3308
2.6 分片规划
shard1：
    Master：10.0.0.51:3307
    slave1：10.0.0.51:3309
    Standby Master：10.0.0.52:3307
    slave2：10.0.0.52:3309
shard2：
    Master：10.0.0.52:3308
    slave1：10.0.0.52:3310
    Standby Master：10.0.0.51:3308
    slave2：10.0.0.51:3310
```

### 6.1开始配置
```bash
shard1
10.0.0.51:3307    <----->  10.0.0.52:3307

#db02
mysql  -S /data/3307/mysql.sock -e "grant replication slave on *.* to repl@'10.0.0.%' identified by '123';"
mysql  -S /data/3307/mysql.sock -e "grant all  on *.* to root@'10.0.0.%' identified by '123'  with grant option;"

[root@db02 ~]# mysql  -S /data/3307/mysql.sock -e "select host,user,authentication_string from mysql.user;"
+-----------+---------------+-------------------------------------------+
| host      | user          | authentication_string                     |
+-----------+---------------+-------------------------------------------+
| 10.0.0.%  | repl          | *23AE809DDACAF96AF0FD78ED04B6A265E05AA257 |
| 10.0.0.%  | root          | *23AE809DDACAF96AF0FD78ED04B6A265E05AA257 |


#db01
mysql  -S /data/3307/mysql.sock -e "CHANGE MASTER TO MASTER_HOST='10.0.0.52', MASTER_PORT=3307, MASTER_AUTO_POSITION=1, MASTER_USER='repl', MASTER_PASSWORD='123';"
mysql  -S /data/3307/mysql.sock -e "start slave;"
mysql  -S /data/3307/mysql.sock -e "show slave status\G" | grep Running:

ps：构建了 从库db01，主库db02的主从关系


#db02
mysql  -S /data/3307/mysql.sock -e "CHANGE MASTER TO MASTER_HOST='10.0.0.51', MASTER_PORT=3307, MASTER_AUTO_POSITION=1, MASTER_USER='repl', MASTER_PASSWORD='123';"
mysql  -S /data/3307/mysql.sock -e "start slave;"
mysql  -S /data/3307/mysql.sock -e "show slave status\G"  | grep Running:

ps：构建了 从库db02，主库db01的主从关系


10.0.0.51:3309    ------>  10.0.0.51:3307
#db01
mysql  -S /data/3309/mysql.sock  -e "CHANGE MASTER TO MASTER_HOST='10.0.0.51', MASTER_PORT=3307, MASTER_AUTO_POSITION=1, MASTER_USER='repl', MASTER_PASSWORD='123';"
mysql  -S /data/3309/mysql.sock  -e "start slave;"
mysql  -S /data/3309/mysql.sock  -e "show slave status\G"  | grep Running:

10.0.0.52:3309    ------>  10.0.0.52:3307
db02
mysql  -S /data/3309/mysql.sock -e "CHANGE MASTER TO MASTER_HOST='10.0.0.52', MASTER_PORT=3307, MASTER_AUTO_POSITION=1, MASTER_USER='repl', MASTER_PASSWORD='123';"
mysql  -S /data/3309/mysql.sock -e "start slave;"
mysql  -S /data/3309/mysql.sock -e "show slave status\G"  | grep Running:

shard2
10.0.0.52:3308    <----->  10.0.0.51:3308
db01
mysql  -S /data/3308/mysql.sock -e "grant replication slave on *.* to repl@'10.0.0.%' identified by '123';"
mysql  -S /data/3308/mysql.sock -e "grant all  on *.* to root@'10.0.0.%' identified by '123'  with grant option;"

db02
mysql  -S /data/3308/mysql.sock -e "CHANGE MASTER TO MASTER_HOST='10.0.0.51', MASTER_PORT=3308, MASTER_AUTO_POSITION=1, MASTER_USER='repl', MASTER_PASSWORD='123';"
mysql  -S /data/3308/mysql.sock -e "start slave;"
mysql  -S /data/3308/mysql.sock -e "show slave status\G"  | grep Running:

db01
mysql  -S /data/3308/mysql.sock -e "CHANGE MASTER TO MASTER_HOST='10.0.0.52', MASTER_PORT=3308, MASTER_AUTO_POSITION=1, MASTER_USER='repl', MASTER_PASSWORD='123';"
mysql  -S /data/3308/mysql.sock -e "start slave;"
mysql  -S /data/3308/mysql.sock -e "show slave status\G"  | grep Running:

10.0.0.52:3310    ----->       10.0.0.52:3308

db02
mysql  -S /data/3310/mysql.sock -e "CHANGE MASTER TO MASTER_HOST='10.0.0.52', MASTER_PORT=3308, MASTER_AUTO_POSITION=1, MASTER_USER='repl', MASTER_PASSWORD='123';"
mysql  -S /data/3310/mysql.sock -e "start slave;"
mysql  -S /data/3310/mysql.sock -e "show slave status\G"  | grep Running:

10.0.0.51:3310  ----->     10.0.0.51:3308

db01
mysql  -S /data/3310/mysql.sock -e "CHANGE MASTER TO MASTER_HOST='10.0.0.51', MASTER_PORT=3308, MASTER_AUTO_POSITION=1, MASTER_USER='repl', MASTER_PASSWORD='123';"
mysql  -S /data/3310/mysql.sock -e "start slave;"
mysql  -S /data/3310/mysql.sock -e "show slave status\G"  | grep Running:
```

```bash
检测主从状态
mysql -S /data/3307/mysql.sock -e "show slave status\G"|grep Running:
mysql -S /data/3308/mysql.sock -e "show slave status\G"|grep Running:
mysql -S /data/3309/mysql.sock -e "show slave status\G"|grep Running:
mysql -S /data/3310/mysql.sock -e "show slave status\G"|grep Running:
```

## 7.Mycat介绍
- Mycat主要是做数据分布式存储，也有Atlas普通版的读写分离功能，其最重要还是分布式
- Mycat是java开发的

>mycat管理端口：9066
>mycat数据端口：8066

### 7.1安装Mycat

mycat下载地址：[http://dl.mycat.org.cn/1.6.7.3/20190828135747/Mycat-server-1.6.7.3-release-20190828135747-linux.tar.gz](http://dl.mycat.org.cn/1.6.7.3/20190828135747/Mycat-server-1.6.7.3-release-20190828135747-linux.tar.gz)
jdk下载地址：[https://download.oracle.com/otn/java/jdk/8u60-b27/jdk-8u60-linux-x64.tar.gz](https://download.oracle.com/otn/java/jdk/8u60-b27/jdk-8u60-linux-x64.tar.gz)

### 7.2安装java
```
[root@db02 ~]# tar -xf  jdk-8u60-linux-x64.tar.gz -C /application/
[root@db02 ~]# ln -s /application/jdk1.8.0_60/ /application/jdk
[root@db02 ~]# ll /application/
lrwxrwxrwx 1 root root  25 5月   4 20:20 jdk -> /application/jdk1.8.0_60/
drwxr-xr-x 8   10  143 255 8月   5 2015 jdk1.8.0_60
```

### 7.3安装mycat
```bash
[root@db02 ~]# tar -xf Mycat-server-1.6.7.3-release-20190828135747-linux.tar.gz -C /application/
[root@db02 ~]# cd /application/
[root@db02 /application]# ls
jdk  jdk1.8.0_60  mycat  mysql  mysql-5.7.26-linux-glibc2.12-x86_64
[root@db02 /application]# ll
总用量 0
lrwxrwxrwx 1 root root  25 5月   4 20:20 jdk -> /application/jdk1.8.0_60/
drwxr-xr-x 8   10  143 255 8月   5 2015 jdk1.8.0_60
drwxr-xr-x 7 root root  85 5月   4 20:26 mycat
lrwxrwxrwx 1 root root  36 3月  18 02:19 mysql -> mysql-5.7.26-linux-glibc2.12-x86_64/
drwxr-xr-x 9 root root 129 3月  18 02:13 mysql-5.7.26-linux-glibc2.12-x86_64
```

```bash
日志文件说明：
#'/usr/local/mycat/logs目录
mycat.log     Mycat工作日志
mycat.pid     pid文件
switch.log
wrapper.log   Mycat启动相关日志
配置文件说明：
#'/usr/local/mycat/conf目录
schema.xml    主配置文件（读写分离、高可用、分表、节点控制）
server.xml    mycat软件本身相关的配置
rule.xml      分片规则配置文件（分片规则列表、使用方法）
```

### 7.4添加jdk和mycat到环境变量
```bash
#man bash
#PATH 存放命令的路径
cat >>/etc/bashrc <<'EOF'
export JAVA_HOME=/application/jdk 
export PATH=$JAVA_HOME/bin:$JAVA_HOME/jre/bin:$PATH 
export CLASSPATH=.:$JAVA_HOME/lib:$JAVA_HOME/jre/lib:$JAVA_HOME/lib/tools.jar

export PATH=/application/mycat/bin:$PATH
EOF

. /etc/bashrc 

[root@db02 ~]# java -version
java version "1.8.0_60"
Java(TM) SE Runtime Environment (build 1.8.0_60-b27)
Java HotSpot(TM) 64-Bit Server VM (build 25.60-b23, mixed mode)

安装javajdk也可直接执行
yum install java-openjdk -y
```

### 7.5启动mycat
```bash
mycat start
[root@db02 ~]# netstat -lntup | grep 8066
tcp6       0      0 :::8066                 :::*                    LISTEN      2644/java
```
进入Mycat程序：（默认用户root、密码123456）
`mysql -uroot -p123456 -h127.0.0.1 -P8066`

### 7.6日志文件说明：
```bash
#/application/mycat/logs目录
mycat.log     Mycat工作日志
mycat.pid     pid文件
switch.log
wrapper.log   Mycat启动相关日志
```
### 7.8配置文件说明：
```bash
#/application/mycat/conf目录
schema.xml    主配置文件（读写分离、高可用、分表、节点控制）
server.xml    mycat软件本身相关的配置
rule.xml      分片规则配置文件（分片规则列表、使用方法）
```

## 8.测试数据准备
```bash
db01:
mysql -S /data/3307/mysql.sock 
grant all on *.* to root@'10.0.0.%' identified by '123';
source /root/world.sql

mysql -S /data/3308/mysql.sock 
grant all on *.* to root@'10.0.0.%' identified by '123';
source /root/world.sql
```

## 9.核心配置文件使用介绍
### 9.1 schema.xml
```bash
[root@db02 /application/mycat/conf]# pwd
/application/mycat/conf
[root@db02 /application/mycat/conf]# cat >schema.xml <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE mycat:schema SYSTEM "schema.dtd">  
<mycat:schema xmlns:mycat="http://io.mycat/">
<schema name="TESTDB" checkSQLschema="false" sqlMaxLimit="100" dataNode="sh1"> 
</schema>  
        <dataNode name="sh1" dataHost="oldguo1" database= "world" />         
        <dataHost name="oldguo1" maxCon="1000" minCon="10" balance="1"  writeType="0" dbType="mysql"  dbDriver="native" switchType="1">    
                <heartbeat>select user()</heartbeat>  
        <writeHost host="db1" url="10.0.0.51:3307" user="root" password="123"> 
                        <readHost host="db2" url="10.0.0.51:3309" user="root" password="123" /> 
        </writeHost> 
        </dataHost>  
</mycat:schema>
EOF
```
```bash
1.逻辑库定义
<schema name="TESTDB" checkSQLschema="false" sqlMaxLimit="100" dataNode="sh1"> 
</schema>  //mycat级别的逻辑对象                                 //对应的数据节点

2.数据节点定义
        <dataNode name="sh1" dataHost="oldguo1" database= "world" />

3.数据主机定义         
        <dataHost name="oldguo1" maxCon="1000" minCon="10" balance="1"  writeType="0" dbType="mysql"  dbDriver="native" switchType="1">    
                <heartbeat>select user()</heartbeat>  
        <writeHost host="db1" url="10.0.0.51:3307" user="root" password="123"> //写节点
                        <readHost host="db2" url="10.0.0.51:3309" user="root" password="123" /> //读节点
        </writeHost> 
        </dataHost>  
```

### 9.2实现简单的读写分离
![基础架构](/images/img-91.png)
定义完成后，使用上面的配置文件重启mycat。
涉及节点：机构图中左侧（10.0.0.51）红色节点【1主1从】
```bash
根据先前配置，此次读写分离的结果应当涉及到两个节点：
10.0.0.52:3307 /主节点 serverid=7 负责写入
10.0.0.52:3309 /从节点 serverid=9 负责读取

mysql -uroot -p123456 -h10.0.0.52 -P8066
mysql> begin;select @@server_id;commit;  //模拟写
Query OK, 0 rows affected (0.00 sec)

+-------------+
| @@server_id |
+-------------+
|           7 |
+-------------+
1 row in set (0.00 sec)

Query OK, 0 rows affected (0.00 sec)

mysql> select @@server_id;  //模拟读
+-------------+
| @@server_id |
+-------------+
|           9 |
+-------------+
1 row in set (0.00 sec)

```


### 9.3读写分离+高可用实现：
涉及节点：
架构图中所有红色部分【2主2从】

配置示例：
```bash
[root@db02 /application/mycat/conf]# cat >schema.xml <<'EOF'
<?xml version="1.0"?>  
<!DOCTYPE mycat:schema SYSTEM "schema.dtd">  
<mycat:schema xmlns:mycat="http://io.mycat/">
<schema name="TESTDB" checkSQLschema="false" sqlMaxLimit="100" dataNode="sh1"> 
</schema>  
    <dataNode name="sh1" dataHost="oldguo1" database= "world" />  
    <dataHost name="oldguo1" maxCon="1000" minCon="10" balance="1"  writeType="0" dbType="mysql"  dbDriver="native" switchType="1"> 
        <heartbeat>select user()</heartbeat> 
    <writeHost host="db1" url="10.0.0.51:3307" user="root" password="123"> 
            <readHost host="db2" url="10.0.0.51:3309" user="root" password="123" /> 
    </writeHost> 
    <writeHost host="db3" url="10.0.0.52:3307" user="root" password="123"> 
            <readHost host="db4" url="10.0.0.52:3309" user="root" password="123" /> 
    </writeHost>    
    </dataHost>  
</mycat:schema>
EOF

mycat restart
```
### 9.4工作过程：
- 1.数据主机定义下，添加了4个真实的物理节点。
- 2.正常情况下的读写状态为
   - 2.1写操作，由主库db1（10.0.0.51:3307）承担，处于Real状态
   - 2.2读操作，由db2、db3、db4做负载分担，默认为轮询
   - 2.2其中db3同时作为备份主库处于Standby状态。当db1作为主库宕机时，立刻进行接管
- 3.主库db1宕机情况下的读写状态为
   - 3.1 db3直接成为新的主库，承担写操作
   - 3.2 主库db1宕机时，其下面挂的从库db2也被置为不可用状态。
   - 3.3 读操作，只被分配给db4
 
```bash
根据先前配置，此次读写分离的结果应当涉及到两个节点：
10.0.0.52:3307 /主节点 serverid=7 负责写入
10.0.0.52:3309 /从节点 serverid=9 负责读取
10.0.0.52:3307 /主节点 serverid=17 负责读取，宕机时接替主库
10.0.0.52:3309 /从节点 serverid=19 负责读取

mysql -uroot -p123456 -h10.0.0.52 -P8066
模拟读：
mysql> select @@server_id;
+-------------+
| @@server_id |
+-------------+
|           9 |
+-------------+
1 row in set (0.04 sec)

mysql> select @@server_id;
+-------------+
| @@server_id |
+-------------+
|          19 |
+-------------+
1 row in set (0.01 sec)

mysql> select @@server_id;
+-------------+
| @@server_id |
+-------------+
|          17 |
+-------------+
1 row in set (0.00 sec)

模拟写：
mysql> begin;select @@server_id;commit;
Query OK, 0 rows affected (0.00 sec)

+-------------+
| @@server_id |
+-------------+
|           7 |
+-------------+
1 row in set (0.00 sec)

模拟主库db01上的3307宕机：
[root@db01 ~]# systemctl stop mysqld3307

再次连接测试：
读操作：
mysql> select @@server_id;
+-------------+
| @@server_id |
+-------------+
|          19 |
+-------------+
1 row in set (0.00 sec)

写操作：
mysql> begin;select @@server_id;commit;
Query OK, 0 rows affected (0.00 sec)

+-------------+
| @@server_id |
+-------------+
|          17 |
+-------------+
1 row in set (0.00 sec)

//由于serverid为9的从库是挂在了7上，所以当7宕机时。9也一并被置为了不可用状态
```

## 10.配置中的属性介绍:
### `balance`属性
负载均衡类型，目前的取值有3种： 
1. `balance="0"`, 不开启读写分离机制，所有读操作都发送到当前可用的writeHost上。 [其他三个节点就白瞎了]
2. `balance="1"`，全部的readHost与standby writeHost参与select语句的负载均衡，简单的说，
  当双主双从模式(M1->S1，M2->S2，并且M1与 M2互为主备)，正常情况下，M2,S1,S2都参与select语句的负载均衡。 
3. balance="2"，所有读操作都随机的在writeHost、readhost上分发。即写节点也要负责一些读操作。

### writeType属性
负载均衡类型，目前的取值有2种： 
1. `writeType="0"`, 所有写操作发送到配置的第一个writeHost，
第一个挂了切到还生存的第二个writeHost，重新启动后已切换后的为主，切换记录在配置文件中:dnindex.properties . 
2. `writeType="1"`，所有写操作都随机的发送到配置的writeHost，但不推荐使用(mycat处理分布式事务效果不理想。锁相关问题)

### switchType属性
- `-1` 表示不自动接管 
- `1` 默认值，自动接管
- `2` 基于MySQL主从同步的状态决定是否切换 ，心跳语句为 show slave status 

### datahost其他配置
`<dataHost name="localhost1" maxCon="1000" minCon="10" balance="1"  writeType="0" dbType="mysql"  dbDriver="native" switchType="1"> `

`maxCon="1000"`：最大的并发连接数
`minCon="10" `：mycat在启动之后，会在后端节点上自动开启的连接线程
`tempReadHostAvailable="1"`：临时允许已经宕机的主库下面的从库进行读操作。没必要，原因：主库宕机从库数据已经落后了。让从库继续读没意义
这个一主一从时（1个writehost，1个readhost时），可以开启这个参数，如果2个writehost，2个readhost时
`<heartbeat>select user()</heartbeat>`  监测心跳