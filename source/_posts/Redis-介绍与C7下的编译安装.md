---
title: Redis-5.0.5介绍与C7下的编译安装
author: 饼铛
cover: /images/img-100.png
tags:
  - Redis
  - NoSQL
categories:
  - DBA
abbrlink: fb94f251
date: 2020-05-10 17:02:00
---
## 0 Redis 是什么
- `Redis` 是一种基于键值对的 `NoSQL` 数据库,与很多键值对数据库不同,`redis` 中的值可以有`string,hash,list,set,zset,geo` 等多种数据结构和算法组成.

- `Redis` 会将所有的数据都放在内存中,所以他的读写性能非常惊人.Redis 还可以将内存中的数据利用快照和日志的形式保存到硬盘上

- `Redis` 提供了键过期,发布订阅,事务,流水线等附加功能.

### 0.2 Redis 重要特性
- 1.速度快
  - Redis 所有的数据都存放在内存中
  - Redis 使用 C 语言实现
  - Redis 使用单线程架构
- 2.基于键值对的数据结构服务器
  - 5 中数据结构:字符串,哈希,列表,集合,有序集合
- 3.丰富的功能
  - 提供了键过期功能,可以实现缓存
  - 提供了发布订阅功能,可以实现消息系统
  - 提供了 pipeline 功能,客户端可以将一批命令一次性传到 Redis,减少了网络开销
- 4.简单稳定
  - 源码很少,3.0 版本以后 5 万行左右.
  - 使用单线程模型法,是的 Redis 服务端处理模型变得简单.
  - 不依赖操作系统的中的类库
- 5.客户端语言多
  - java,PHP,python,C,C++,Nodejs 等
- 6.持久化
  - RDB 和 AOF
- 7.主从复制
- 8.高可用和分布式
  - 哨兵
  - 集群

### 0.3 Redis 应用场景
- 1.缓存-键过期时间
  - 缓存 session 会话
  - 缓存用户信息,找不到再去 mysql 查,查到然后回写到 redis
- 2.排行榜-列表&有序集合
  - 热度排名排行榜
  - 发布时间排行榜
- 3.计数器应用-天然支持计数器
  - 帖子浏览数
  - 视频播放次数
  - 商品浏览数
- 4.社交网络-集合
  - 踩/赞,粉丝,共同好友/喜好,推送,打标签
- 5.消息队列系统-发布订阅
  - 配合 elk 实现日志收集

## 1.目录规划
```bash
### redis 下载目录
mkdir -p /server/{tools,scripts} && cd /server/tools
wget http://download.redis.io/releases/redis-5.0.5.tar.gz
### redis 安装目录
/application/redis_cluster/redis_{PORT}/{conf,logs,pid}
### redis 数据目录
/data/redis_cluster/redis_{PORT}/
### redis 运维脚本
/server/scripts/redis_shell.sh
```
## 2.解析主机
```bash
cat >> /etc/hosts <<EOF
10.0.0.51 db01
10.0.0.52 db02
10.0.0.53 db03
EOF
```
## 3.配置互信
```bash
[root@db01 ~]# ssh-keygen 
[root@db01 ~]# ssh-copy-id db02
[root@db01 ~]# ssh-copy-id db03
```
## 4.安装redis
```bash
yum -y install gcc automake autoconf libtool make
[root@db01 ~]# tar -xf /server/tools/redis-5.0.5.tar.gz -C /application/redis_cluster/
[root@db01 ~]# ln -s /application/redis_cluster/redis-5.0.5/ /application/redis_cluster/redis
[root@db01 ~]# ll /application/redis_cluster/
总用量 0
lrwxrwxrwx 1 root root  40 5月  10 15:28 redis -> /application/redis_cluster/redis-5.0.5/
drwxrwxr-x 6 root root 309 6月  13 2018 redis-5.0.5
drwxr-xr-x 5 root root  41 5月  10 15:12 redis_6379
[root@db01 ~]# cd /application/redis_cluster/redis-5.0.5/ && make //不执行make install，将redis编译好的可执行文件限制在此目录，否则可执行文件会被拷贝到/usr/local/bin 目录中，后者不需要额外添加环境变量

//或者利用官方提供的脚本进行交互式安装

/application/redis_cluster/redis/utils/install_server.sh
```
## 5.添加环境变量
```bash
[root@db01 ~]# cat >>/etc/bashrc<<'EOF'
export PATH=/application/redis_cluster/redis/src:$PATH
EOF
[root@db01 ~]# . /etc/bashrc

[root@db01 ~]# redis-server -v
Redis server v=5.0.5 sha=00000000:0 malloc=jemalloc-5.1.0 bits=64 build=80d2ef2db5b4103a
```
## 6.可执行文件
```bash
redis-benchmark  
redis-check-rdb       
redis-check-aof  
redis-cli        #客户端连接工具
redis-sentinel   #哨兵服务端
redis-server     #服务端
```
## 7.配置文件
```bash
cat > /application/redis_cluster/redis_6379/conf/redis_6379.conf <<'EOF'
### 以守护进程模式启动
daemonize yes
### 绑定的主机地址
bind 10.0.0.51 127.0.0.1
### 监听端口
port 6379
### pid 文件和 log 文件的保存地址
pidfile /opt/redis_cluster/redis_6379/pid/redis_6379.pid
logfile /opt/redis_cluster/redis_6379/logs/redis_6379.log
### 设置数据库的数量，默认数据库为 0
databases 16
### 指定本地持久化文件的文件名,默认是 dump.rdb
dbfilename redis_6379.rdb
### 本地数据库的目录
dir /data/redis_cluster/redis_6379
EOF
```
## 8.启动连接redis
```bash
[root@db01 ~]# redis-server /application/redis_cluster/redis_6379/conf/redis_6379.conf 
[root@db01 ~]# ps -ef | grep redis
root      4414     1  0 16:14 ?        00:00:00 redis-server 10.0.0.51:6379
[root@db01 ~]# redis-cli -h db01
db01:6379>
db01:6379> SHUTDOWN //关闭
```
## 9.systemctl管理Redis启动、停止、开机启动
### 9.1创建服务
用service来管理服务的时候，是在/etc/init.d/目录中创建一个脚本文件，来管理服务的启动和停止，在systemctl中，也类似，文件目录有所不同，在`/lib/systemd/system/`目录下创建一个脚本文件`redis6379.service`，里面的内容如下：
```bash
cat >/lib/systemd/system/redis6379.service<<EOF
[Unit]
Description=Redis
After=network.target

[Service]
ExecStart=/application/redis_cluster/redis/src/redis-server /application/redis_cluster/redis_6379/conf/redis_6379.conf  --daemonize no
ExecStop=/application/redis_cluster/redis/src/redis-cli -h 127.0.0.1 -p 6379 shutdown

[Install]
WantedBy=multi-user.target
EOF
```
- [Unit] 表示这是基础信息
  - Description 是描述
  - After 是在那个服务后面启动，一般是网络服务启动后启动
- [Service] 表示这里是服务信息
  - ExecStart 是启动服务的命令
  - ExecStop 是停止服务的指令
- [Install] 表示这是是安装相关信息
  - WantedBy 是以哪种方式启动：multi-user.target表明当系统以多用户方式（默认的运行级别）启动时，这个服务需要被自动运行。

### 9.2创建软链接
创建软链接是为了下一步系统初始化时自动启动服务
`ln -s /lib/systemd/system/redis6379.service /etc/systemd/system/multi-user.target.wants/redis6379.service`

### 9.3刷新配置
刚刚配置的服务需要让systemctl能识别，就必须刷新配置
`systemctl daemon-reload`

### 9.4测试
```bash
[root@db01 ~]# systemctl status redis6379
[root@db01 ~]# systemctl restart redis6379
[root@db01 ~]# systemctl disable redis6379
Removed symlink /etc/systemd/system/multi-user.target.wants/redis6379.service.
```