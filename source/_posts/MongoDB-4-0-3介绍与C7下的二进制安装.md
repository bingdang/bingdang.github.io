---
title: MongoDB-4.0.18介绍与C7下的二进制安装
author: 饼铛
cover: /images/img-119.png
tags:
  - MongoDB
  - NoSQL
categories:
  - DBA
abbrlink: c4bb5371
date: 2020-05-13 18:21:00
---
## 1.背景介绍：
### 1.1关系型于非关系型
- `NoSQL`（not only sql）指的是 非关系型的数据库
- `NoSQL`有时也称作Not Only SQL的缩写，是对不同于传统的关系型数据库的数据库管理系统的统称。
- 对`NoSQL`是普遍的解释是"非关联型的"，强调 `Key-Value Stores` 和 文档数据库的优点，而不是单纯的`RDBMS`。
- `NoSQL`用于超大规模数据的存储。这些类型的数据存储不需要固定的模式，无需多余操作就可以横向扩展。

### 1.2Mongo和MySQL数据对比
#### 1.2.1结构对比：
|MySQL | MongoDB|
|:-----|:-----|
|库 | 库 |
|表 | 集合 |
|字段 | Key:Value |
|记录行 | 文档 |


#### 1.2.2内容对比：
```bash
## mysql数据结构：
name          age  job     host
oldzhang      28   it 
xiaozhang     28   it
xiaofei       18   student  SZ

## mongo数据结构：
{name:'oldzhang',age:'28',job:'it'},
{name:'xiaozhang',age:'28',job:'it'},
{name:'xiaozhang',age:'28',job:'it',host:'SZ'}
```
### 1.3MongoDB介绍
**高性能：**
- `Mongodb`提供高性能的数据库持久化
- 尤其是支持嵌入式数据模型减少数据库系统上的`I/O`操作
- 索引支持更快的查询，并且可以包括嵌入式文档和数组中的键

**丰富的语言查询：**
- `Mongodb`支持丰富的查询语言来支持读写操作（CRUD）以及数据汇总，文本搜索和地理空间查询

**高可用性：**
- `Mongodb`的复制工具，成为副本集，提供自动故障转移和数据冗余。

**水平可扩展性：**
- `Mongodb`提供了可扩展性，作为其核心功能的一部分，分片是将数据分在一组计算机上。

**支持多种存储引擎：**
- `WiredTiger` 存储引擎和 `MMAPv1` 存储和 `InMemory` 存储引擎

### 1.4MongoDB应用场景
**应用场景：**[https://www.zhihu.com/question/32071167](https://www.zhihu.com/question/32071167)
- **游戏场景**，使用 MongoDB 存储游戏用户信息，用户的装备、积分等直接以内嵌文档的形式存储，方便查询、更新
- **物流场景**，使用 MongoDB 存储订单信息，订单状态在运送过程中会不断更新，以 MongoDB 内嵌数组的形式来存储，一次查询就能将订单所有的变更读取出来
- **社交场景**，使用 MongoDB 存储用户信息，以及用户发表的朋友圈信息，通过地理位置索引实现附近的人、地点等功能
- **物联网场景**，使用 MongoDB 存储所有接入的智能设备信息，以及设备汇报的日志信息，并对这些信息进行多维度的分析
- **视频直播**，使用 MongoDB 存储用户信息、礼物信息等，用户评价
- **电商场景**，使用 MongoDB 电商上衣和裤子两种商品，除了有共同属性，如产地、价格、材质、颜色等外，还有各自不同的属性集，如上衣的独有属性是肩宽、胸围、袖长等，裤子的独有属性是臀围、脚口和裤长等

## 2.安装部署
官方文档：[https://docs.mongodb.com/manual/](https://docs.mongodb.com/manual/)
部署参考：[https://docs.mongodb.com/manual/tutorial/install-mongodb-on-red-hat-tarball/](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-red-hat-tarball/)
下载地址：[https://www.mongodb.com/download-center/community](https://www.mongodb.com/download-center/community)

![MongoDB](/images/img-118.png)

### 2.1目录规划
|目录|位置|
|:-----|:-----|
|软件所在位置|/application/mongo_cluster/|
|单节点目录|/application/mongo_cluster/mongo_27017/{conf,log,pid}|
|单节点数据目录|/data/mongo_cluster/mongo_27017|

### 2.2下载
```bash
mkdir -p /server/{tools,scripts} && cd /server/tools
wget https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-rhel70-4.0.18.tgz
```

### 2.3软件安装
```bash
安装依赖：
[root@db01 ~]# yum install libcurl openssl -y
安装目录：
[root@db01 ~]# mkdir /application/mongo_cluster/ -p

[root@db01 /server/tools]# tar xf mongodb-linux-x86_64-rhel70-4.0.18.tgz -C /application/mongo_cluster/
[root@db01 /server/tools]# cd /application/mongo_cluster/
[root@db01 /application/mongo_cluster]# ln -s mongodb-linux-x86_64-rhel70-4.0.18 mongodb
[root@db01 /application/mongo_cluster]# mkdir /application/mongo_cluster/mongo_27017/{conf,logs,pid} -p
[root@db01 /application/mongo_cluster]# mkdir /data/mongo_cluster/mongo_27017 -p

[root@db01 /application/mongo_cluster]# ll
总用量 0
drwxr-xr-x 5 root root  41 5月  14 15:06 mongo_27017
lrwxrwxrwx 1 root root  34 5月  14 15:05 mongodb -> mongodb-linux-x86_64-rhel70-4.0.18
drwxr-xr-x 3 root root 135 5月  14 15:04 mongodb-linux-x86_64-rhel70-4.0.18
```

### 2.4创建用户：(官方建议用普通用户管理MongoDB)
`groupadd -g 800 mongod && useradd -u 800 -M -s /sbin/nologin -g mongod mongod`

### 2.5授权目录
```bash
[root@db01 ~]# chown  mongod.mongod -R /application/mongo_cluster/
[root@db01 ~]# chown  mongod.mongod -R /data/mongo_cluster/
已集成至systemd启动脚本中
```

### 2.6添加环境变量
```
echo "export PATH=/application/mongo_cluster/mongodb/bin:\$PATH" >> /etc/bashrc
. /etc/bashrc
[root@db01 ~]# mongo --version
MongoDB shell version v4.0.18
```

### 2.7配置文件
#### 2.7.1配置文件导入
```bash
cat > /application/mongo_cluster/mongo_27017/conf/mongodb.conf << EOF
systemLog:
  destination: file
  logAppend: true
  path: /application/mongo_cluster/mongo_27017/logs/mongodb.log
storage:
  journal:
    enabled: true
  dbPath: /data/mongo_cluster/mongo_27017
  directoryPerDB: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 1
      directoryForIndexes: true
    collectionConfig:
      blockCompressor: zlib
    indexConfig:
      prefixCompression: true
processManagement:
  fork: true
  pidFilePath: /application/mongo_cluster/mongo_27017/pid/mongod.pid
net:
  port: 27017
  bindIp: 127.0.0.1,10.0.0.51
EOF
```
#### 2.7.2配置文件介绍
```bash
#日志相关
systemLog:
 destination: file      #Mongodb 日志输出的目的地，指定一个 file 或者 syslog，如果指定 file，必须指定
 logAppend: true        #当实例重启时，不创建新的日志文件，在老的日志文件末尾继续添加
 path: /application/mongo_cluster/mongo_27017/logs/mongodb.log #日志路径

#存储相关
storage:
 journal:               #回滚日志
 enabled: true
 dbPath: /data/mongo_cluster/mongo_27017 #数据存储目录
 directoryPerDB: true #默认 false，不适用 inmemory engine。每个数据库将被保存在一个单独的目录
 wiredTiger:
 engineConfig:
 cacheSizeGB: 1            #将用于所有数据缓存的最大小
 directoryForIndexes: true #默认 false 索引集合 storage.dbPath 存储在数据单独子目录
 collectionConfig:         #表压缩配置
 blockCompressor: zlib
 indexConfig:              #索引配置
 prefixCompression: true

#进程相关
processManagement: #使用处理系统守护进程的控制处理
 fork: true #后台运行
 pidFilePath: /application/mongo_cluster/mongo_27017/pid/mongod.pid #创建 pid 文件

#网络相关
net:
 port: 27017 #监听端口
 bindIp: 127.0.0.1,10.0.0.51 #绑定 ip
```

### 2.8启动/关闭MongoDB
```bash
[root@db01 ~]# /application/mongo_cluster/mongodb/bin/mongod -f /application/mongo_cluster/mongo_27017/conf/mongodb.conf
[root@db01 ~]# /application/mongo_cluster/mongodb/bin/mongod -f /application/mongo_cluster/mongo_27017/conf/mongodb.conf --shutdown
```

### 2.9配置systemd管理：
```bash
cat > /lib/systemd/system/mongodb27017.service <<'EOF'
[Unit]
Description=mongodb
After=network.target remote-fs.target nss-lookup.target

[Service]
User=mongod
Group=mongod
Type=forking
PermissionsStartOnly=true
ExecStartPre=/usr/bin/chown mongod.mongod -R /application/mongo_cluster/
ExecStartPre=/usr/bin/chown mongod.mongod -R /data/mongo_cluster/
Environment="OPTIONS=-f /application/mongo_cluster/mongo_27017/conf/mongodb.conf"
ExecStart=/application/mongo_cluster/mongodb/bin/mongod $OPTIONS
#ExecReload=/bin/kill -s HUP $MAINPID
ExecStop=/application/mongo_cluster/mongodb/bin/mongod $OPTIONS --shutdown
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF
```
### 2.10启动测试：
```bash
systemctl daemon-reload
systemctl start mongodb27017.service
systemctl enable mongodb27017.service
```

## 3.告警优化
```bash
1:配置的WiredTiger缓存大小超过可用内存的80%。
** WARNING: The configured WiredTiger cache size is more than 80% of available RAM.
**          See http://dochub.mongodb.org/core/faq-memory-diagnostics-wt

2:未开启登陆认证
** WARNING: Access control is not enabled for the database.
**          Read and write access to data and configuration is unrestricted.

3.大内存页未关闭
** WARNING: /sys/kernel/mm/transparent_hugepage/enabled is 'always'.
**        We suggest setting it to 'never'

** WARNING: /sys/kernel/mm/transparent_hugepage/defrag is 'always'.
**        We suggest setting it to 'never'
```

### 3.1关闭大内存页
**参考文档：**[https://docs.mongodb.com/manual/tutorial/transparent-huge-pages/](https://docs.mongodb.com/manual/tutorial/transparent-huge-pages/)
```bash
cat > /etc/systemd/system/disable-transparent-huge-pages.service <<'EOF'
[Unit]
Description=Disable Transparent Huge Pages (THP)
DefaultDependencies=no
After=sysinit.target local-fs.target
Before=mongod.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never | tee /sys/kernel/mm/transparent_hugepage/enabled > /dev/null'

[Install]
WantedBy=basic.target
EOF
systemctl daemon-reload

[root@db01 ~]# cat /sys/kernel/mm/transparent_hugepage/enabled
[always] madvise never
[root@db01 ~]# systemctl start disable-transparent-huge-pages
[root@db01 ~]# cat /sys/kernel/mm/transparent_hugepage/enabled 
always madvise [never]

systemctl enable disable-transparent-huge-pages
```

### 3.2rlimits警告
```bash
echo "ulimit -u 64000"  >> /etc/bashrc
. /etc/profile
```
### 3.3内存占用超过 80%
```bash
[root@db01 ~]# grep "cacheSizeGB" /application/mongo_cluster/mongo_27017/conf/mongodb.conf 
      cacheSizeGB: 1
```
**解决方法：**增加内存或者在配置文件里把 `cash` 调小
### 3.4用户访问控制
配置文件增加用户认证的配置参数
```bash
security:
 authorization: enabled
```

重启mongo服务

## 4.登陆测试
```bash
[root@db01 ~]# mongo 
MongoDB shell version v4.0.18
connecting to: mongodb://127.0.0.1:27017/?gssapiServiceName=mongodb
Implicit session: session { "id" : UUID("35df303c-3320-498d-ae0c-d2dd601810f4") }
MongoDB server version: 4.0.18
Server has startup warnings: 
2020-05-14T17:33:13.213+0800 I STORAGE  [initandlisten] 
2020-05-14T17:33:13.213+0800 I STORAGE  [initandlisten] ** WARNING: The configured WiredTiger cache size is more than 80% of available RAM.
2020-05-14T17:33:13.213+0800 I STORAGE  [initandlisten] **          See http://dochub.mongodb.org/core/faq-memory-diagnostics-wt
2020-05-14T17:33:13.984+0800 I CONTROL  [initandlisten] 
2020-05-14T17:33:13.984+0800 I CONTROL  [initandlisten] ** WARNING: Access control is not enabled for the database.
2020-05-14T17:33:13.984+0800 I CONTROL  [initandlisten] **          Read and write access to data and configuration is unrestricted.
2020-05-14T17:33:13.984+0800 I CONTROL  [initandlisten] 
---
Enable MongoDB's free cloud-based monitoring service, which will then receive and display
metrics about your deployment (disk utilization, CPU, operation statistics, etc).

The monitoring data will be available on a MongoDB website with a unique URL accessible to you
and anyone you share the URL with. MongoDB may use this information to make product
improvements and to suggest MongoDB products and deployment options to you.

To enable free monitoring, run the following command: db.enableFreeMonitoring()
To permanently disable this reminder, run the following command: db.disableFreeMonitoring()
---

> 
```