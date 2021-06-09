---
title: Zabbix-自定义监控项、触发器、告警
author: 饼铛
cover: /images/img-134.png
tags:
  - Web集群
  - Zabbix
categories:
  - Web集群
abbrlink: 3837938a
date: 2020-03-22 19:17:00
---
## 1.Zabbix监控的添加顺序
1. 添加主机组
2. 添加主机
3. 添加监控项目
4. 根据监控项目可以添加图形或者触发器

## 2.监控需求
1. 监控主机是否存活
2. 监控主机的端口是否能通

## 3.示例：
### 第一步：添加主机组：
配置 > 主机群组 > 创建主机群组
>ps:主机组名字建议以业务或功能进行区分,如www，或数据库

### 第二步：创建监控主机
配置 > 主机 > 创建主机
- 主机名称 //被监控主机名
- 群组 //主机组
- 接口
  - Agent interfaces [zabbix提供一个agent客户端，安装在linux/win等]
  - SNMP interfaces [使用snmp协议监控路由交换]
  - JMX interfaces [监控java进程]
  - IPMI interfaces [监控硬件信息]

克隆添加主机
配置 > 主机 > 想要克隆的主机 > Clone

## 4.zabbix-agent监控主机：
**被监控主机安装zabbix客户端**
zabbix-agent和zabbix-server在同一台机器
```bash
rpm -ivh https://mirrors-i.tuna.tsinghua.edu.cn/zabbix/zabbix/4.4/rhel/7/x86_64/zabbix-agent-4.4.1-1.el7.x86_64.rpm
systemctl restart zabbix-agent
systemctl enable zabbix-agent
```

zabbix-agent和zabbix-server不在同一台机器
```bash
#安装zabbix-agent
rpm -ivh https://mirrors-i.tuna.tsinghua.edu.cn/zabbix/zabbix/4.4/rhel/7/x86_64/zabbix-agent-4.4.1-1.el7.x86_64.rpm

#安装zabbix-agent并指向zabbix服务器ip
sed -i 's/Server=127.0.0.1/Server=10.0.0.51/g' /etc/zabbix/zabbix_agentd.conf
systemctl restart zabbix-agent
systemctl enable zabbix-agent
```
![zabbix-agent](/images/img-135.png)

## 5.监控项介绍：
- CPU
- Disk
  - Disk average queue size (avgqu-sz) 每个读操作平均所需的时间，该值越大，表示排队等待处理的io越多
  - Disk read rate 读取速率
  - Disk read request avg waiting time (r_await) 每个读操作平均所需的时间
  - Disk utilization 磁盘利用率
  - Disk write rate 磁盘写入速率
  - Disk write request avg waiting time (w_await) 每个写操作平均所需的时间
- General
  - Maximum number of open file descriptors 打开的最大文件描述符 `ulimit -n`
  - Maximum number of processes 最大进程数
  - Number of logged in users 登陆用户数
  - Number of running processes 正在运行的进程数
  - System boot time 系统启动时间
  - System description 系统描述
  - System local time 系统本地时间
  - System name 主机名
- Memory
  - Available memory 有效内存
  - Free swap space 可用虚拟内存
  - Free swap space in % 可用虚拟内存（％）
  - Memory utilization 内存利用率
  - Total memory 总内存
  - Total swap space 总虚拟内存
- Interface enp0s3 
  - Bits received 接收bite
  - Bits sent 发送bite
  - Inbound packets discarded 入站被丢弃
  - Inbound packets with errors 入站数据包有错误
  - Interface type 接口类型
  - Operational status 运行状态
  - Outbound packets discarded 出站被丢弃的数据包
  - Outbound packets with errors 错误的出站数据包
- Filesystem /  根分区
  - Free inodes in % 可用inode
  - Space utilization 空间利用率
  - Total space 空间总大小
  - Used space 已用空间
- Inventory 
  - Operating system 操作系统
  - Operating system architecture 操作系统架构
  - Software installed 以安装的软件

## 6.自定义监控项：
### 6.1监控硬盘tps：
- 命令行，手动取值.(或写脚本)
- 修改zabbix_agent配置文件

```bash
vim /etc/zabbix/zabbix_agentd.conf
Option: UserParameter 
UserParameter=<key>,<shell command>
例如：
UserParameter=sda_tps,iostat|awk '$1 ~/sda/{print $2}'
systemctl restart zabbix-agent
```
- 服务端做取值测试

```bash
rpm -ivh https://mirrors.tuna.tsinghua.edu.cn/zabbix/zabbix/4.4/rhel/7/x86_64/zabbix-get-4.4.1-1.el7.x86_64.rpm

zabbix_get -s 10.0.0.53 -p 10050 -k sda_tps
0.28
```

- web界面添加和查看
设置：
配置 > 主机 > 指定主机 > 监控项 > 创建监控项
![创建监控项](/images/img-136.png)
查看：
监测 > 最新数据 > 选择主机 > 过滤名称 > 查看细节
![查看监控项](/images/img-137.png)

### 6.2监控tcp80端口并发数：
- 配置zabbix_agent
```bash
[root@db03 ~]# netstat -na | awk '$4 ~/:80/&&$6 ~/ESTABLISHED/{print $5"--->"$4}'
10.0.0.51:17425--->10.0.0.53:80

vim /etc/zabbix/zabbix_agentd.conf
UserParameter=tcp80_count,netstat -na | awk '$4 ~/:80/&&$6 ~/ESTABLISHED/{print $5"--->"$4}' | wc -l
systemctl restart zabbix-agent
```
- 服务端做取值测试
```bash
[root@db01 ~]# zabbix_get -s 10.0.0.53 -k tcp80_count
1
```

- web界面定义
![定义监控项](/images/img-138.png)
- Linux下压力测试命令ab
```bash
[root@db01 ~]# yum whatprovides ab
属于httpd-tools
  -n在测试会话中所执行的请求个数。默认时，仅执行一个请求
  -c一次产生的请求个数。默认是一次一个
[root@db01 ~]# ab -n 10000 -c 200 http://10.0.0.53/
```
查看：
![查看取值](/images/img-139.png)

## 7.监控项批量复制：
zabbix_server
配置 > 主机 > 监控项 >  勾选自定义监控项 > 复制 > 目标 > 主机 > 复制

zabbix_agent
在/etc/zabbix/zabbix_agentd.d/目录中加入监控项配置文件
```bash
如：
UserParameter=sda_tps,iostat|awk '$1 ~/sda/{print $2}'
UserParameter=tcp80_count,netstat -na | awk '$4 ~/:80/&&$6 ~/ESTABLISHED/{print $5"--->"$4}' | wc -l 
```

## 8.触发器配置
配置 > 主机 > 触发器 > 创建触发器 > 添加
### 8.1常用函数：
- `last()`最新值达到
- `avg()` 平均值达到
- `diff()` 对比文件的差异比如配合md5
![触发器](/images/img-140.png)

```bash
{www_001:tcp80_count.last()}>100 //最近一个并发数大于100，那么告警
www_001 //监控主机名
tcp80_count //监控项的key
last() //函数方法
```

### 8.2启用动作：
配置 > 动作 > Report problems to Zabbix administrators > 启用

**定义告警内容：**
![告警内容](/images/img-143.png)
```bash
告警主机: {HOSTNAME1}
主机分组: {TRIGGER.HOSTGROUP.NAME}
告警时间: {EVENT.DATE} {EVENT.TIME}
告警等级: {TRIGGER.SEVERITY}
告警信息: {TRIGGER.NAME}
告警项目: {TRIGGER.KEY1}
问题详情: {ITEM.NAME}:{ITEM.VALUE}
当前状态: {TRIGGER.STATUS}
事件ID: {EVENT.ID}
#恢复操作内容一样，把故障改成恢复
```

### 8.3告警提示音
用户资料 > 正在发送消息 > 勾选前端消息中
![告警音](/images/img-141.png)

### 8.4压力测试
对10.0.0.51做压力测试
```bash
[root@db01 ~]# ab -n 100000 -c 4000 http://10.0.0.53/
```
![告警查看](/images/img-142.png)