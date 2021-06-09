---
title: ELK-Elasticsearch介绍与安装
author: 饼铛
cover: /images/img-156.png
tags:
  - ELK
  - Web集群
categories:
  - Web集群
abbrlink: 17b35260
date: 2019-05-26 16:52:00
---
## 1.什么是倒排索引
1. 信息存储到es时，首先把每条语句分成一个一个的词语
2. 根据搜索的内容，进行分配，有匹配到的权重+1
3. 把匹配到的语局给呈现出来

## 2.elasticsearch介绍
### 2.1elasticsearch应用场景
1. 电商平台
2. 高亮显示搜索的词条信息
3. 日志分析elk

### 2.2elasticsearch特点
1. 高性能：es可以支持一主多从，水平扩展方便
2. 高可用性：一个主节点宕机后不影响用户的使用。
3. 用户使用方便快捷：es采用Java开发，即使不懂Java代码，一样可以使用
4. 功能丰富，配置简单
5. 采用restful封装的接口，可以通过http发起请求

### 2.3elasticsearch部署方法

|安装方式|优点|对运维的要求|
|:-----|:-----|:-----|
|docker|部署方便、开箱即用、启动迅速|需要会docker知识、需要制作镜像、修改配置麻烦、数据需要挂载目录|
|tar|部署灵活、对系统侵占性小|需要写启动脚本文件、目录需要提前规划|
|rpm|部署方便、启动脚本安装即用、存放目录标准化|软件各个组件分散在不同的目录、卸载不彻底、默认配置需要修改|
|ansible|极其灵活、批量部署速度快|需要学习ansible语法、需要提前规划、需要专人维护|

## 3.安装jdk
```bash
wget https://download.oracle.com/otn/java/jdk/8u60-b27/jdk-8u60-linux-x64.tar.gz
[root@db01 /server/tools]# tar -xf jdk1.8.0_131.tar.gz -C /application/
[root@db01 /application]# ln -s jdk1.8.0_131/ jdk

cat >>/etc/bashrc <<'EOF'
export JAVA_HOME=/application/jdk 
export PATH=$JAVA_HOME/bin:$JAVA_HOME/jre/bin:$PATH 
export CLASSPATH=.:$JAVA_HOME/lib:$JAVA_HOME/jre/lib:$JAVA_HOME/lib/tools.jar
EOF

[root@db01 /application]# . /etc/bashrc
[root@db01 /application]# java -version
java version "1.8.0_131"
```

## 4.安装elasticsearch
```bash
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-6.6.0.rpm
//上传elasticsearch-6.6.0.rpm
[root@db01 /server/tools]# yum install elasticsearch-6.6.0.rpm -y 
### NOT starting on installation, please execute the following statements to configure elasticsearch service to start automatically using systemd
 sudo systemctl daemon-reload
 sudo systemctl enable elasticsearch.service
### You can start elasticsearch service by executing
 sudo systemctl start elasticsearch.service


```

### 4.1配置启动
```bash
sed -i 's%#JAVA_HOME=%JAVA_HOME=/application/jdk/%g' /etc/sysconfig/elasticsearch
//更改JAVA_HOME

systemctl daemon-reload
systemctl enable elasticsearch.service
systemctl start elasticsearch.service
systemctl status elasticsearch.service
systemctl is-active elasticsearch.service
```
### 4.2检查启动
```bash
ps -ef | grep elastic
lsof -i:9200
curl localhost:9200
```

### 4.3查看配置文件位置
```bash
[root@db01 ~]# rpm -qc elasticsearch
/etc/elasticsearch/elasticsearch.yml //主配置文件
/etc/elasticsearch/jvm.options       //java虚拟机配置
/etc/init.d/elasticsearch            //init.d启动脚本 
/etc/sysconfig/elasticsearch         //环境变量，如java_home
/usr/lib/sysctl.d/elasticsearch.conf //最大连接数,不需要动
/usr/lib/systemd/system/elasticsearch.service //systemd启动脚本
```

### 4.4调整jvm配置
```bash
vim /etc/elasticsearch/jvm.options
-Xms1500m    //最小内存                                                                                                                                                       
-Xmx1500m    //最大内存，根据服务器配置调整

1.不要超过30G
2.最好预留总内存的50%
```
### 4.5调整elasticsearch配置
```bash
vim /etc/elasticsearch/elasticsearch.yml
node.name: node-1 //节点名称
path.data: /data/elasticsearch //数据目录
path.logs: /var/log/elasticsearch //日志目录
bootstrap.memory_lock: true //开启jvm内存锁定
network.host: 10.0.0.51,127.0.0.1 //绑定本机ip
http.port: 9200  //默认端口号

mkdir -p /data/elasticsearch
chown elasticsearch.elasticsearch -R /data/elasticsearch
```

### 4.6启动报错
```bash
[2019-07-09T10:49:36,109][ERROR][o.e.b.Bootstrap          ] [node-1] node validation exception
[1] bootstrap checks failed
[1]: memory locking requested for elasticsearch process but memory is not locked
```
#### 4.6.1解决方法:
**参考官方文档：**
[https://www.elastic.co/guide/en/elasticsearch/reference/6.6/setup-configuration-memory.html](https://www.elastic.co/guide/en/elasticsearch/reference/6.6/setup-configuration-memory.html)
[https://www.elastic.co/guide/en/elasticsearch/reference/6.6/setting-system-settings.html](https://www.elastic.co/guide/en/elasticsearch/reference/6.6/setting-system-settings.html)
```bash
systemctl edit elasticsearch

[Service]
LimitMEMLOCK=infinity

systemctl daemon-reload
systemctl start elasticsearch
```
### 4.7报错总结：
1. 配置文件没有任何修改
2. 配置文件没有修改IP地址
3. 系统内存只有1个G，启动失败
4. 配置文件参数拼写错误，启动失败
5. 忘记修改内存锁定,启动失败
6. 重启linux

## 5.MySQL对比ES
|MySQL|ES
|:-----|:-----|
|库|index（索引）|
|表|type（类型）|
|行|doc（文档）|
|字段|Fields（文档存在多个字段）|

## 6.检查ES是否正常
- 浏览器访问 `http://10.0.0.51:9200`
- shell运行`curl 10.0.0.240:9200`

## 7.ES的交互方式
**说明：**es还为我们提供了基于http协议——以json为数据交互格式的restful API。通过9200端口与es进行通信，你甚至可以通过curl命令与es通信。
- curl命令：
  - 特点：最繁琐，最复杂，最容易出错
  - 要求：不需要安装任何软件，只需要有curl命令

- es-head插件
  - 特点：查看数据方便，操作相对容易
  - 要求：需要nodejs环境

- kibana
  - 特点：查看数据以及报表格式丰富，操作很简单
  - 要求：需要java环境和安装配置kibana

### 7.1curl交互演示
```bash
#节点查看
curl 10.0.0.51:9200/_cat/nodes

#状态检查
curl 10.0.0.51:9200/_cat/health

#创建个索引
curl -XPUT '10.0.0.51:9200/pincheng?pretty'

#查看索引
curl 10.0.0.51:9200/_cat/indices

#查看分片
curl 10.0.0.51:9200/_cat/shards

#往这个索引里面插入一条指定id号为1的数据,PUT更新，需要填写完整的信息.
                           #“库”     #“表”  #id
curl -XPUT '10.0.0.51:9200/pincheng/student/1?pretty' -H 'Content-Type: application/json' -d'
{
    "first_name" : "zhang",
    "last_name": "san",
    "age" : 25,
    "about" : "I love to go rock climbing", 
    "interests": [ "sports" ]
}'

#往这个索引里面插入一条随机生成一个id的数据（不指定id）,POST更新，只需要填写需要更改的信息
curl -XPOST  '10.0.0.51:9200/pincheng/student?pretty' -H 'Content-Type: application/json' -d' 
{
"first_name": "li",
"last_name" : "si",
"age" : 32,
"about" : "I like to collect rock albums", 
"interests": [ "music" ]
}'

#查询索引当中的所有数据
curl -XGET  '10.0.0.51:9200/pincheng/student/_search?pretty'

#查询索引当中的一条数据
curl -XGET  '10.0.0.51:9200/pincheng/student/1?pretty'
#删除索引当中的一条数据
curl -XDELETE  '10.0.0.51:9200/pincheng/student/1?pretty'
#删除索引
curl -XDELETE 'localhost:9200/vipinfo?pretty'
#修改系统默认的副本及分片数量
curl -XPUT '10.0.0.51:9200/_template/template_http_request_record' -H 'Content-Type: application/json' -d'
{
    "index_patterns": ["*"],
    "settings": {
    "number_of_shards" : 5,
    "number_of_replicas" : 1
    }
}'
```
### 7.2es-head插件交互
#### 7.2.1安装node-js环境
```bash
#安装node-js环境
cd /server/tools
wget https://nodejs.org/dist/v12.16.3/node-v12.16.3-linux-x64.tar.xz
tar -xf node-v12.16.3-linux-x64.tar.xz

#安装依赖
yum -y install openssl screen kernel-devel

#安装
mv node-v12.16.3-linux-x64/ /application/
ln -s /application/node-v12.16.3-linux-x64/ /application/node


cat >> /etc/bashrc <<'EOF'
export NODE_HOME=/application/node
export PATH=$NODE_HOME/bin:$PATH
EOF

. /etc/bashrc

[root@db01 ~]# node -v && npm -v
v12.16.3
6.14.4
```
#### 7.2.2安装es-head
```bash
npm install -g cnpm --registry=https://registry.npm.taobao.org

cd /application/
git clone git://github.com/mobz/elasticsearch-head.git
cd elasticsearch-head/
cnpm install //安装依赖

screen -S es-head //离线运行
cnpm run start //启动es-head
 #http://localhost:9100
```
![es-head](/images/img-153.png)
#### 7.2.3跨域问题
**官方文档：**[https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-http.html](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-http.html)
```bash
vim /etc/elasticsearch/elasticsearch.yml
http.cors.enabled: true  //如果启用了 HTTP 端口，那么此属性会指定是否允许跨源 REST 请求。
http.cors.allow-origin: "*" //如果 http.cors.enabled 的值为 true，那么该属性会指定允许 REST 请求来自何处。

systemctl restart elasticsearch
```
![连接ES](/images/img-154.png)
#### 7.2.4Chrome插件
**安装地址：**[https://chrome.google.com/webstore/detail/elasticsearch-head/ffmkiejjmecolpfloofpjologoblkegm/related](https://chrome.google.com/webstore/detail/elasticsearch-head/ffmkiejjmecolpfloofpjologoblkegm/related)
![es-head插件](/images/img-155.png)