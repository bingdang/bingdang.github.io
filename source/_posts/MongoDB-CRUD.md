---
title: MongoDB-CRUD&运维工具介绍以及授权认证
author: 饼铛
cover: /images/img-119.png
tags:
  - NoSQL
  - MongoDB
categories:
  - DBA
abbrlink: 40c70ce
date: 2020-05-16 20:28:00
---
MongoDB-CRUD
## 1.介绍
- **1.1** `CRUD` 操作是 `create(创建)， read(读取)， update(更新)和 delete(删除)` 文档。
- **1.2** MongoDB 不支持多文档事务(`mongodb4.0` 开始支持 ACID)。但是 MongoDB 确实在一个文档上提供了原子操作。尽管集合中的文档通常都是相同的，但是 MongoDB 中的集合不需要指定 schema。
- **1.3** MongoDB 不支持 SQL 但是支持自己的丰富的查询语言。
- **1.4** 在 MongoDB 中，存储在集合中的每个文档都需要一个唯一的 _id 字段，作为主键。如果插入的文档省略了该_id 字段，则 MongoDB 驱动程序将自动为该字段生成一个 `ObjectId_id`。也用于通过更新操作插入的文档`upsert: true`.如果文档包含一个_id 字段，该_id 值在集合中必须是唯一的，以避免重复键错误。
- **1.5** 在 MongoDB 中，插入操作针对单个集合。 MongoDB 中的所有写操作都是在单个文档的级别上进行的

## 2.显示命令
`Help`: 显示帮助。
`db.help()` 显示数据库方法的帮助。
`db.<collection>.help()` 显示收集方法的帮助， <collection>可以是现有的集合或不存在的集合的名称。
`show dbs` 打印服务器上所有数据库的列表。
`use <db>`将当前数据库切换到<db>。该 mongoshell 变量 db 被设置为当前数据库。
`show collections` 打印当前数据库的所有集合的列表
`show users` 打印当前数据库的用户列表。
`show roles` 打印用于当前数据库的用户定义和内置的所有角色的列表。
`show profile` 打印需要 1 毫秒或更多的五个最近的操作。有关详细信息，请参阅数据库分析器上的文档。
`show databases` 打印所有可用数据库的列表。
`load()` 执行一个 JavaScript 文件。

## 3.CRUD
## 3.1插入数据
###  3.1.1单行插入
```bash
> use dba
db.test.insert({"name":"zhangya","age":27,"ad":"北京市朝阳区"})
db.test.insert({"name":"zhangya","age":27,"ad":"北京市朝阳区"})
db.test.insert({"name":"yazhang","age":28,"ad":"北京市朝阳区"})
db.test.insert({"name":"xiaozhang","age":28,"ad":"北京市朝阳区"})
db.test.insert({"name":"xiaozhang","age":28,"ad":"北京市朝阳区","sex":"boy"})
```
### 3.1.2多行插入
```bash
db.inventory.insertMany([
 { "item": "journal", "qty": 25, "size": { "h": 14, "w": 21, "uom": "cm" }, "status": "A" },
 { "item": "notebook", "qty": 50, "size": { "h": 8.5, "w": 11, "uom": "in" }, "status": "A" },
 { "item": "paper", "qty": 100, "size": { "h": 8.5, "w": 11, "uom": "in" }, "status": "D" },
 { "item": "planner", "qty": 75, "size": { "h": 22.85, "w": 30, "uom": "cm" }, "status": "D" },
 { "item": "postcard", "qty": 45, "size": { "h": 10, "w": 15.25, "uom": "cm" }, "status": "A" }
]);
```

## 3.2查询数据
### 3.2.1查询单条
```bash
> db.inventory.findOne()
{
        "_id" : ObjectId("5ebfe049e4265d343ff64893"),
        "item" : "journal",
        "qty" : 25,
        "size" : {
                "h" : 14,
                "w" : 21,
                "uom" : "cm"
        },
        "status" : "A"
}
> 
```
### 3.2.2查询所有
```bash
> db.inventory.find()
{ "_id" : ObjectId("5ebfe049e4265d343ff64893"), "item" : "journal", "qty" : 25, "size" : { "h" : 14, "w" : 21, "uom" : "cm" }, "status" : "A" }
{ "_id" : ObjectId("5ebfe049e4265d343ff64894"), "item" : "notebook", "qty" : 50, "size" : { "h" : 8.5, "w" : 11, "uom" : "in" }, "status" : "A" }
{ "_id" : ObjectId("5ebfe049e4265d343ff64895"), "item" : "paper", "qty" : 100, "size" : { "h" : 8.5, "w" : 11, "uom" : "in" }, "status" : "D" }
{ "_id" : ObjectId("5ebfe049e4265d343ff64896"), "item" : "planner", "qty" : 75, "size" : { "h" : 22.85, "w" : 30, "uom" : "cm" }, "status" : "D" }
{ "_id" : ObjectId("5ebfe049e4265d343ff64897"), "item" : "postcard", "qty" : 45, "size" : { "h" : 10, "w" : 15.25, "uom" : "cm" }, "status" : "A" }
```

### 3.2.3条件查询
#### 等值：
```bash
> db.inventory.find({"status":"D"})
{ "_id" : ObjectId("5ebfe049e4265d343ff64895"), "item" : "paper", "qty" : 100, "size" : { "h" : 8.5, "w" : 11, "uom" : "in" }, "status" : "D" }
{ "_id" : ObjectId("5ebfe049e4265d343ff64896"), "item" : "planner", "qty" : 75, "size" : { "h" : 22.85, "w" : 30, "uom" : "cm" }, "status" : "D" }

> db.inventory.find({"size.uom":"cm"})
{ "_id" : ObjectId("5ebfe049e4265d343ff64893"), "item" : "journal", "qty" : 25, "size" : { "h" : 14, "w" : 21, "uom" : "cm" }, "status" : "A" }
{ "_id" : ObjectId("5ebfe049e4265d343ff64896"), "item" : "planner", "qty" : 75, "size" : { "h" : 22.85, "w" : 30, "uom" : "cm" }, "status" : "D" }
{ "_id" : ObjectId("5ebfe049e4265d343ff64897"), "item" : "postcard", "qty" : 45, "size" : { "h" : 10, "w" : 15.25, "uom" : "cm" }, "status" : "A" }
```

#### and
```bash
> db.inventory.find({"size.h":{$gt:10},status:"D"})
{ "_id" : ObjectId("5ebfe049e4265d343ff64896"), "item" : "planner", "qty" : 75, "size" : { "h" : 22.85, "w" : 30, "uom" : "cm" }, "status" : "D" }
```

#### or
```bash
> db.inventory.find({$or:[{qty:{$lt:50}},{"size.uom":"in"}]})
qty < 50 或者 size.uom == in的记录
```

#### 正则
```bash
> db.inventory.find( {status: "A",$or: [ { qty: { $lt: 30 } }, { item: /^p/ } ]} )
{ "_id" : ObjectId("5ebfe049e4265d343ff64893"), "item" : "journal", "qty" : 25, "size" : { "h" : 14, "w" : 21, "uom" : "cm" }, "status" : "A" }
{ "_id" : ObjectId("5ebfe049e4265d343ff64897"), "item" : "postcard", "qty" : 45, "size" : { "h" : 10, "w" : 15.25, "uom" : "cm" }, "status" : "A" }

或者
myCursor = db.inventory.find( {
 status: "A",
 $or: [ { qty: { $lt: 30 } }, { item: /^p/ } ]
} )
```

### 3.2.4数据库查看
查看数据库命令：
```bash
> show dbs
admin   0.000GB
config  0.000GB
dba     0.000GB
local   0.000GB
> use dba
switched to db dba
> db
dba
>  show collections
inventory
test
```

## 4.更新数据
### 4.1更新单个文档:
```bash
> db.inventory.find({ "item" : "paper" })
{ "_id" : ObjectId("5ebfe049e4265d343ff64895"), "item" : "paper", "qty" : 100, "size" : { "h" : 8.5, "w" : 11, "uom" : "in" }, "status" : "D" }

db.inventory.updateOne(
 { "item" : "paper" }, // specifies the document to update
 {
 $set: { "size.uom" : "cm", "status" : "P" },
 $currentDate: { "lastModified": true }
 }
)

> db.inventory.find({ "item" : "paper" })
{ "_id" : ObjectId("5ebfe049e4265d343ff64895"), "item" : "paper", "qty" : 100, "size" : { "h" : 8.5, "w" : 11, "uom" : "cm" }, "status" : "P", "lastModified" : ISODate("2020-05-17T15:43:16.994Z") }
```
### 4.2更新多条数据:
```bash
> db.inventory.find({ "qty" : { $lt: 50 } })
{ "_id" : ObjectId("5ebfe049e4265d343ff64893"), "item" : "journal", "qty" : 25, "size" : { "h" : 14, "w" : 21, "uom" : "cm" }, "status" : "A" }
{ "_id" : ObjectId("5ebfe049e4265d343ff64897"), "item" : "postcard", "qty" : 45, "size" : { "h" : 10, "w" : 15.25, "uom" : "cm" }, "status" : "A" }

db.inventory.updateMany(
 { "qty" : { $lt: 50 } }, // specifies the documents to update
 {
 $set: { "size.uom" : "cm", "status": "P" },
 $currentDate : { "lastModified": true }
 }
)

> db.inventory.find({ "qty" : { $lt: 50 } })
{ "_id" : ObjectId("5ebfe049e4265d343ff64893"), "item" : "journal", "qty" : 25, "size" : { "h" : 14, "w" : 21, "uom" : "cm" }, "status" : "P", "lastModified" : ISODate("2020-05-17T16:02:19.749Z") }
{ "_id" : ObjectId("5ebfe049e4265d343ff64897"), "item" : "postcard", "qty" : 45, "size" : { "h" : 10, "w" : 15.25, "uom" : "cm" }, "status" : "P", "lastModified" : ISODate("2020-05-17T16:02:19.749Z") }
```

## 5.删除数据
### 5.1单行删除
```bash
> db.inventory.find( { "status": "D" } )
{ "_id" : ObjectId("5ebfe049e4265d343ff64896"), "item" : "planner", "qty" : 75, "size" : { "h" : 22.85, "w" : 30, "uom" : "cm" }, "status" : "D" }

db.inventory.deleteOne(
 { "status": "D" } // specifies the document to delete
)
{ "acknowledged" : true, "deletedCount" : 1 } //回显
```
### 5.2多行删除
```bash
myCursor = db.inventory.find( { "status": "P" } )
{ "_id" : ObjectId("5ebfe049e4265d343ff64893"), "item" : "journal", "qty" : 25, "size" : { "h" : 14, "w" : 21, "uom" : "cm" }, "status" : "P", "lastModified" : ISODate("2020-05-17T16:02:19.749Z") }
{ "_id" : ObjectId("5ebfe049e4265d343ff64895"), "item" : "paper", "qty" : 100, "size" : { "h" : 8.5, "w" : 11, "uom" : "cm" }, "status" : "P", "lastModified" : ISODate("2020-05-17T15:43:16.994Z") }
{ "_id" : ObjectId("5ebfe049e4265d343ff64897"), "item" : "postcard", "qty" : 45, "size" : { "h" : 10, "w" : 15.25, "uom" : "cm" }, "status" : "P", "lastModified" : ISODate("2020-05-17T16:02:19.749Z") }

db.inventory.deleteMany(
 { "status": "P" }
)
{ "acknowledged" : true, "deletedCount" : 3 }
```

## 6.小结：
### 6.1mongodb关闭
```bash
mongod -f mongo.conf  --shutdown
```
### 6.2mongodb常用基本操作
### 6.3库相关
```bash
test:登录时默认存在的库

管理MongoDB有关的系统库
admin库:系统预留库,MongoDB系统管理库
local库:本地预留库,存储关键日志
config库:MongoDB配置信息库

show databases/show dbs        ----> ls
show tables/show collections   

use admin                      ---->cd/mkdir #如果数据库不存在，则创建数据库，否则切换到指定数据库。
db/select database()           ---->pwd
db.dropDatabase()              ---->rm
```
### 6.4集合相关
```bash
use db1 //进入db1库
创建集合：
 - db.createCollection("oldboy")
 - 插入文档时自动创建 如：db.oldboy.insert({name:"zhangsan"})
删除集合：
 - db.oldboy.drop()
```
###  6.5文档相关
```bash
批量录入：
for(i=0;i<10000;i++){db.log.insert({"uid":i,"name":"mongodb","age":6,"date":new Date()})}

行数查询：
> db.log.count()

全表查询：
> db.log.find()

每页显示50条记录：
>DBQuery.shellBatchSize=50;

按照条件查询
>db.log.find({uid:999})

json格式化输出
> db.log.find({uid:999}).pretty()
{
        "_id" : ObjectId("5ec16d66dc542b0cf6ec2a47"),
        "uid" : 999,
        "name" : "mongodb",
        "age" : 6,
        "date" : ISODate("2020-05-17T16:59:18.148Z")
}

删除集合中所有记录
> db.log.remove({})
WriteResult({ "nRemoved" : 10000 })

```

## 7.工具介绍
官方文档：[https://docs.mongodb.com/manual/reference/program/](https://docs.mongodb.com/manual/reference/program/)

- `mongod`
Mongod 是 Mongodb 系统的主要守护进程，它处理数据请求，管理数据访问，并执行后台
管理操作。启动进程指定配置文件，控制数据库的行为

- `mongos`
mongos 对于”MongoDB Shard”，是用于处理来自应用层的查询的 MongoDB 分片配置的路由服务，并确定
此数据在分片集群中的位置， 以完成这些操作。从应用程序的角度来看，一个 mongos 实例与任何其他
MongoDB 实例的行为相同。

- `Mongostat`
Mongostat 实用程序可以快速概览当前正在运行的 mongod 或 mongos 实例的状态。mongostat 在功能上类
似于 UNIX / Linux 文件系统实用程序 vmstat，但提供有关的数据 mongod 和 mongos 实例

- `Mongotop`
Mongotop 提供了一种跟踪 MongoDB 实例读取和写入数据的时间量的方法。 mongotop 提供每个收集级别
的统计信息。默认情况下，mongotop 每秒返回一次值

- `Mongooplog`
Mongooplog 是一个简单的工具，可以从远程服务器的复制 oplog 轮询操作，并将其应用于本地服务器。此功
能支持某些类型的实时迁移，这些迁移要求源服务器保持联机并在整个迁移过程中运行。通常，此命令将采用以
下形式:
mongooplog - from mongodb0.example.net --host mongodb1.example.net

- `Mongoperf`
Mongoperf 是一种独立于 MongoDB 检查磁盘 I / O 性能的实用程序。它是随机磁盘 I / O 的测试并呈现结果。
例如：
echo "{nThreads:16, fileSizeMB:10000, r:true, w:true}"| mongoperf
在这个操作中：
mongoperf 测试直接物理随机读写 io 的，使用 16 个并发阅读器线程。
mongoperf 使用 10 GB 的测试文件。
或者参数写入文件里 mongoperf < config

## 8.授权认证
### 8.1授权认证
官方文档：
[https://docs.mongodb.com/manual/reference/configuration-options/#security-options](https://docs.mongodb.com/manual/reference/configuration-options/#security-options)
[https://docs.mongodb.com/manual/tutorial/enable-authentication/](https://docs.mongodb.com/manual/reference/configuration-options/#security-options)

### 8.2授权介绍
用户管理界面
要添加用户， MongoDB 提供了该 db.createUser()方法。添加用户时，您可以为用户分配色以授予权限。
注意：
- 在数据库中创建的第一个用户应该是具有管理其他用户的权限的用户管理员。
- 您还可以更新现有用户，例如更改密码并授予或撤销角色。

超级用户管理：
验证库：建立用户时use到的库，在使用用户时，要加上验证库才能登陆

### 8.3角色分类：
- read：允许用户读取指定数据库；
- readAnyDatabase：只在admin数据库中可用，赋予用户所有数据库的读权限；
- readWrite：允许用户读写指定数据库；
- readWriteAnyDatabase：只在admin数据库中可用，赋予用户所有数据库的读写权限；
- dbAdmin：允许用户在指定数据库中执行管理函数，如索引创建、删除，查看统计或访问system.profile；
- dbAdminAnyDatabase：只在admin数据库中可用，赋予用户所有数据库的dbAdmin权限；
- clusterAdmin：只在admin数据库中可用，赋予用户所有分片和复制集相关函数的管理权限；
- userAdmin：允许用户向system.users集合写入，可以找指定数据库里创建、删除和管理用户；
- userAdminAnyDatabase：只在admin数据库中可用，赋予用户所有数据库的userAdmin权限；
- root：只在admin数据库中可用。超级账号，超级权限；

### 8.4操作命令
```bash
db.auth()                 将用户验证到数据库。
db.changeUserPassword()   更改现有用户的密码。
db.createUser()           创建一个新用户。
db.dropUser()             删除单个用户。
db.dropAllUsers()         删除与数据库关联的所有用户。
db.getUser()              返回有关指定用户的信息。
db.getUsers()             返回有关与数据库关联的所有用户的信息。
db.grantRolesToUser()     授予用户角色及其特权。
db.removeUser()           已过时。从数据库中删除用户。
db.revokeRolesFromUser()  从用户中删除角色。
db.updateUser()           更新用户数据。
```
###  8.5配置文件
```bash
配置文件中，加入以下配置
vim /application/mongo_cluster/mongo_27017/conf/mongodb.conf 
security:
  authorization: enabled #启用或者禁用基于角色的访问控制来管理每个用户对数据库资源和操作的访问
#enabled 或者 disables
```

### 8.6创建用户和角色
### 8.7超级用户创建：
```bash
[root@db01 ~]# mongo db01:27017
> use admin
> db.createUser({user: "admin",pwd: "123456",roles:[ { role: "root", db:"admin"}]})

或
use admin
db.createUser({
	user: "admin",
	pwd: "123456",
	roles: [{
		role: "root",
		db: "admin"
	}]
})

超级用户登陆：
[root@db01 ~]# systemctl restart mongodb27017.service 
[root@db01 ~]# mongo -uadmin -p123456 db01:27017/admin
MongoDB shell version v4.0.18
connecting to: mongodb://db01:27017/test?gssapiServiceName=mongodb
Implicit session: session { "id" : UUID("414ee606-a01d-4173-87d0-34c6a3b8ac16") }
MongoDB server version: 4.0.18
>

超级用户查看：
#查看超级用户信息前要进入admin库，系统把超级用户信息存放在admin库
use admin
db.system.users.find()
或
db.system.users.find().pretty()

验证用户：
> db.auth('admin','123456')
1 #返回 1 为可用
```
### 8.8创建库管理员用户：
```bash
#建议创建用户之前先use到准备创建的库操作用户（只能操作pincheng库）
> use pincheng
db.createUser(
{
    user: "pcadmin",
    pwd: "123",
    roles: [ { role: "dbAdmin", db: "pincheng" } ]
})

验证库管理员用户：
> db.auth('pcadmin','123')
1

连接MongoDB
[root@db01 ~]# mongo -upcadmin -p123 db01:27017/pincheng
MongoDB shell version v4.0.18
connecting to: mongodb://db01:27017/pincheng?gssapiServiceName=mongodb
Implicit session: session { "id" : UUID("689a0c2d-2dec-4cc5-8464-eda655ae1f7e") }
MongoDB server version: 4.0.18
> db
pincheng
```
### 8.9创建对pincheng库可读写的普通用户：
```bash
[root@db01 ~]# mongo -uadmin -p123456 db01:27017/admin
#创建普通用户也要添加验证库
use pincheng
db.createUser({user: "user",pwd:"user",roles:[{role: "readWrite", db: "pincheng"}]})

或

db.createUser(
{
    user: "user",
    pwd: "user",
    roles: [ { role: "readWrite", db: "pincheng" } ]
} )

连接测试：
[root@db01 ~]# mongo -uuser -puser db01:27017/pincheng
MongoDB shell version v4.0.18
connecting to: mongodb://db01:27017/pincheng?gssapiServiceName=mongodb
Implicit session: session { "id" : UUID("c5285cdb-41b1-439c-aae0-a16090fb2aa4") }
MongoDB server version: 4.0.18
>
```
### 8.10创建同一账号不同库不同权限
```bash
[root@db01 ~]# mongo -uadmin -p123456 db01:27017/admin
use test
db.createUser(
 {
    user: "myTester",
    pwd: "xyz123",
    roles: [ { role: "readWrite", db: "test" },{ role: "read", db: "test2" } ]
 }
)

db.test.insert({"name":"zhangya","age":27,"ad":"北京市朝阳区"})

use test2 //创建test2库
db.test.insert({"name":"zhangyaya","age":27,"ad":"北京市朝阳区"})

用户名：myTester
密码：xyz123
针对test库
  角色：readWrite（读写）
针对test2库
  角色：read（只读）
登陆：
[root@db01 ~]# mongo -umyTester -pxyz123 db01:27017/test
> show dbs
test   0.000GB
test2  0.000GB

use test
尝试插入：
db.test.insert({"name":"zhangyafei","age":27,"ad":"上海市浦东新区"})

尝试更新：
db.test.updateOne(
 { "name" : "zhangya" },
 {
 $set: { ad : "上海市浦东新区张江" },
 $currentDate: { "lastModified": true }
 }
)
{ "acknowledged" : true, "matchedCount" : 1, "modifiedCount" : 1 }
结果：
> db.test.find()
{ "_id" : ObjectId("5ec18899ffd66f207bd53e86"), "name" : "zhangya", "age" : 27, "ad" : "上海市浦东新区张江", "lastModified" : ISODate("2020-05-17T19:08:02.279Z") }
{ "_id" : ObjectId("5ec189e274cbe9dc5321b315"), "name" : "zhangyafei", "age" : 27, "ad" : "上海市浦东新区" }

use test2
> db.test.find()
{ "_id" : ObjectId("5ec188a5ffd66f207bd53e87"), "name" : "zhangyaya", "age" : 27, "ad" : "北京市朝阳区" }
> db.test.insert({"name":"zhangyafei","age":27,"ad":"上海市浦东新区"})
WriteCommandError
```
### 8.11用户信息查看
```bash
[root@db01 ~]# mongo -uadmin -p123456 db01:27017/admin
MongoDB shell version v4.0.18
connecting to: mongodb://db01:27017/admin?gssapiServiceName=mongodb
Implicit session: session { "id" : UUID("33cae6b1-0190-4727-a5f1-34b38ea3b5e4") }
MongoDB server version: 4.0.18
> #进入超级管理员验证库
> use admin
switched to db admin

> show tables
system.users
system.version

> db.system.users.find().pretty()
{
        "_id" : "admin.admin",
        "userId" : UUID("f4e51f24-80da-4019-aa50-49d734129d84"),
        "user" : "admin",
        "db" : "admin",
        "credentials" : {
                "SCRAM-SHA-1" : {
                        "iterationCount" : 10000,
                        "salt" : "SkrunLAeUsCnfXukvxNN3A==",
                        "storedKey" : "oGsqoaSvZd0Vp1Nn0j/nrSji+io=",
                        "serverKey" : "V6oIEmIsHRK089Q2sJVBZLNfN4A="
                },
                "SCRAM-SHA-256" : {
                        "iterationCount" : 15000,
                        "salt" : "N4SD+uXm6QxAWrxRAhOq91GZ1uFVqMWxJylq3w==",
                        "storedKey" : "frPnGOZT7OGyLtmiaVFUn6bT6wTIvjsjbCdLJ26ViW0=",
                        "serverKey" : "OdPEqSsOp0gsrfumtJifo8MHqzQoztVpyRvmuyi9Mhk="
                }
        },
        "roles" : [
                {
                        "role" : "root",
                        "db" : "admin"
                }
        ]
}
{
        "_id" : "pincheng.pcadmin",
        "userId" : UUID("8a6820f5-3f7c-433e-9063-d749640b1182"),
        "user" : "pcadmin",
        "db" : "pincheng",
        "credentials" : {
                "SCRAM-SHA-1" : {
                        "iterationCount" : 10000,
                        "salt" : "Aufl+IvD/jlZ/dUMxtRSYQ==",
                        "storedKey" : "6sUX37TBhtpzDUFKm38aiAomE1o=",
                        "serverKey" : "nvu/Oe4PeKRoo2JlYBjqREC6K2Y="
                },
                "SCRAM-SHA-256" : {
                        "iterationCount" : 15000,
                        "salt" : "a4qolXg2fL2vFQ5ZY7ysRhEC4KeJgzmSacGfDQ==",
                        "storedKey" : "dAuTfKe3EwachRPrGTi+uIJ2p/N4JpwOns94/z7P/ZA=",
                        "serverKey" : "s2L1ykMsbc/bVH9ghUXhwVva+lr7TrVqvsku2tbsHx8="
                }
        },
        "roles" : [
                {
                        "role" : "dbAdmin",
                        "db" : "pincheng"
                }
        ]
}
{
        "_id" : "pincheng.user",
        "userId" : UUID("32f1de87-4f56-420b-8de4-2f9f0aa810b8"),
        "user" : "user",
        "db" : "pincheng",
        "credentials" : {
                "SCRAM-SHA-1" : {
                        "iterationCount" : 10000,
                        "salt" : "02ZrtW4H6EyAPXa+cJhWSg==",
                        "storedKey" : "e/Sz5iQ/gHrrZi9Zw+OgIMBCz/s=",
                        "serverKey" : "ijrwnfWpNSHeKi8Xaz7PU+JDIKU="
                },
                "SCRAM-SHA-256" : {
                        "iterationCount" : 15000,
                        "salt" : "3r97fhSufXHdFlZ34Y8jDFggxGUartgIb93Tsw==",
                        "storedKey" : "yZaquoT2uYERp2nuTyXoM55oJYbIiHmDTEogF/nwWXM=",
                        "serverKey" : "U8mb8FfqMqMZQXeviAopXFwNl/8AwPeRmlWJw7S2YFY="
                }
        },
        "roles" : [
                {
                        "role" : "readWrite",
                        "db" : "pincheng"
                }
        ]
}
{
        "_id" : "test.myTester",
        "userId" : UUID("209bcfec-90b2-4ad1-b999-4387f944bc18"),
        "user" : "myTester",
        "db" : "test",
        "credentials" : {
                "SCRAM-SHA-1" : {
                        "iterationCount" : 10000,
                        "salt" : "nxFoDJR+9AIJodm/JmT7ww==",
                        "storedKey" : "42iXAR7M5xxnoOUP/z2pz3kL090=",
                        "serverKey" : "FsQdmNKGjDJ8QAkop1yP1ERy54I="
                },
                "SCRAM-SHA-256" : {
                        "iterationCount" : 15000,
                        "salt" : "4gcUf9gCwwSgS8JAEpq2Dmm+XEbVeLUTH61aPA==",
                        "storedKey" : "Qz2hBVdZV/zQ8V4lqv5gPVyJinhtDCKE0PARe9KSrdc=",
                        "serverKey" : "KH9KD3DZtCSE8DlO44eNpTAIm/m/4hflLjBNfNZ+dLM="
                }
        },
        "roles" : [
                {
                        "role" : "readWrite",
                        "db" : "test"
                },
                {
                        "role" : "read",
                        "db" : "test2"
                }
        ]
}
```
### 8.12删除用户：
```bash
#删除用户只能用root超级管理员才可以操作（要进入被删除的用户的验证库）
mongo -uadmin -p123456 10.0.0.51/admin
use pincheng

#删除duouser这个用户
db.dropUser("pcadmin")
db.dropUser("user")

use test
db.dropUser("myTester")
```
