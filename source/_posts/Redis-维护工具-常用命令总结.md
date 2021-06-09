---
title: Redis-维护工具&常用命令总结
author: 饼铛
cover: /images/img-100.png
tags:
  - Redis
  - NoSQL
  - tools
categories:
  - DBA
abbrlink: 212d60e3
date: 2020-05-13 17:27:00
---
## 1.Redis 集群常用命令
### 1.1集群(cluster)
 - `CLUSTER INFO` 打印集群的信息
 - `CLUSTER NODES` 列出集群当前已知的所有节点（node），以及这些节点的相关信息。

### 1.2节点(node)
 - `CLUSTER MEET <ip> <port>` 将 ip 和 port 所指定的节点添加到集群当中，让它成为集群的一份子。
 - `CLUSTER FORGET <node_id>` 从集群中移除 node_id 指定的节点。
 - `CLUSTER REPLICATE <node_id>` 将当前节点设置为 node_id 指定的节点的从节点。
 - `CLUSTER SAVECONFIG` 将节点的配置文件保存到硬盘里面。

### 1.3槽(slot)
 - `CLUSTER ADDSLOTS <slot> [slot ...]` 将一个或多个槽（slot）指派（assign）给当前节点。
 - `CLUSTER DELSLOTS <slot> [slot ...]` 移除一个或多个槽对当前节点的指派。
 - `CLUSTER FLUSHSLOTS` 移除指派给当前节点的所有槽，让当前节点变成一个没有指派任何槽的节点。
 - `CLUSTER SETSLOT <slot> NODE <node_id>` 将槽 slot 指派给 node_id 指定的节点，如果槽已经指派给另一个节点，那么先让另一个节点删除该槽>，然后再进行指派。
 - `CLUSTER SETSLOT <slot> MIGRATING <node_id>` 将本节点的槽 slot 迁移到 node_id 指定的节点中。
 - `CLUSTER SETSLOT <slot> IMPORTING <node_id>` 从 node_id 指定的节点中导入槽 slot 到本节点。
 - `CLUSTER SETSLOT <slot> STABLE` 取消对槽 slot 的导入（import）或者迁移（migrate）。

### 1.4键 (key)
 - `CLUSTER KEYSLOT <key>` 计算键 key 应该被放置在哪个槽上。
 - `CLUSTER COUNTKEYSINSLOT <slot>` 返回槽 slot 目前包含的键值对数量。`CLUSTER GETKEYSINSLOT <slot> <count>`返回 count 个 slot 槽中的键。
 
## 2.Redis通用运维脚本
```bash
#!/bin/bash
###################################################
# File Name: redis_shell.sh
# Created Time: 2019年05月12日 星期二 12时54分39秒
# Version: V1.0
# Author: Felix
# Organization: 360JR OPS
###################################################
USAG(){
    echo "sh $0 {start|stop|restart|login|ps|tail} PORT"
}
if [ "$#" = 1 ]
then
    REDIS_PORT='6379'
elif 
    [ "$#" = 2 -a -z "$(echo "$2"|sed 's#[0-9]##g')" ]
then
    REDIS_PORT="$2"
else
    USAG
    exit 0
fi

REDIS_IP=$(ip addr show enp0s8|sed -nr '3s#^.*inet (.*)/.*$#\1#gp')
PATH_DIR=/application/redis_cluster/redis_${REDIS_PORT}/
PATH_CONF=/application/redis_cluster/redis_${REDIS_PORT}/conf/redis_${REDIS_PORT}.conf
PATH_LOG=/application/redis_cluster/redis_${REDIS_PORT}/logs/redis_${REDIS_PORT}.log

CMD_START(){
    redis-server ${PATH_CONF}
}

CMD_SHUTDOWN(){
    redis-cli -c -h ${REDIS_IP} -p ${REDIS_PORT} shutdown
}

CMD_LOGIN(){
    redis-cli -c -h ${REDIS_IP} -p ${REDIS_PORT}
}

CMD_PS(){
    ps -ef|grep redis
}

CMD_TAIL(){
    tail -f ${PATH_LOG}
}
CMD_STATUS(){
    redis-cli -c -h ${REDIS_IP} -p ${REDIS_PORT} CLUSTER INFO|grep -Ew "cluster_state|cluster_known_nodes|cluster_slots_assigned"
    echo -e "\nSlots state:"
    redis-cli -c -h ${REDIS_IP} -p ${REDIS_PORT} CLUSTER NODES|awk '{print $2,$3,$NF}'
}
case $1 in
    start)
        CMD_START
        CMD_PS
        ;;
    stop)
        CMD_SHUTDOWN
        CMD_PS
        ;;
    restart)
        CMD_SHUTDOWN
        CMD_START
        CMD_PS
        ;;
    login)
        CMD_LOGIN
        ;;
    ps)
        CMD_PS
        ;;
    tail)
        CMD_TAIL
        ;;
    csstatus)
        CMD_STATUS
        ;;
    *)
      USAG
esac
```

## 3.数据导入导出工具
### 3.1需求背景
刚切换到 redis 集群的时候肯定会面临数据导入的问题,所以这里推荐使用 redis-migrate-tool 工具来导入单节点数据到集群里

适用于：redis 3.2&以下版本

**官方地址：**[https://www.oschina.net/p/redis-migrate-tool](https://www.oschina.net/p/redis-migrate-tool)

### 3.2安装工具
```bash
yum -y install automake libtool autoconf bzip2
cd /application/redis_cluster/
git clone https://github.com/vipshop/redis-migrate-tool.git
autoreconf -fvi
./configure
make && make install
```

### 3.3测试单节点数据导入集群
#### 3.3.1生成配置文件：
```
cat > redis_6379_to_6380.conf  <<EOF
[source]
type: single
servers:
- 10.0.0.51:6379
#源

[target]
type: redis cluster
servers:
- 10.0.0.51:6380 
#复制到目标集群

[common]
listen: 0.0.0.0:8888
source_safe: true
EOF
```

#### 3.3.2生成测试数据
```bash
//启动单节点
[root@db01 ~]# sh redis_shell.sh login 6379


for i in $(seq 1 1000)
do
 redis-cli -c -h db01 -p 6379 set 6379k_${i} v_${i} && echo "set 6379k_${i} is ok"
done

[root@db01 ~]# sh redis_shell.sh login 6379
10.0.0.51:6379> DBSIZE
(integer) 1000
```
#### 3.3.4检查集群状态：
```bash
[root@db01 ~]# sh redis_shell.sh csstatus 6380
cluster_state:ok
cluster_slots_assigned:16384
cluster_known_nodes:6

Slots state:
10.0.0.52:6380@16380 master 6827-10922
10.0.0.52:6381@16381 slave connected
10.0.0.53:6380@16380 master 10923-16383
10.0.0.51:6381@16381 slave connected
10.0.0.51:6380@16380 myself,master 0-5460
10.0.0.53:6381@16381 slave connected
```
#### 3.3.5执行导入命令
`[root@db01 ~]# redis-migrate-tool -c redis_6379_to_6380.conf`
#### 3.3.6数据校验
`[root@db01 ~]# redis-migrate-tool -c redis_6379_to_6380.conf -C redis_check`

## 4.分析占用空间比较大的键

### 4.1需求背景
redis的内存使用太大键值太多,不知道哪些键值占用的容量比较大,而且在线分析会影响性能.

### 4.2安装工具
```bash
yum install python-pip gcc
pip install --upgrade pip
pip install rdbtools
```
### 4.3使用方法
```bash
cd /data/redis_cluster/redis_6379/
rdb -c memory redis_6379.rdb -f 6379_memory.csv

分析rdb
awk -F ',' '{print $4,$2,$3,$1}' 6379_memory.csv |sort  > 6379.sort
```
## 5.一些概念：
- 缓存穿透：
访问一个不存在的key，缓存不起作用，请求会穿透到数据库中，流量过大会挂掉数据库。
  - 解决方案：
采用布隆过滤器，使用一个足够大的bitmap，用于存储可能访问的key，不存在的直接被过滤。
访问key未在数据库总查询到值，也将空值写入缓存，但可以设置较短的过期时间。

- 缓存雪崩：
大量的key设置了相同的过期时间，导致缓存在同一时刻全部失效，造成瞬时数据库请求量过大，压力大增，引起雪崩。
  - 解决方案：
可以给缓存设置过期时间时加上一个随机值时间，使得每个key的过期时间分布开来，不会集中在同一时刻失效。

- 缓存击穿：
一个存在的key，在缓存过期的那一刻，同时有大量的请求。这些请求都会击穿到数据库，造成瞬时数据库请求量过大，压力大增。
  - 解决方案：
在访问key之前，采用SETNX（set if not exists）来设置另一个短期key来锁住当前key的访问，访问结束再删除该短期的key。