---
title: Zookeeper-单节点与分布式
author: 饼铛
cover: /images/img-161.png
tags:
  - Zookeeper
  - 分布式
categories:
  - Web集群
abbrlink: 7be7c575
date: 2020-06-30 15:22:00
---
>ZooKeeper是一个分布式开源框架，提供了协调分布式应用的基本服务，它向外部应用暴露一组通用服务——分布式同步（Distributed Synchronization）、命名服务（Naming Service）、集群维护（Group Maintenance）等，简化分布式应用协调及其管理的难度，提供高性能的分布式服务。ZooKeeper本身可以以Standalone模式安装运行，不过它的长处在于通过分布式ZooKeeper集群（一个Leader，多个Follower），基于一定的策略来保证ZooKeeper集群的稳定性和可用性，从而实现分布式应用的可靠性。

## 0.环境准备
### 0.1规范目录
```bash
#root用户执行
useradd hadoop
mkdir -p /application/hadoop #zookeeper安装目录
mkdir -p /data/zookeeper/zkdata #zookeeper数据目录
mkdir -p /data/zookeeper/zklog #zookeeper日志目录
chown -R hadoop.hadoop /application/hadoop #授权
chown -R hadoop.hadoop /data/zookeeper
```
### 0.2安装jdk
```bash
su - hadoop
#普通用户执行
tar -xf jdk-8u161-linux-x64.tar.gz -C /application/hadoop/
ln -s /application/hadoop/jdk1.8.0_161/ /application/hadoop/jdk
```

### 0.3java环境变量
```bash
#普通用户执行
cat >>~/.bashrc <<'EOF'
export JAVA_HOME=/application/hadoop/jdk 
export PATH=$JAVA_HOME/bin:$JAVA_HOME/jre/bin:$PATH 
export CLASSPATH=.:$JAVA_HOME/lib:$JAVA_HOME/jre/lib:$JAVA_HOME/lib/tools.jar
EOF
. ~/.bashrc

[hadoop@cdh001 ~]$ java -version
```

## 1.ZooKeeper Standalone模式
从Apache网站上（zookeeper.apache.org）下载ZooKeeper软件包，我选择了3.4.5版本的（zookeeper-3.4.5-cdh5.10.0.tar.gz），在一台Linux机器上安装非常容易，只需要解压缩后，简单配置一下即可以启动ZooKeeper服务器进程。

### 1.1解压安装zookeeper
```bash
[hadoop@cdh001 ~]$ tar -xf zookeeper-3.4.5-cdh5.10.0.tar.gz -C /application/hadoop/
[hadoop@cdh001 ~]$ cd /application/hadoop/
[hadoop@cdh001 ~]$ ln -s /application/hadoop/zookeeper-3.4.5-cdh5.10.0/ /application/hadoop/zookeeper
```

### 1.2添加配置
```bash
cat > /application/zookeeper/conf/zoo.cfg <<'EOF' 
# The number of milliseconds of each tick
# 这个时间是作为 Zookeeper服务器之间或客户端与服务器之间维持心跳的时间间隔
tickTime=2000
# The number of ticks that the initial 
# synchronization phase can take
# 配置 Zookeeper接受客户端初始化连接时最长能忍受多少个心跳时间间隔数。
initLimit=10
# The number of ticks that can pass between 
# sending a request and getting an acknowledgement
# Leader与Follower之间发送消息，请求和应答时间长度
syncLimit=5
# the directory where the snapshot is stored.
# do not use /tmp for storage, /tmp here is just 
# example sakes.
# 数据目录
dataDir=/data/zookeeper/zkdata
# 日志目录
dataLogDir=/data/zookeeper/zklog
# the port at which the clients will connect
# 侦听端口
clientPort=2181
#
# Be sure to read the maintenance section of the 
# administrator guide before turning on autopurge.
#
# http://zookeeper.apache.org/doc/current/zookeeperAdmin.html#sc_maintenance
#
# The number of snapshots to retain in dataDir
#autopurge.snapRetainCount=3
# Purge task interval in hours
# Set to "0" to disable auto purge feature
#autopurge.purgeInterval=1
#server，每个节点服务编号=服务器ip地址：集群通信端口：选举端口(Leader宕机后)
server.1=zoo-01:2888:3888
EOF

修改单节点的服务编号
cdh001:
cat>/data/zookeeper/zkdata/myid<<EOF
1
EOF
```

### 1.3Zookeeper环境变量
```bash
#普通用户执行
cat >>~/.bashrc <<'EOF'
export ZOOKEEPER_HOME=/application/zookeeper
export PATH=$ZOOKEEPER_HOME/bin:$PATH
export PATH=/application/aria2/bin:$PATH
EOF
. ~/.bashrc
```
### 1.4防火墙放行并启动
`2181`zookeeper服务端口
`2888`集群通信端口
`3888`选举端口

`zkServer.sh restart` 重启服务
`zkServer.sh status` 查看服务运行状态
`zkServer.sh stop` 关闭服务


### 1.5检查进程
```bash
jps
1558 QuorumPeerMain 
```

### 1.6Zookeeper客户端连接
在客户端连接ZooKeeper服务器，执行如下命令：
`bin/zkCli.sh -server dynamic:2181`
上面dynamic是我的主机名，如果在本机执行，则执行如下命令即可：
`bin/zkCli.sh`

## 2.ZooKeeper Distributed模式
>首先要明确的是，ZooKeeper集群是一个独立的分布式协调服务集群，“独立”的含义就是说，如果想使用ZooKeeper实现分布式应用的协调与管理，简化协调与管理，任何分布式应用都可以使用，这就要归功于Zookeeper的数据模型（Data Model）和层次命名空间（Hierarchical Namespace）结构。

### 2.1主机名称到IP地址映射配置
ZooKeeper集群中具有两个关键的角色：`Leader`和`Follower`
**集群中所有的节点作为一个整体对分布式应用提供服务，集群中每个节点之间都互相连接，所以，在配置的ZooKeeper集群的时候，每一个节点的host到IP地址的映射都要配置上集群中其它结点的映射信息。**
### 2.2hosts解析（所有节点执行）
```bash
cat >> /etc/hosts <<'EOF'
10.0.0.50 cdh001 
10.0.0.60 cdh002
10.0.0.70 cdh003
EOF
```
ZooKeeper采用一种称为`Leader election`的选举算法。在整个集群运行过程中，只有一个`Leader`，其他的都是`Follower`，如果ZooKeeper集群在运行过程中`Leader`出了问题，系统会采用该算法重新选出一个`Leader`(通过3388端口)。因此，各个结点之间要能够保证互相连接，必须配置上述映射。<br>
ZooKeeper集群启动的时候，会首先选出一个`Leader`，在`Leader election`过程中，某一个满足选举算的结点就能成为`Leader`。
### 2.3配置节点互信
```bash
批量密钥分发，配置所有节点互信（所有节点执行）
#!/bin/bash
#yum install sshpass -y
ssh-keygen -f ~/.ssh/id_rsa  -P '' -q
for ip in 50 60 70  #<==客户端ip
do
sshpass -p123 ssh-copy-id -p22 -f -i ~/.ssh/id_rsa.pub "-o StrictHostKeyChecking=no" 10.0.0.$ip
done

#个人习惯非必要
```

### 2.4二进制安装
解压安装zookeeper（所有节点执行）
```bash
[hadoop@cdh001 ~]$ tar -xf zookeeper-3.4.5-cdh5.10.0.tar.gz -C /application/hadoop/
[hadoop@cdh001 ~]$ ln -s /application/hadoop/zookeeper-3.4.5-cdh5.10.0/ /application/hadoop/zookeeper
```

### 2.5修改ZooKeeper配置文件
配置文件（所有节点执行）
```
cat >> /application/hadoop/zookeeper/conf/zoo.cfg <<'EOF'
# The number of milliseconds of each tick
# 这个时间是作为 Zookeeper服务器之间或客户端与服务器之间维持心跳的时间间隔
tickTime=2000
# The number of ticks that the initial 
# synchronization phase can take
# 配置 Zookeeper接受客户端初始化连接时最长能忍受多少个心跳时间间隔数。
initLimit=10
# The number of ticks that can pass between 
# sending a request and getting an acknowledgement
# Leader与Follower之间发送消息，请求和应答时间长度
syncLimit=5
# the directory where the snapshot is stored.
# do not use /tmp for storage, /tmp here is just 
# example sakes.
# 数据目录
dataDir=/data/zookeeper/zkdata
# 日志目录
dataLogDir=/data/zookeeper/zklog
# the port at which the clients will connect
# 侦听端口
clientPort=2181
#
# Be sure to read the maintenance section of the 
# administrator guide before turning on autopurge.
#
# http://zookeeper.apache.org/doc/current/zookeeperAdmin.html#sc_maintenance
#
# The number of snapshots to retain in dataDir
#autopurge.snapRetainCount=3
# Purge task interval in hours
# Set to "0" to disable auto purge feature
#autopurge.purgeInterval=1
#server，每个节点服务编号=服务器ip地址：集群通信端口：选举端口
server.1=cdh001:2888:3888
server.2=cdh002:2888:3888
server.3=cdh003:2888:3888
EOF
```
### 2.6修改每个节点的服务编号
**在我们配置的`dataDir`指定的目录下面，创建一个`myid`文件，里面内容为一个数字，用来标识当前主机，`conf/zoo.cfg`文件中配置的server.X中X为什么数字，则`myid`文件中就输入这个数字**
```bash
cdh001:
cat>/data/zookeeper/zkdata/myid<<EOF
1
EOF

cdh002:
cat>/data/zookeeper/zkdata/myid<<EOF
2
EOF

cdh003:
cat>/data/zookeeper/zkdata/myid<<EOF
3
EOF
```

### 2.7启动zookeeper（所有节点执行）
`zkServer.sh restart` 重启服务
`zkServer.sh status` 查看服务运行状态
`zkServer.sh stop` 关闭服务

### 2.8集群验证
```bash
[hadoop@cdh001 ~]$ /application/hadoop/zookeeper/bin/zkServer.sh status
JMX enabled by default
Using config: /application/hadoop/zookeeper/bin/../conf/zoo.cfg
Mode: follower

[hadoop@cdh002 ~]$ /application/hadoop/zookeeper/bin/zkServer.sh status
JMX enabled by default
Using config: /application/hadoop/zookeeper/bin/../conf/zoo.cfg
Mode: follower

[hadoop@cdh003 ~]$ /application/hadoop/zookeeper/bin/zkServer.sh status
JMX enabled by default
Using config: /application/hadoop/zookeeper/bin/../conf/zoo.cfg
Mode: leader
```


