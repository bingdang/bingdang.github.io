---
title: MySQL-MyCAT多主多从环境下实现表的垂直拆分
author: 饼铛
cover: /images/img-71.png
tags:
  - MySQL
  - 读写分离
  - 高可用
  - 分布式
  - MyCAT
  - 垂直拆分
  - 主从复制
categories:
  - DBA
abbrlink: 557ea64b
date: 2020-05-05 02:02:00
---
## 0.双主环境搭建
参见：[https://pincheng.org/forward/d3c702fe.html](https://pincheng.org/forward/d3c702fe.html)
## 1.垂直拆分：
![垂直拆分](/images/img-92.png)
## 2.mycat垂直分表
### 2.1配置文件
```bash
[root@db02 ~]# cd /application/mycat/conf/
[root@db02 /application/mycat/conf]# mv schema.xml schema.xml.ha
[root@db02 /application/mycat/conf]# cat >schema.xml <<'EOF'
<?xml version="1.0"?>
<!DOCTYPE mycat:schema SYSTEM "schema.dtd">
<mycat:schema xmlns:mycat="http://io.mycat/">
<schema name="TESTDB" checkSQLschema="false" sqlMaxLimit="100" dataNode="sh1">
        <table name="user" dataNode="sh1"/>
        <table name="order_t" dataNode="sh2"/>
</schema>
    <dataNode name="sh1" dataHost="oldguo1" database= "taobao" /> #节点中真实存在的库
    <dataNode name="sh2" dataHost="oldguo2" database= "taobao" /> #节点中真实存在的库
    <dataHost name="oldguo1" maxCon="1000" minCon="10" balance="1"  writeType="0" dbType="mysql"  dbDriver="native" switchType="1">
        <heartbeat>select user()</heartbeat>
    <writeHost host="db1" url="10.0.0.51:3307" user="root" password="123">
            <readHost host="db2" url="10.0.0.51:3309" user="root" password="123" />
    </writeHost>
    <writeHost host="db3" url="10.0.0.52:3307" user="root" password="123">
            <readHost host="db4" url="10.0.0.52:3309" user="root" password="123" />
    </writeHost>
    </dataHost>
    <dataHost name="oldguo2" maxCon="1000" minCon="10" balance="1"  writeType="0" dbType="mysql"  dbDriver="native" switchType="1">
        <heartbeat>select user()</heartbeat>
    <writeHost host="db1" url="10.0.0.51:3308" user="root" password="123">
            <readHost host="db2" url="10.0.0.51:3310" user="root" password="123" />
    </writeHost>
    <writeHost host="db3" url="10.0.0.52:3308" user="root" password="123">
            <readHost host="db4" url="10.0.0.52:3310" user="root" password="123" />
    </writeHost>
    </dataHost>
</mycat:schema>
EOF
```
### 2.2配置文件解释：
- 两组datanode
  - sh1下面四组节点【承载taobao库user表】
   - 10.0.0.51:3307[db1]主库 //写操作
   - 10.0.0.51:3309[db2]从库 //读操作
   - 10.0.0.52:3307[db3]主库 //读操作，同时是sh1中db1的替补。实现高可用
   - 10.0.0.52:3309[db4]从库 //读操作
  - sh2下面四组节点【承载taobao库order_t表】
   - 10.0.0.51:3308[db1]主库 //写操作
   - 10.0.0.51:3310[db2]从库 //读操作
   - 10.0.0.52:3318[db3]主库 //读操作，同时是sh2中db1的替补。实现高可用
   - 10.0.0.52:3320[db4]从库 //读操作
   
**物理架构图：**
![基础架构](/images/img-91.png)
**垂直拆分逻辑架构图：**
![垂直拆分逻辑架构图](/images/img-93.png)

## 3.创建测试库和表:（db01或db02）
```bash
mysql -S /data/3307/mysql.sock -e "create database taobao charset utf8;"
mysql -S /data/3308/mysql.sock -e "create database taobao charset utf8;"
mysql -S /data/3307/mysql.sock -e "use taobao;create table user(id int,name varchar(20))"
mysql -S /data/3308/mysql.sock -e "use taobao;create table order_t(id int,name varchar(20))"

[root@db02 ~]# mycat restart
Stopping Mycat-server...
Stopped Mycat-server.
Starting Mycat-server...
//此时，sh1四个节点中只存在user表，sh2四个节点中只存在order_t表【以表为粒度实现了垂直拆分】。并且两个数据节点都实现了读写分离和高可用

[root@db02 ~]# mysql -uroot -p123456 -h10.0.0.52 -P8066
mysql> show databases;
+----------+
| DATABASE |
+----------+
| TESTDB   |
+----------+
1 row in set (0.00 sec)
mysql> use TESTDB  //进入mycat逻辑库
mysql> show tables;
+------------------+
| Tables_in_taobao |
+------------------+
| order_t          |
| user             |
+------------------+
2 rows in set (0.00 sec)

//分别插入数据
mysql> insert into user(id,name) values(1,'zs');
Query OK, 1 row affected (0.04 sec)

mysql> insert into user(id,name) values(2,'ls');
Query OK, 1 row affected (0.00 sec)

mysql> insert into user(id,name) values(3,'w5');
Query OK, 1 row affected (0.01 sec)

mysql> insert into order_t(id,name) values(1,'zs2');
Query OK, 1 row affected (0.01 sec)

mysql> insert into order_t(id,name) values(2,'ls2');
Query OK, 1 row affected (0.01 sec)

mysql> insert into order_t(id,name) values(3,'w52');
Query OK, 1 row affected (0.00 sec)
```

## 4.验证
```bash
[root@db01 ~]# mysql -S /data/3308/mysql.sock -e "use taobao;show tables;select * from order_t;"  //sh2主节点中只存在order_t表
+------------------+
| Tables_in_taobao |
+------------------+
| order_t          |
+------------------+
+------+------+
| id   | name |
+------+------+
|    1 | zs2  |
|    2 | ls2  |
|    3 | w52  |
+------+------+
[root@db01 ~]# mysql -S /data/3307/mysql.sock -e "use taobao;show tables;select * from user;" //sh1主节点中只存在user表
+------------------+
| Tables_in_taobao |
+------------------+
| user             |
+------------------+
+------+------+
| id   | name |
+------+------+
|    1 | zs   |
|    2 | ls   |
|    3 | w5   |
+------+------+
```
