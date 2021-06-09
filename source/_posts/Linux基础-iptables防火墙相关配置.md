title: Linux基础-iptables防火墙相关配置
author: 饼铛
cover: /images/pasted-33.png
abbrlink: d7240237
tags:
  - iptables
categories:
  - Web集群
date: 2019-04-03 11:39:00
---
**容器：**瓶瓶罐罐 存放东西

**表(table)：**存放链的容器

**链(chain)：**存放规则的容器

**规则(policy)：**
- 准许或拒绝规则
  - 准许或拒绝规则ACCPT DROP police：警察


![iptables](/images/pasted-28.png)
## iptables执行过程
### 工作流程：
1. 防火墙是层层过滤的，实际是按照配置规则的顺序从上到下，从前到后进行过滤的。
2. 如果匹配上规则，即明确表示是阻止还是通过，数据包就不再向下匹配新的规则。
3. 如果规则中没有明确表明是阻止还是通过的，也就是没有匹配规则，向下进行匹配，直到匹配默认规则得到明确的阻止还是通过。
4. 防火墙的默认规则是所有规则执行完才执行的。


### 四表与五链
`filter`(默认，防火墙功能 准许 拒绝)
`nat`表 nat功能
 - 内网服务器上外网
 - 端口映射
 
`mangle`
`raw`

#### filter表
**强调：**主要和主机自身相关，真正负责主机防火墙功能的（过滤流入流出主机的数据包）`filter`表示iptables默认使用的表，这个表定义了三个链（`chains`）
**企业工作场景：**主机防火墙
**相关链：**
- `INPUT`：负责过滤所有目标地址是本机地址的数据包，人话：就是过滤进入主机的数据包(检票员)
- `FORWARD`：负责转发流经主机的数据包。起转发的作用，和NAT关系很大，后面会详细介绍LVSNAT模式，`net.ipv4.ip_forward=0`
```bash
[root@Felix ~]# #net.core.rmem_max = 16777216 #发送套接字缓冲区大小的默认值
[root@Felix ~]# cat /proc/sys/net/core/rmem_max 
16777216
```
- `OUTPUT`：处理所有源地址是本机地址的数据包，人话：就是处理从主机发出去的数据包(超市保安)

#### nat表：
`Network Address Translation`：网络地址转换
负责网络地址转换的，即来源与目的IP地址和port的转换。
**应用：**和主机本身无关，一般用于局域网共享上网或者特殊的端口转换服务相关。
**工作场景：**
1. 用于企业路由（zebra）或网关（iptables），共享上网（POSTROUTING）
2. 做内部外部IP地址一对一映射（dmz），硬件防火墙映射IP到内部服务器，ftp服务（PREROUTING)
3. WEB，单个端口的映射，直接映射80端口（PREROUTING）这个表定义了3个链，nat功能相当于网络的acl控制。和网络交换机acl类似。

### 相关链：
- `OUTPUT`：和主机放出去的数据包有关，改变主机发出数据包的目的地址。
- `PREROUTING`：在数据包到达防火墙时，进行路由判断之前执行的规则，作用是改变数据包的目的地址、目的端口等(目的nat)就是收信时，根据规则重写收件人的地址。
例如：把公网IP:xxx.xxx.xxx.xxx映射到局域网的xx.xx.xx.xx服务器上。
如果是web服务，可以把80转换为局域网的服务器9000端口上
`10.0.0.61 8080（目标端口）---nat---a 10.0.0.7 22`

- `POSTROUTING`：在数据包离开防火墙时进行路由判断之后执行的规则，作用改变数据包的源地址，源端口等。(源nat)
写好发件人的地址，要让家人回信时能够有地址可回。
例如。默认笔记本和虚拟机都是局域网地址，在出网的时候被路由器将源地址改为了公网地址。
**生产应用：**局域网共享上网。


![iptables](/images/pasted-29.png)

## C7补充安装
```bash
yum install iptables-services
[root@Felix ~]# rpm -ql iptables
/usr/sbin/iptables  #iptables管理命令

[root@Felix ~]# rpm -ql iptables-services
/etc/sysconfig/ip6tables
/etc/sysconfig/iptables  #防火墙配置文件
/usr/lib/systemd/system/ip6tables.service
/usr/lib/systemd/system/iptables.service  #防火墙服务配置文件（命令）
[root@Felix ~]# systemctl cat iptables.service 
# /usr/lib/systemd/system/iptables.service

加载内核模块实现防火墙功能：
临时生效
modprobe ip_tables
modprobe iptable_filter
modprobe iptable_nat
modprobe ip_conntrack
modprobe ip_conntrack_ftp
modprobe ip_nat_ftp
modprobe ipt_state

lsmod | egrep 'ipt|nat|filter' <==检查
```
![iptables](/images/pasted-30.png)

### 关闭其他防火墙并
```
[root@Felix ~]# systemctl start iptables  <==启动
[root@Felix ~]# systemctl enable iptables  <==开机自启
Created symlink from /etc/systemd/system/basic.target.wants/iptables.service to /usr/lib/systemd/system/iptables.service.
```
![iptables](/images/pasted-31.png)

## iptables 默认使用filter表
```bash
参数：
-----------------------------
-F  #清除规则
-X  #删除用户自定义的链
-Z  #链的命中数和字节数

-t   #指定表
-D  #删除规则
-A  #末尾追加规则 准许
-I   #开头插入规则 拒绝

-m #指定防火墙模块
-p  #protocal 协议类型 tcp/udp/icmp/all
--dport  #dest目的端口
--sport  #源端口
-d  #目的ip
-s  #源ip
-m #指定模块
-i  #--input 数据进入的时候 通过哪个网卡
-o  #--output 数据流出的 通过网卡

-j  #--jump 满足条件后的动作：DROP/ACCEPT/REJECT
-----------------------------
示例：
nc -l port 生成本地端口
   也可传输文件，两端聊天
```
![iptables](/images/pasted-32.png)

## 配置案例
```bash
#禁止22端口
iptables -t filter -A INPUT -p tcp --dport 23 -j DROP

#禁止8.8.8.8，远程本机22端口
iptables -t filter -I INPUT -s 8.8.8.8 -p tcp --dport 22 -j DROP

#禁止网段
iptables -t filter -I INPUT -s 10.0.0.0/24 -p tcp --dport 8080 -j DROP

#只允许指定网段连入（10.0.0.0网段）
allow 10.0.0.0/24;
deny all;
iptables -I INPUT ! -s 10.0.0.0/24 -j DROP

#禁止用户访问指定范围的端口
iptables -I INPUT -p tcp --dport 1024:65535 -j DROP #1024-65535
iptables -I INPUT -p tcp -m multiport --dport 81,443 -j DROP #81和443

#防火墙禁ping
iptables -t filter -I INPUT -p icmp --icmp-type any -j DROP
或者
iptables -t filter -I INPUT -p icmp --icmp-type 8 -j DROP

#匹配网络状态（tcp/ip）：
·-m state --state
·NEW：已经或将启动新的连接
·ESTABLISHED：已建立的连接
·RELATED：正在启动的新连接
·INVALID：非法或无法识别的
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT  #放行“回应报文” “和关系连接”，不要单独放行80，443等端口
参考文档：http://www.zsythink.net/archives/1597/

#限制并发及速率 #无效
iptables -I INPUT -p icmp --icmp-type 8 -j ACCEPT
iptables -I INPUT -p icmp --icmp-type 8 -m limit --limit 6/min --limit-burst 5 -j ACCEPT 
-m limit--limit n/{second/minute/hour}：解释：指定时间内的请求速率”n”为速率，后面为时间分别为：秒 分 时
-limit-burst[n]
解释：在同一时间内允许通过的请求”n"为数字，不指定默认为5

#保存防火墙规则：
[root@Felix ~]# service iptables save 
iptables: Saving firewall rules to /etc/sysconfig/iptables:[  确定  ]
或者
iptables-save > /etc/sysconfig/iptables

#误删防火墙规则恢复
方法1：重启iptables服务
方法2：iptables-restore < /etc/sysconfig/iptables 
	从文件中读取防火墙规则，并生效。
```

### nat
1.共享上网
2.端口映射
3.ip映射

### 一、共享上网
```bash
[root@Felix ~]# iptables -t nat -A POSTROUTING -s 172.16.1.0/24 -j SNAT --to-source 10.0.0.61
[root@Felix ~]# iptables -t nat -nL
开启内核转发功能
1.临时开启，（写入内存，在内存中开启）
echo "1" > /proc/sys/net/ipv4/ip_forward
2.永久开启，（写入内核）
echo "net.ipv4.ip_forward = 1" >> /etc/sysctl.conf 
sysctl -p               ----加载,使得配置文件立即生效

iptables -t nat -A POSTROUTING -s 172.16.1.0/24 -j MASQUERADE #<==公网ip不固定的情况下使用
云服务器：NAT网关
```

### 二、端口映射
```bash
iptables -t nat -A PREROUTING -d 10.0.0.61 -p tcp --dport 9000 -j DNAT --to-destination 172.16.1.7:22

## 映射内网111.170:8000 到 244.69:20001
#出
-A POSTROUTING -d 172.19.111.170/32 -p tcp -m tcp --dport 8000 -j SNAT --to-source 172.19.244.69

#进
-A PREROUTING -d 172.19.244.69/32 -p tcp -m tcp --dport 20001 -j DNAT --to-destination 172.19.111.170:8000
```
内网07主机的22端口 映射到外网9000端口，要开启内核转发。

### 三、IP映射
后端的主机需要指向防火墙所在服务器
```bash
iptables -t nat -A PREROUTING -d 10.0.0.62 -j DNAT --to-destination 172.16.1.8
```

## 生产环境初始配置
```bash
#准许连接sshd端口
iptables -t filter -I INPUT -p tcp --dport 22 -j ACCEPT

#允许本机回环lo接口流量流出与流入
iptables -A INPUT -i lo -j ACCEPT 
iptables -A OUTPUT -o lo -j ACCEPT

#放行其他端口
-A INPUT -p tcp -m tcp --dport 1723 -j ACCEPT   #访行pptp服务
-A INPUT -s 10.93.131.0/24 -p tcp -m tcp --dport 22 -j ACCEPT  #允许指定网段ssh
-A INPUT -p gre -j ACCEPT  #允许gre协议，pptp需要
-A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT  #只放行关系连接和回应报文，防止攻击

参考文档：https://blog.csdn.net/weixin_34102807/article/details/91616105


#修改默认规则
#原则：限制进不限制出，外网严格限制，内网可完全放开。
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT
iptables -A INPUT -s 172.16.1.0/24 -j ACCEPT
```
