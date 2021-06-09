---
title: Redis-数据类型&持久化&安全认证和配置的热更新
author: 饼铛
cover: /images/img-100.png
tags:
  - Redis
  - NoSQL
categories:
  - DBA
abbrlink: ae6c7518
date: 2020-05-10 23:40:00
---
## 1.全局命令
Redis 有 5 种数据结构,他们是键值对中的值,对于键来说有一些通用的命令.
### 1.1 查看所有命键
`Keys *` // 十分危险的命令,线上禁止使用

### 1.2 查看键的总数
`Dbsize` // dbsize 命令在计算键总数时不会遍历所有键,而是直接获取 Redis 内置的键总数变量.

### 1.3 检查键是否存在
`Exists key` // 如果键存在则返回 1,不存在则返回 0

### 1.4 删除键
`Del key [key …]` // 通用命令,无论值是什么数据结构类型,del 命令都可以将其删除.
```bash
127.0.0.1:6379> DEL key3
(integer) 1 //存在并成功删除
127.0.0.1:6379> EXISTS key3
(integer) 0 //不存在，且删除失败
```

### 1.5 键过期
`Expire key seconds `
// Redis 支持对键添加过期时间,当超过过期时间后,会自动删除键.
// 通过 ttl 命令观察键的剩余时间
大于等于 0 的证书: 键剩余过期时间
- \-1: 键没设置过期时间
- \-2: 键不存在

`PERSIST key`
//去掉键过期时间，转永久

```bash
127.0.0.1:6379> TTL pincheng
(integer) -1 //永不过期

127.0.0.1:6379> EXPIRE pincheng 10 //设为10s过期
(integer) 1 
127.0.0.1:6379> TTL pincheng //剩余时间
(integer) 7
127.0.0.1:6379> get pincheng //被删除
(nil)
127.0.0.1:6379> TTL pincheng //键不存在
(integer) -2
注意：设置完的过期键如果重复定义，会重新变成永不过期。

去掉过期时间：
127.0.0.1:6379> keys z*
1) "zw1"
127.0.0.1:6379> EXPIRE zw1 100
(integer) 1
127.0.0.1:6379> TTL zw1
(integer) 94
127.0.0.1:6379> TTL zw1
(integer) 93
127.0.0.1:6379> PERSIST zw1
(integer) 1
127.0.0.1:6379> TTL zw1
(integer) -1
```

### 1.6 键的数据类型
`Type key`

### 1.7 变更KEY名
```bash
127.0.0.1:6379> RENAME b bb
OK
127.0.0.1:6379> KEYS *
1) "bb"
```

## 2.字符串操作
### 2.1※应用场景※
`session` 共享
常规计数：微博数，粉丝数，订阅、礼物
key:value
----------
运维掌握应用场景即可
----------
### 2.2单个定义
`set name zhangsan`

### 2.3批量定义
`MSET id 101 name zhangsan age 20 gender m`
 等价于以下操作：
`SET id 101 `
`set name zhangsan `
`set age 20 `
`set gender m`

### 2.4计数器
- 每点一次关注，都执行以下命令一次
`127.0.0.1:6379> incr num`
- 显示粉丝数量：
`127.0.0.1:6379> get num`

### 2.5暗箱操作：
```bash
127.0.0.1:6379> INCRBY num 10000
(integer) 10006
127.0.0.1:6379> get num
"10006"
127.0.0.1:6379> DECRBY num 10000
(integer) 6
127.0.0.1:6379> get num
"6"
```

```bash
增：
set mykey "test"                为键设置新值，并覆盖原有值
getset mycounter 0              设置值,取值同时进行
setex mykey 10 "hello"          设置指定 Key 的过期时间为10秒,在存活时间可以获取value
setnx mykey "hello"             若该键不存在，则为键设置新值
mset key3  "zyx"  key4 "xyz"    批量设置键

删：
del key1                        删除已有键

改：
append mykey "hello"            若该键并不存在,返回当前 Value 的长度
                                该键已经存在，返回追加后 Value的长度
incr mykey                      值增加1,若该key不存在,创建key,初始值设为0,增加后结果为1
decrby  mykey  5                值减少5
setrange mykey 20 dd            把第21和22个字节,替换为dd, 超过value长度,自动补0

查：  
exists mykey                    判断该键是否存在，存在返回 1，否则返回0
get mykey                       获取Key对应的value
strlen mykey                    获取指定 Key 的字符长度
ttl mykey                       查看一下指定 Key 的剩余存活时间(秒数)
getrange mykey 1 20             获取第2到第20个字节,若20超过value长度,则截取第2个和后面所有的
mget key3 key4                  批量获取键
```

```bash
[root@db01 ~]# redis-cli 
127.0.0.1:6379> set key value [expiration EX seconds|PX milliseconds] [NX|XX]
                设置 键  值 
[root@db01 ~]# cat zw.txt
韶光暂留。爷爷的脸在日光灯下，不满的情绪透过那浑浊的镜片：“你搬走桌子就不能多添一步，把台玻璃底下的纸片花儿都留下？”爸爸甚是不耐烦，换张餐桌，把原来的弃掷，再简单不过的事，拘泥于不明原因的繁琐，实在浪费时间。“唉，那些好东西，都是想给孩子多看看的，能一天，是一天……”我摊开掌心，看那漏网之鱼——许久前本该垫于桌下的。如此，便成了一去不返，留下的唯一痕迹。将记忆从过往中翻出，同这张纸片一起，敝帚自珍地数过。爷爷爱读报，每每叫他不应，定是入了迷。从小看他，一样的姿势，纱窗下，光晕支离破碎，尘埃轻舞，举着报一动不动，隐约闪烁在镜片后的情绪。只是，不知从何时起，他多了一项工作。变戏法似的，塞给我一张纸片，定睛，原是从报纸上裁剪下的，嗅那表面的味儿，报纸独有的，古老，富有生机，仿若一位从民国翩然而来的故人，用浅浅的语调，念过寥寥，念过婉转。总是敷衍道：“爷爷我回去有空再看。”语罢欲塞入兜中的手被他止住：“好文章啊好文章，不行，你得看，帮你压台玻璃底下，吃饭时随性看看总不浪费时间吧？”日子汹涌地向前，光阴如棋子，落子的位越来越少，年岁越过越薄。偶然撞见过爷爷裁剪，仿佛雕琢着的工匠，多一分阳光溅落到视野之上，亦是搅扰。“好文章啊好文章，不能荒废了的。”这样划着一道道线，咂嘴，兀自发笑。渐渐受他感染，奶奶也起了兴致，时不时压一张“青少年如何保护视力”，如此类，被爷爷发现，不过几天，便无处可寻。爷爷的眼光不容置疑。沉浸于那灰白色的纸张，漫步走过烟雨笼罩，黄白交错的苍穹下，看尽更迭的人面，烟花破碎的世事。往往中途吃饭到一半，便凑近了玻璃，一心一念，不知身处何方。奶奶因此少不了责备爷爷，爷爷仍是那一副悠闲模样：“不急，不急，看完再说。”这样的纵容，维持到此番爸爸的失误，经年累月，一瞬间化成云烟，就在目睹中，飘摇过头顶。爷爷也爱惜报纸，却因为剪报，他那里剩余堆积着的，不再完整，残破不堪，与我这里留下的一张，便成为追寻那笔财富的痕迹。可我知道不止于此，文字领我走过的河山，一条条纵横交错的路，编织，造就了回忆中的印痕，刻于血液。那一张张纸片，成了过去。留下的痕迹，在身体中，却磨灭不尽，厚重的复古气息，老一辈的用心，使这痕迹壮大，生根发芽。一念，百草生。念那随风，本该沉潜的书香。

[root@db01 ~]# redis-cli set zw1 $(cat zw.txt)
OK
[root@db01 ~]# redis-cli get zw1 > zw1.txt
[root@db01 ~]# cat zw1.txt
韶光暂留。爷爷的脸在日光灯下，不满的情绪透过那浑浊的镜片：“你搬走桌子就不能多添一步，把台玻璃底下的纸片花儿都留下？”爸爸甚是不耐烦，换张餐桌，把原来的弃掷，再简单不过的事，拘泥于不明原因的繁琐，实在浪费时间。“唉，那些好东西，都是想给孩子多看看的，能一天，是一天……”我摊开掌心，看那漏网之鱼——许久前本该垫于桌下的。如此，便成了一去不返，留下的唯一痕迹。将记忆从过往中翻出，同这张纸片一起，敝帚自珍地数过。爷爷爱读报，每每叫他不应，定是入了迷。从小看他，一样的姿势，纱窗下，光晕支离破碎，尘埃轻舞，举着报一动不动，隐约闪烁在镜片后的情绪。只是，不知从何时起，他多了一项工作。变戏法似的，塞给我一张纸片，定睛，原是从报纸上裁剪下的，嗅那表面的味儿，报纸独有的，古老，富有生机，仿若一位从民国翩然而来的故人，用浅浅的语调，念过寥寥，念过婉转。总是敷衍道：“爷爷我回去有空再看。”语罢欲塞入兜中的手被他止住：“好文章啊好文章，不行，你得看，帮你压台玻璃底下，吃饭时随性看看总不浪费时间吧？”日子汹涌地向前，光阴如棋子，落子的位越来越少，年岁越过越薄。偶然撞见过爷爷裁剪，仿佛雕琢着的工匠，多一分阳光溅落到视野之上，亦是搅扰。“好文章啊好文章，不能荒废了的。”这样划着一道道线，咂嘴，兀自发笑。渐渐受他感染，奶奶也起了兴致，时不时压一张“青少年如何保护视力”，如此类，被爷爷发现，不过几天，便无处可寻。爷爷的眼光不容置疑。沉浸于那灰白色的纸张，漫步走过烟雨笼罩，黄白交错的苍穹下，看尽更迭的人面，烟花破碎的世事。往往中途吃饭到一半，便凑近了玻璃，一心一念，不知身处何方。奶奶因此少不了责备爷爷，爷爷仍是那一副悠闲模样：“不急，不急，看完再说。”这样的纵容，维持到此番爸爸的失误，经年累月，一瞬间化成云烟，就在目睹中，飘摇过头顶。爷爷也爱惜报纸，却因为剪报，他那里剩余堆积着的，不再完整，残破不堪，与我这里留下的一张，便成为追寻那笔财富的痕迹。可我知道不止于此，文字领我走过的河山，一条条纵横交错的路，编织，造就了回忆中的印痕，刻于血液。那一张张纸片，成了过去。留下的痕迹，在身体中，却磨灭不尽，厚重的复古气息，老一辈的用心，使这痕迹壮大，生根发芽。一念，百草生。念那随风，本该沉潜的书香。
```

### 2.6通常用 SET command 和 GET command 来设置和获取字符串值
```bash
[root@db01 ~]# redis-cli set pincheng pincheng.org
OK
[root@db01 ~]# redis-cli 
127.0.0.1:6379> get pincheng
127.0.0.1:6379> keys * //查看所有键不代表生产操作
1) "pincheng"
2) "zw1"
127.0.0.1:6379> DBSIZE //查看键数量
(integer) 2
127.0.0.1:6379> TYPE pincheng //查看键类型
string //字符串
127.0.0.1:6379> TYPE zw1
string
```

### 2.7INCR 命令将字符串值解析成整型.将其加 1,最后结果保存为新的字符串
```bash
127.0.0.1:6379> set num1 10 //设置kv值为num1 10
OK
127.0.0.1:6379> GET num1 //查看值
"10"
127.0.0.1:6379> INCR num1 //INCR 数值+1
(integer) 11
127.0.0.1:6379> GET num1 
"11"
127.0.0.1:6379> INCRBY num1 100 //INCRBY 增加指定数值
(integer) 111
```

### 2.8DECR 命令将字符串值解析成整型.将其减 1,最后结果保存为新的字符串
```bash
127.0.0.1:6379> DECR num1 //DECR 数值-1
(integer) 110
127.0.0.1:6379> DECRBY num1 10 //DECRBY 减少指定数值
(integer) 100
```

### 2.9MSET 和 MGET 可以一次存储或获取多个 key 对应的值.
```bash
127.0.0.1:6379>  mset key3 v3 key4 v4 key5 v5
OK
127.0.0.1:6379>  mget key3 key4 key5
1) "v3"
2) "v4"
3) "v5"
```

### 2.10EXISTS 命令返回 1 或 0 标识给定 key 的值是否存在.
```bash
127.0.0.1:6379> EXISTS key1 //不存在
(integer) 0
127.0.0.1:6379> EXISTS key3 //存在
(integer) 1
```

## 3.列表操作
### 3.1操作命令:
`LPUSH` 命令可向 list 的左边(头部)添加一个新元素
`RPUSH` 命令可向 list 的右边(尾部)添加一个新元素.
最后 `LRANGE` 可以从 `list` 中取出一定范围的元素
```bash
127.0.0.1:6379> RPUSH list1 A
(integer) 1
127.0.0.1:6379> RPUSH list1 B
(integer) 2
127.0.0.1:6379> RPUSH list1 C
(integer) 3
127.0.0.1:6379> LPUSH list1 top1
(integer) 4
127.0.0.1:6379> LRANGE list1 0 -1 //从开头到最后
1) "top1"
2) "A"
3) "B"
4) "C"

127.0.0.1:6379> LRANGE list1 1 -1
1) "A"
2) "B"
3) "C"
```
### 3.2操作命令:
`Pop`,从 list 中删除元素并同时返回删除的值,可以在左(L)边或右(R)边操作
```bash
127.0.0.1:6379> LPUSH list1 top //从左插入追加新元素top
(integer) 5
127.0.0.1:6379> LRANGE list1 0 -1 //查看列表所有元素
1) "top"
2) "top1"
3) "A"
4) "B"
5) "C"
127.0.0.1:6379> RPOP list1 //从右删除一个元素
"C"
127.0.0.1:6379> LRANGE list1 0 -1 
1) "top"
2) "top1"
3) "A"
4) "B"
127.0.0.1:6379> LPOP list1 //从左删除一个元素
"top"
127.0.0.1:6379> LRANGE list1 0 -1 
1) "top1"
2) "A"
3) "B"
```

### 3.3应用场景
- 消息队列系统

```bash
增：
lpush mykey a b             若key不存在,创建该键及与其关联的List,依次插入a ,b， 若List类型的key存在,则插入value中
lpushx mykey2 e             若key不存在,此命令无效， 若key存在,则插入value中
linsert mykey before a a1   在 a 的前面插入新元素 a1
linsert mykey after e e2    在e 的后面插入新元素 e2
rpush mykey a b             在链表尾部先插入b,在插入a
rpushx mykey e              若key存在,在尾部插入e, 若key不存在,则无效
rpoplpush mykey mykey2      将mykey的尾部元素弹出,再插入到mykey2 的头部(原子性的操作)

删：
del mykey                   删除已有键 
lrem mykey 2 a              从头部开始找,按先后顺序,值为a的元素,删除数量为2个,若存在第3个,则不删除
ltrim mykey 0 2             从头开始,索引为0,1,2的3个元素,其余全部删除

改：
lset mykey 1 e              从头开始, 将索引为1的元素值,设置为新值 e,若索引越界,则返回错误信息
rpoplpush mykey mykey       将 mykey 中的尾部元素移到其头部

查：
lrange mykey 0 -1           取链表中的全部元素，其中0表示第一个元素,-1表示最后一个元素。
lrange mykey 0 2            从头开始,取索引为0,1,2的元素
lrange mykey 0 0            从头开始,取第一个元素,从第0个开始,到第0个结束
lpop mykey                  获取头部元素,并且弹出头部元素,出栈
lindex mykey 6              从头开始,获取索引为6的元素 若下标越界,则返回nil 
```

## 4.hash操作
### 4.1 操作命令:
- `Hash` 看起来就像一个’hash’的样子.由键值对组成
- `HMSET` 指令设置 hash 中的多个域
- `HGET` 取回单个域.
- `HMGET` 取回一系列的值

### 4.2 应用场景：
存储部分变更的数据，如用户信息等。是最接近mysql表结构的一种类型，主要是可以做数据库缓存。

### 4.3 示例
```bash
127.0.0.1:6379> hmset user:1000 username zhangya age 27 job it //创建user=1000，并插入相关列和值
OK
127.0.0.1:6379> hget user:1000 username //查询单个列的值
"zhangya"
127.0.0.1:6379> hmget user:1000 username age job //查询多个列的值
1) "zhangya"
2) "27"
3) "it"
127.0.0.1:6379> hgetall user:1000 //查询user=1000，的所有键值
1) "username"
2) "zhangya"
3) "age"
4) "27"
5) "job"
6) "it"
127.0.0.1:6379> hmset user:1000 qq 526195417 //在指定键 增加一个列值
OK
127.0.0.1:6379> hgetall user:1000
1) "username"
2) "zhangya"
3) "age"
4) "27"
5) "job"
6) "it"
7) "qq"
8) "526195417"

增：
hset myhash field1 "s"    
//若字段field1不存在,创建该键及与其关联的Hashes, Hashes中,key为field1 ,并设value为s ，若存在会覆盖原value

hsetnx myhash field1 s    
//若字段field1不存在,创建该键及与其关联的Hashes, Hashes中,key为field1 ,并设value为s， 若字段field1存在,则无效


hmset myhash field1 "hello" field2 "world"
//一次性设置多个字段

删:
hdel myhash field1                      删除 myhash 键中字段名为 field1 的字段
del myhash                              删除键

改:  
hincrby myhash field 1                  给field的值加1
HSET user:1000 qq 513247869             修改指定列的值

查:
hget myhash field1                      获取键值为 myhash,字段为 field1 的值
hlen myhash                             获取myhash键的字段数量
hexists myhash field1                   判断 myhash 键中是否存在字段名为 field1 的字段
hmget myhash field1 field2 field3       一次性获取多个字段
hgetall myhash                          返回 myhash 键的所有字段及其值
hkeys myhash                            获取myhash 键中所有字段的名字
hvals myhash                            获取 myhash 键中所有字段的值
```

### 4.4 将mysql中的表导入到redis中
```bash
db03 [(none)]>select * from oldboy.t100w where id<100;
+------+--------+------+------+---------------------+
| id   | num    | k1   | k2   | dt                  |
+------+--------+------+------+---------------------+
|    1 | 862168 | CJ   | DEOP | 2020-05-06 15:17:01 |
|    2 | 457542 | uf   | BC67 | 2020-05-06 15:17:01 |
...

db03 [oldboy]>select concat("hmset t100w_",id," id ",id," num ",num," k1 ",k1," k2 ",k2," dt ","'",dt,"'") from t100w where id<100 INTO OUTFILE '/tmp/t100w.txt';
Query OK, 99 rows affected (0.31 sec)
[root@db03 ~]# cat /tmp/t100w.txt 
hmset t100w_1 id 1 num 862168 k1 CJ k2 DEOP dt '2020-05-06 15:17:01'
hmset t100w_2 id 2 num 457542 k1 uf k2 BC67 dt '2020-05-06 15:17:01'
...

[root@db03 ~]# scp /tmp/t100w.txt root@10.0.0.51:/tmp/ 
root@10.0.0.51's password: 
t100w.txt                                                                         100% 6999     5.7MB/s   00:00 
[root@db01 ~]# ll /tmp/
总用量 8
-rw-r--r-- 1 root root 6810 5月  10 22:06 t100w.txt
[root@db01 ~]# cat /tmp/t100w.txt |redis-cli
OK
OK

[root@db01 ~]# redis-cli keys t100w_*
 1) "t100w_10"
 2) "t100w_13"
 3) "t100w_65"
 4) "t100w_45"

验证数据一致性：
redis：
[root@db01 ~]# redis-cli hgetall t100w_99
 1) "id"
 2) "99"
 3) "num"
 4) "30553"
 5) "k1"
 6) "XP"
 7) "k2"
 8) "67VW"
 9) "dt"
10) "2020-05-06 15:17:01"
mysql：
db03 [oldboy]>select * from oldboy.t100w where id=99;
+------+-------+------+------+---------------------+
| id   | num   | k1   | k2   | dt                  |
+------+-------+------+------+---------------------+
|   99 | 30553 | XP   | 67VW | 2020-05-06 15:17:01 |
+------+-------+------+------+---------------------+
```

## 5.SET 集合类型（join union）
### 5.1应用场景：
**案例：**在微博应用中，可以将一个用户所有的关注人存在一个集合中，将其所有粉丝存在一个集合。
Redis还为集合提供了求交集、并集、差集等操作，可以非常方便的实现如共同关注、共同喜好、二度好友等功能，
对上面的所有集合操作，你还可以使用不同的命令选择将结果返回给客户端还是存集到一个新的集合中。

### 5.2操作命令:
集合是字符串的无序排列,
- `SADD` 指令把新的元素添加到 set 中
- `SMEMBERS`查看集合内元素

```bash
127.0.0.1:6379> SADD lxl pg1 mff lbw dsm
(integer) 4
127.0.0.1:6379> SADD jnl lbw dsm uu
(integer) 3
127.0.0.1:6379> SMEMBERS lxl
1) "pg1"
2) "dsm"
3) "mff"
4) "lbw"
SADD lzx lxl jnl dsm
```
和 list 类型不同,set 集合不允许出现重复的元素
```bash
127.0.0.1:6379>  sadd jnl lbw
(integer) 0 //返回值为0，表示插入元素失败
```

Srem 用来删除指定的值
```bash
127.0.0.1:6379> SREM lxl dsm
(integer) 1
127.0.0.1:6379> SMEMBERS lxl
1) "pg1"
2) "mff"
3) "lbw"
```

sdiff 差异对比
```bash
127.0.0.1:6379> SMEMBERS dsm
1) "pg1"
2) "mff"
3) "lbw"
127.0.0.1:6379> SMEMBERS lxl
1) "pg1"
2) "mff"
3) "lbw"
127.0.0.1:6379> SMEMBERS jnl
1) "uu"
2) "dsm"
3) "lbw"

127.0.0.1:6379> SDIFF lxl jnl //以lxl为基准，jnl合集中不存在pg1和mff
1) "pg1"
2) "mff"
127.0.0.1:6379> SDIFF jnl dsm //以jnl为基准，dsm合集中不存在dsm和uu
1) "dsm"
2) "uu"
127.0.0.1:6379> SDIFF jnl dsm lxl //以jnl和dsm对比出来的结果为基准，lxl中不存在dsm和uu
1) "dsm"
2) "uu"
127.0.0.1:6379> SADD lxl uu
(integer) 1
127.0.0.1:6379> SDIFF jnl dsm lxl
1) "dsm"
```

Sinter 计算集合的交集（共同粉丝）
```bash
127.0.0.1:6379> sinter jnl dsm lxl //他们三个的粉丝中都有lbw
1) "lbw"
```
Sunion 计算集合并集（两个人的粉丝去重相加）
```bash
127.0.0.1:6379> Sunion jnl dsm
1) "dsm"
2) "uu"
3) "lbw"
4) "pg1"
5) "mff"
```
```bash
增：
sadd myset a b c  
//若key不存在,创建该键及与其关联的set,依次插入a ,b, c
//若key存在,则插入value中,若a 在myset中已经存在,则插入了 b 和 c 两个新成员。

删：
spop myset              移除一个尾部元素
srem myset a d f        若f不存在, 移出 a、d ,并返回2

改：
SMOVE jnl lxl uu        将uu从 jnl 移到 lxl

查：
sismember myset a       判断 a 是否已经存在，返回值为 1 表示存在。
smembers myset          查看set中的内容
scard myset             获取Set 集合中元素的数量
srandmember myset       随机的返回某一成员
sdiff myset1 myset2 myset3               1和2得到一个结果,拿这个集合和3比较,获得每个独有的值
sdiffstore diffkey myset myset2 myset3   3个集和比较,获取独有的元素,并存入diffkey 关联的Set中
sinter myset myset2 myset3               获得3个集合中都有的元素
sinterstore interkey myset myset2 myset3 把交集存入interkey 关联的Set中
sunion myset myset2 myset3               获取3个集合中的成员的并集
sunionstore unionkey myset myset2 myset3 把并集存入unionkey 关联的Set中
```

## 6.Redis持久化
### 6.1RDB 持久化优缺点:
可以在指定的时间间隔内生成数据集的 时间点快照（point-in-time snapshot）。
- 优点：速度快，适合于用做备份，主从复制也是基于 RDB 持久化功能实现的。
- 缺点：会有数据丢失

### 6.2RDB持久化参数：
```bash
#持久化数据存放目录
dir dir /data/redis_cluster/redis_6379
#RBD持久化数据文件
dbfilename redis_6379.rdb
#15分钟内有一个数据变化就save持久化
save 900 1
#5分钟内有10个数据变化就save持久化
save 300 10
#60秒内有10000个数据变化就save持久化
save 60 10000
```

### 6.3RDB持久化测试：
```bash
[root@db01 ~]# cat /application/redis_cluster/redis_6379/conf/redis_6379.conf 
### 以守护进程模式启动
daemonize yes
### 绑定的主机地址
bind 10.0.0.51 127.0.0.1
### 监听端口
port 6379
### pid 文件和 log 文件的保存地址
pidfile /application/redis_cluster/redis_6379/pid/redis_6379.pid
logfile /application/redis_cluster/redis_6379/logs/redis_6379.log
### 设置数据库的数量，默认数据库为 0
databases 16
### 指定本地持久化文件的文件名,默认是 dump.rdb
dbfilename redis_6379.rdb
### 本地数据库的目录
dir /data/redis_cluster/redis_6379
save 60 1000
[root@db01 ~]# systemctl restart redis6379
[root@db01 ~]# for i in `seq 1 3000`;do redis-cli set k_${i} v_${i}; done
[root@db01 ~]# ll /data/redis_cluster/redis_6379/
总用量 4
-rw-r--r-- 1 root root 110 5月  11 10:55 redis_6379.rdb
[root@db01 ~]# redis-cli
127.0.0.1:6379> CONFIG GET save
1) "save"
2) "60 1000"
```

### 6.4AOF 持久化(append-only log file)优缺点
记录服务器执行的所有写操作命令，并在服务器启动时，通过重新执行这些命令来还原数据集。
AOF 文件中的命令全部以 Redis 协议的格式来保存，新命令会被追加到文件的末尾。
- 优点：可以最大程度保证数据不丢
- 缺点：日志记录量级比较大

AOD持久化参数：
```bash
#打开AOF持久化功能
appendonly yes
#每秒执行一次持久化操作（写入日志）
appendfsync everysec

或-------------------------------------------------------

#每执行一个写操作语句，就会持久化一次
appendfsync always

或-------------------------------------------------------

#写入工作交给操作系统，由操作系统判断缓存区大小统一写入到AOF
appendfsync no
```
### 6.4AOF持久化测试
```bash
[root@db01 ~]# cat /application/redis_cluster/redis_6379/conf/redis_6379.conf 
### 以守护进程模式启动
daemonize yes
### 绑定的主机地址
bind 10.0.0.51 127.0.0.1
### 监听端口
port 6379
### pid 文件和 log 文件的保存地址
pidfile /application/redis_cluster/redis_6379/pid/redis_6379.pid
logfile /application/redis_cluster/redis_6379/logs/redis_6379.log
### 设置数据库的数量，默认数据库为 0
databases 16
### 指定本地持久化文件的文件名,默认是 dump.rdb
dbfilename redis_6379.rdb
### 本地数据库的目录
dir /data/redis_cluster/redis_6379
save 60 1000
#打开AOF持久化功能
appendonly yes
##每秒执行一次持久化操作（写入日志）
appendfsync everysec
[root@db01 ~]# systemctl restart redis6379
[root@db01 ~]# ll  /data/redis_cluster/redis_6379/
总用量 4
-rw-r--r-- 1 root root  0 5月  11 11:26 appendonly.aof
-rw-r--r-- 1 root root 92 5月  11 11:26 redis_6379.rdb
```
**注意**：
1.如果同时有AOF和RDB存在，重启的时候，载入的是AOF文件
2.shutdown，此命令在redis中执行时。其实会触发两条命令 
  - bgsave //持久化
  - shutdown //关闭服务

### 6.5持久化面试题
redis 持久化方式有哪些？有什么区别？
rdb：基于快照的持久化，速度更快，一般用作备份，主从复制也是依赖于 rdb 持久化功能
aof：以追加的方式记录 redis 操作日志的文件。可以最大程度的保证 redis 数据安全，类似于 mysql 的 binlog

## 7.Redis安全认证
redis 默认开启了保护模式，只允许本地回环地址登录并访问数据库。
```bash
禁止 protected-mode
protected-mode yes/no （保护模式，是否只允许本地访问）
```
(1)Bind :指定 IP 进行监听
```bash
[root@db01 ~]# vim /opt/redis_cluster/redis_6379/conf/redis_6379.conf
bind 10.0.0.51 127.0.0.1
```
(2)增加 requirepass {password}
```bash
[root@db01 ~]# vim /opt/redis_cluster/redis_6379/conf/redis_6379.conf
requirepass 123456
验证方法一：
[root@db01 ~]# redis-cli -a 123456
127.0.0.1:6379> set k1 v1
OK
验证方法二：
[root@db01 ~]# redis-cli
127.0.0.1:6379> auth 123456
OK
127.0.0.1:6379> set k2 v2
OK
```

## 8.Redis配置的热更新
```bash
CONFIG GET *

127.0.0.1:6379> CONFIG GET save
1) "save"
2) ""
127.0.0.1:6379> CONFIG SET save "60 100 300 10 600 1"
OK
127.0.0.1:6379> CONFIG GET save
1) "save"
2) "60 100 300 10 600 1"
```