---
title: MongoDB-构建副本集&扩容缩容&仲裁节点
author: 饼铛
cover: /images/img-119.png
tags:
  - MongoDB
  - 主从复制
categories:
  - DBA
abbrlink: 6c0d75ae
date: 2020-05-21 15:52:00
---
## 0.副本集架构介绍
**一个包含3个mongo的复制集架构如下所示：**
![Mongo](/images/img-124.png)
**如果主节点失效，会变成：**
![故障转移](/images/img-125.png)
**如果加上可选的仲裁节点：**
![仲裁节点](/images/img-126.png)
**拥有仲裁节点情况下主服务器失效：**
![仲裁节点故障转移](/images/img-127.png)

## 1.环境准备：
### 1.1单机多实例目录规划
以`/application/mongo_端口号/`为单机多实例存放目录

|Server|Role|
|:-----|:-----|
|10.0.0.51:28017|PRIMARY|
|10.0.0.51:28018|SECONDARY|
|10.0.0.51:28019|SECONDARY|
|10.0.0.51:28010|ARBITER(可选)|


### 1.2创建多实例目录

```bash
[root@db01 ~]# mkdir -p /application/mongo_cluster/mongo_2801{7,8,9}/{conf,logs,pid}
[root@db01 ~]# tree /application/mongo_cluster/mongo_2801*
/application/mongo_cluster/mongo_28017
├── conf
├── logs
└── pid
/application/mongo_cluster/mongo_28018
├── conf
├── logs
└── pid
/application/mongo_cluster/mongo_28019
├── conf
├── logs
└── pid
```

### 1.3创建配置文件
```bash
cat > /application/mongo_cluster/mongo_28017/conf/mongo_28017.conf <<EOF
systemLog:
  destination: file
  logAppend: true
  path: /application/mongo_cluster/mongo_28017/logs/mongodb.log
storage:
  journal:
    enabled: true
  dbPath: /data/mongo_cluster/mongo_28017
  directoryPerDB: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.5
      directoryForIndexes: true
    collectionConfig:
      blockCompressor: zlib
    indexConfig:
      prefixCompression: true
processManagement:
  fork: true
  pidFilePath: /application/mongo_cluster/mongo_28017/pid/mongod.pid
net:
  port: 28017
  bindIp: 127.0.0.1,10.0.0.51
replication:
  oplogSizeMB: 1024
  replSetName: dba58
EOF

------------------
参数介绍：
oplogSizeMB：
#复制操作日志的最大大小（M），该mongod过程基于最大可用空间量创建一个oplog，对于64位系统，oplog通常是可用磁盘的5%，一旦mongod第一次创建了oplog，更改replication.oplogSizeMB将不会影响oplog的大小

replSetName:
#复制集的名称
------------------


#创建另外两个节点的配置文件
cp /application/mongo_cluster/mongo_28017/conf/mongo_28017.conf /application/mongo_cluster/mongo_28018/conf/mongo_28018.conf
cp /application/mongo_cluster/mongo_28017/conf/mongo_28017.conf /application/mongo_cluster/mongo_28019/conf/mongo_28019.conf

#修改端口号
sed -i 's#28017#28018#g' /application/mongo_cluster/mongo_28018/conf/mongo_28018.conf
sed -i 's#28017#28019#g' /application/mongo_cluster/mongo_28019/conf/mongo_28019.conf
```

### 1.4创建数据目录
```bash
[root@db01 ~]# mkdir -p /data/mongo_cluster/mongo_2801{7,8,9}
[root@db01 ~]# tree /data/mongo_cluster/ -L 1
/data/mongo_cluster/
├── mongo_27017
├── mongo_28017
├── mongo_28018
└── mongo_28019
```

### 1.5更改目录权限
```bash
[root@db01 ~]# id mongod
uid=800(mongod) gid=800(mongod) 组=800(mongod)
chown -R mongod:mongod /data/mongo_cluster
chown -R mongod:mongod /application/mongo_cluster
```

### 1.6多实例启动测试
```bash
mongod -f /application/mongo_cluster/mongo_28017/conf/mongo_28017.conf
mongod -f /application/mongo_cluster/mongo_28018/conf/mongo_28018.conf
mongod -f /application/mongo_cluster/mongo_28019/conf/mongo_28019.conf 
---
[root@db01 ~]# ps -ef | grep mongod
root      5291     1  1 12:03 ?        00:00:00 mongod -f /application/mongo_cluster/mongo_28017/conf/mongo_28017.conf
root      5329     1  1 12:03 ?        00:00:00 mongod -f /application/mongo_cluster/mongo_28018/conf/mongo_28018.conf
root      5367     1  1 12:03 ?        00:00:00 mongod -f /application/mongo_cluster/mongo_28019/conf/mongo_28019.conf

[root@db01 ~]# netstat -lntup | grep mongod | wc -l
6
---
mongo db01:28017
mongo db01:28018
mongo db01:28019
```

## 2.配置副本集
```bash
初始化副本集
mongo db01:28017
> config = {
... _id : "dba58",
... members : [
... {_id : 0, host : " db01:28017"},
... {_id : 1, host : " db01:28018"},
... {_id : 2, host : " db01:28019"},
... ] }
{
        "_id" : "dba58",
        "members" : [
                {
                        "_id" : 0,
                        "host" : " db01:28017"
                },
                {
                        "_id" : 1,
                        "host" : " db01:28018"
                },
                {
                        "_id" : 2,
                        "host" : " db01:28019"
                }
        ]
}
> rs.initiate(config) 
{
        "ok" : 1,
        "operationTime" : Timestamp(1590035513, 1),
        "$clusterTime" : {
                "clusterTime" : Timestamp(1590035513, 1),
                "signature" : {
                        "hash" : BinData(0,"AAAAAAAAAAAAAAAAAAAAAAAAAAA="),
                        "keyId" : NumberLong(0)
                }
        }
}
dba58:SECONDARY> 
dba58:SECONDARY> 
dba58:PRIMARY>

---
mongo db01:28018
dba58:SECONDARY>

---
mongo db01:28019
dba58:SECONDARY>
```

### 2.1检查副本集状态状态
```bash
rs.status();   //查看整体复制集状态 
rs.isMaster(); // 查看当前是否是主节点 
rs.conf();     //查看复制集配置信息 
```

### 2.2写入测试数据
```bash
dba58:PRIMARY> db.inventory.insertMany( [
 { "item": "journal", "qty": 25, "size": { "h": 14, "w": 21, "uom": "cm" }, "status": "A" },
 { "item": "notebook", "qty": 50, "size": { "h": 8.5, "w": 11, "uom": "in" }, "status": "A" },
 { "item": "paper", "qty": 100, "size": { "h": 8.5, "w": 11, "uom": "in" }, "status": "D" },
 { "item": "planner", "qty": 75, "size": { "h": 22.85, "w": 30, "uom": "cm" }, "status": "D" },
 { "item": "postcard", "qty": 45, "size": { "h": 10, "w": 15.25, "uom": "cm" }, "status": "A" }
]);
dba58:PRIMARY> db.inventory.find()

//从节点查看
dba58:SECONDARY> db.inventory.find()
...
        "errmsg" : "not master and slaveOk=false",
...

默认从节点不可直接查询：
临时解决
dba58:SECONDARY> rs.slaveOk();
dba58:SECONDARY> db.inventory.find()
{ "_id" : ObjectId("5ec60b6a9df565bf8d6b6bcc"), "item" : "postcard", "qty" : 45, "size" : { "h" : 10, "w" : 15.25, "uom" : "cm" }, "status" : "A" }

永久解决
[root@db01 ~]# echo "rs.slaveOk();" >> .mongorc.js
```

## 3.故障转移
```bash
[root@db01 ~]#  mongod -f /application/mongo_cluster/mongo_28017/conf/mongo_28017.conf --shutdown
killing process with pid: 5291

1.登陆原副节点查看：
[root@db01 ~]#  mongo db01:28018
dba58:PRIMARY> rs.isMaster();
{
        "hosts" : [
                "db01:28017",
                "db01:28018",
                "db01:28019"
        ],
        "setName" : "dba58",
        "setVersion" : 1,
        "ismaster" : true,
        "secondary" : false,
        "primary" : "db01:28018",
        "me" : "db01:28018", //从节点转移致主节点

2.尝试修改数据：
dba58:PRIMARY>  db.test.insert({"name":"zhangya","age":27,"ad":"北京市朝阳区"})
WriteResult({ "nInserted" : 1 })
dba58:PRIMARY> db.test.find()
{ "_id" : ObjectId("5ec6120d946241e339cfb2d0"), "name" : "zhangya", "age" : 27, "ad" : "北京市朝阳区" }

3.在从库上查看：
[root@db01 ~]#  mongo db01:28019
dba58:SECONDARY> db.test.find()
{ "_id" : ObjectId("5ec6120d946241e339cfb2d0"), "name" : "zhangya", "age" : 27, "ad" : "北京市朝阳区" }

4.重新启动损坏节点：
[root@db01 ~]# mongod -f /application/mongo_cluster/mongo_28017/conf/mongo_28017.conf
[root@db01 ~]# mongo db01:28017
dba58:SECONDARY>
```

## 4.副本集的权重调整和主库降级
### 4.1检查当前配置
```bash
dba58:SECONDARY> rs.conf();
"_id" : 0,
"host" : "db01:28017",
"priority" : 1,

"_id" : 1,
"host" : "db01:28018",
"priority" : 1,

"_id" : 2,
"host" : "db01:28019",
"priority" : 1,
//现在三个成员权限都为1
```
### 4.2在主库中执行如下
```bash
config = rs.conf() #读取当前配置
config.members[2].priority=100 #修改指定节点权重为100，此处我修改了 节点2即10.0.0.51:28019
rs.reconfig(config) #使生效
rs.stepDown() #主节点主动降价，重新选举
```
### 4.3检查集群状态
```bash
dba58:SECONDARY> rs.isMaster();
{
        "hosts" : [
                "db01:28017",
                "db01:28018",
                "db01:28019"
        ],
        "setName" : "dba58",
        "setVersion" : 2,
        "ismaster" : false,
        "secondary" : true,
        "primary" : "db01:28019", //28019成功晋升
        "me" : "db01:28018",
```
### 4.4恢复权重
```bash
[root@db01 ~]# mongo db01:28019 //进入主节点
dba58:PRIMARY> 
config = rs.conf()
config.members[2].priority=1
rs.reconfig(config)
```

### 4.5检查节点2权重
```bash
dba58:PRIMARY> rs.conf()
                        "_id" : 2,
                        "host" : "db01:28019",
                        "priority" : 1,
```

## 5.扩容收缩和仲裁节点
### 5.1扩容，添加节点
```bash
#创建新节点目录及启动
mkdir /application/mongo_cluster/mongo_28010/{conf,logs,pid} -p
mkdir /data/mongo_cluster/mongo_28010

#配置新节点
cp /application/mongo_cluster/mongo_28017/conf/mongo_28017.conf /application/mongo_cluster/mongo_28010/conf/mongo_28010.conf
sed -i 's#28017#28010#g' /application/mongo_cluster/mongo_28010/conf/mongo_28010.conf
mongod -f /application/mongo_cluster/mongo_28010/conf/mongo_28010.conf

#启动
mongo db01:28010
>
>

#增加节点，进入主节点
[root@db01 ~]#  mongo db01:28019
dba58:PRIMARY> use admin
switched to db admin
dba58:PRIMARY> rs.add("db01:28010") //添加新节点到集群

#检查集群配置信息
[root@db01 ~]#  mongo db01:28010
dba58:SECONDARY> 
dba58:SECONDARY> rs.conf()
                        "_id" : 0,
                        "host" : "db01:28017",
                        "priority" : 1,

                        "_id" : 1,
                        "host" : "db01:28018",
                        "priority" : 1,

                        "_id" : 2,
                        "host" : "db01:28019",
                        "priority" : 1,

                        "_id" : 3, <==
                        "host" : "db01:28010",
                        "priority" : 1,
dba58:SECONDARY> rs.isMaster();
        "hosts" : [
                "db01:28017",
                "db01:28018",
                "db01:28019",
                "db01:28010"
        ],
        "setName" : "dba58",
        "primary" : "db01:28019",
        "me" : "db01:28010",
```
### 5.2缩容，删除节点
```bash
#主节点操作
[root@db01 ~]# mongo db01:28019
dba58:PRIMARY> rs.remove("db01:28010")

#此时从节点变成了OTHER状态
[root@db01 ~]# mongo db01:28010
dba58:OTHER> 

#现在可以关闭节点了
[mongo@db01 ~]$ mongod -f /application/mongo_cluster/mongo_28010/conf/mongo_28010.conf --shutdown
```

### 5.3增加仲裁节点
官方地址：[https://docs.mongodb.com/manual/tutorial/add-replica-set-arbiter/](https://docs.mongodb.com/manual/tutorial/add-replica-set-arbiter/)
Arbiter 节点只参与投票，不能被选为 Primary，并且不跟 Primary 同步数据。

### 5.4环境恢复
```bash
#清空 28010 节点的数据
\rm -rf /data/mongo_cluster/mongo_28010/*

#启动节点
mongod -f /application/mongo_cluster/mongo_28010/conf/mongo_28010.conf

#检查
[root@db01 ~]# mongo db01:28010
```

### 5.5添加仲裁节点
```bash
[root@db01 ~]# mongo db01:28019
dba58:PRIMARY> rs.addArb("db01:28010")

#检查集群状态：
dba58:PRIMARY> rs.status()
        "_id" : 3,
        "name" : "db01:28010",
        "health" : 1,
        "state" : 7,
        "stateStr" : "ARBITER", <==

#检查仲裁节点
[root@db01 ~]# mongo db01:28010
dba58:ARBITER> 

#删除仲裁节点
[root@db01 ~]# mongo db01:28019
dba58:PRIMARY> rs.remove("db01:28010")

[root@db01 ~]# mongo db01:28010
dba58:OTHER> 
```