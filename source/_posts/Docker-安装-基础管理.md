title: Docker-安装&基础管理
author: 饼铛
cover: /images/img-163.png
tags:
  - Docker
  - Web集群
categories:
  - Web集群
abbrlink: 408a4bb8
date: 2020-07-16 00:05:00
---
## 1.Docker介绍
### 1.1什么是容器？ 
容器就是在隔离的环境运行的一个进程，如果进程停止，容器就会销毁。隔离的环境拥有自己的系统文件，ip地址， 主机名等。

### 1.2docker的主要组成部分 
docker是传统的CS架构分为docker client和docker server,向mysql一样
docker主要组件有：镜像、容器、仓库、网络、存储 

## 2.Docker安装
```bash
[root@wikifx2 ~]# uname -r
3.10.0-1127.13.1.el7.x86_64
```

### 2.1配置网卡转发,看值是否为1
```
$ sysctl -a |grep -w net.ipv4.ip_forward
net.ipv4.ip_forward = 1
```

#### 若未配置，需要执行如下
```
$ cat <<EOF >  /etc/sysctl.d/docker.conf
net.bridge.bridge-nf-call-ip6tables = 1
net.bridge.bridge-nf-call-iptables = 1
net.ipv4.ip_forward=1
EOF
$ sysctl -p /etc/sysctl.d/docker.conf
```
### 2.2yum源准备：
`curl -o /etc/yum.repos.d/docker-ce.repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo`

### 2.3更新 yum 缓存：
`sudo yum makecache fast`

### 2.4查看可用版本的 Docker-ce：
`yum list docker-ce --showduplicates | sort -r`

### 2.5安装依赖：
```bash
[root@wikifx2 ~]# yum install -y yum-utils device-mapper-persistent-data lvm2
#yum-util 提供yum-config-manager功能，另外两个是devicemapper驱动依赖的
```

### 2.6安装指定版本：
```bash
[root@wikifx2 ~]# yum install docker-ce-18.06.3.ce -y
[root@wikifx2 ~]# docker version 
Client:
 Version:         1.13.1
 API version:     1.26
 Package version: 
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```
## 3.Docker-hub镜像
加速源配置[华为源]
```bash
tee /etc/docker/daemon.json <<- 'EOF'
{
  "registry-mirrors" : [
    "https://8xpk5wnt.mirror.aliyuncs.com",
    "https://dockerhub.azk8s.cn",
    "https://registry.docker-cn.com",
    "https://ot2k4d59.mirror.aliyuncs.com/"
  ]
}
EOF

systemctl daemon-reload
systemctl restart docker
systemctl enable docker
```
```bash
[root@wikifx2 ~]#  docker version 	#查看Docker版本信息
Client:				#Docker Client版本信息
 Version:           18.06.3-ce		#Docker版本为18.06.3-ce为社区版
 API version:       1.38			#API远程管理版本为1.38
 Go version:        go1.10.3		#Go版本为1.10.3
 Git commit:        d7080c1
 Built:             Wed Feb 20 02:26:51 2019	 #该版本发布时间
 OS/Arch:           linux/amd64		#系统信息
 Experimental:      false

Server:								#Docker Server版本信息
 Engine:
  Version:          18.06.3-ce
  API version:      1.38 (minimum version 1.12)
  Go version:       go1.10.3
  Git commit:       d7080c1
  Built:            Wed Feb 20 02:28:17 2019
  OS/Arch:          linux/amd64
  Experimental:     false
```

```bash
[root@wikifx2 ~]#  docker info 		#查看docker系统的详细信息
Containers: 2						#容器数量
 Running: 0							#正在运行的容器数
 Paused: 0							#暂停的容器数量
 Stopped: 2							#停止的容器数量
Images: 1							#镜像数量
Server Version: 18.06.3-ce		#Docker Server版本信息
Storage Driver: overlay2		#docker文件系统
 Backing Filesystem: xfs		#docker文件系统是建立在本地文件系统之上，xfs为本地文件系统
 Supports d_type: true
 Native Overlay Diff: true
Logging Driver: json-file
Cgroup Driver: cgroupfs		#Cgroups控制硬件资源系统
Plugins:					#插件
 Volume: local				#存储卷插件
 Network: bridge host macvlan null overlay	#网络插件
 Log: awslogs fluentd gcplogs gelf journald json-file logentries splunk syslog	#日志插件
Swarm: inactive				#Docker Swarm管理工具状态
Runtimes: runc
Default Runtime: runc
Init Binary: docker-init
containerd version: 468a545b9edcd5932818eb9de8e72413e616e86e
runc version: a592beb5bc4c4092b1b1bac971afed27687340c5
init version: fec3683
Security Options:
 seccomp
  Profile: default
Kernel Version: 3.10.0-1127.13.1.el7.x86_64	#系统内核版本
Operating System: CentOS Linux 7 (Core)		#系统版本
OSType: linux								#系统类型
Architecture: x86_64						#系统结构
CPUs: 4										#CPU数量
Total Memory: 9.764GiB						#内存大小
Name: wikifx2								#主机名称
ID: SKJ4:YG5I:2S44:EMQM:PDH2:4EGG:NXLK:5HRF:LBLM:J6QX:5RXX:BZVJ
Docker Root Dir: /var/lib/docker		#Docker根目录
Debug Mode (client): false				#Docker Clinet的Debug模块状态
Debug Mode (server): false				#Docker Server的Debug模块状态
Registry: https://index.docker.io/v1/	#Docker仓库API地址
Labels:									#最新版本
Experimental: false
Insecure Registries:
 127.0.0.0/8
Registry Mirrors:						#Docker仓库镜像加速地址
 https://51d27ab892014e7db8daac09c3d669ec.mirror.swr.myhuaweicloud.com/
Live Restore Enabled: false

WARNING: bridge-nf-call-iptables is disabled
WARNING: bridge-nf-call-ip6tables is disabled
```
```bash
[root@wikifx2 ~]# du -sh /var/lib/docker/*             #Docker的镜像及一些数据都在此目录下
16K	/var/lib/docker/builder
56K	/var/lib/docker/buildkit
24K	/var/lib/docker/containerd
72K	/var/lib/docker/containers
500K	/var/lib/docker/image
44K	/var/lib/docker/network
137M	/var/lib/docker/overlay2
0	/var/lib/docker/plugins
0	/var/lib/docker/runtimes
0	/var/lib/docker/swarm
0	/var/lib/docker/tmp
0	/var/lib/docker/trust
24K	/var/lib/docker/volumes
```
## 4.启动第一个容器 
`docker run -d -p 80:80 nginx` （创建并运行一个容器） 
-  -d 放在后台 
-  -p 端口映射 
- nginx docker镜像的名字

## 5.Docker管理
### 5.1Docker镜像管理
`docker search`：搜索镜像 建议： 1，优先考虑官方 2，stars数量多
`docker pull (push)`：下载镜像
`docker pull centos:7`：（没有指定版本，默认下载最新版）官方pull
`docker login -u user -p passwd`：登录到镜像仓库地址，如果未指定，默认登录到 Docker Hub
`docker logout`：登出该仓库
`docker pull daocloud.io/huangzhichong/alpine-cn:latest`：私有仓库pull
`docker push <自己镜像仓库名> nginx`：上传本地镜像nginx到镜像仓库中

`docker image ls`：查看本地镜像
`docker image save abreto/alpine-cn > alpine-cn.tar.gz`：导出镜像
`docker image rm abreto/alpine-cn:latest`：删除镜像
`docker image load < alpine-cn.tar.gz`：导入镜像
`docker tag nginx nginx:v3`：给nginx镜像加上标签，以便分类
`docker rmi nginx:v3`：删除本地镜像，有时候可能会报错是因为该镜像被容器使用，所以要删除关联的容器或者去标签

### 5.2Docker容器管理
`docker run image_name`：容器启动
`docker run ==== docker create  && docker start`：相当于创建并启动容器
```bash
docker run -it --name centos7 centos:7 /bin/bash 
常用：-it 分配交互式的终端 
* /bin/bash覆盖容器的初始命令
* -a stdin：指定标准输入输出内容类型，可选STDIN|STDOUT|STDERR三项
* -d：后台运行容器，并返回容器ID
* -P：将容器内的某端口映射到宿主机的任意端口
* -p：将容器内的某端口指定映射到宿主机的某端口
* -v：将宿主机的某目录指定映射到容器的某目录
* -i：以交互式运行容器，通常与-t同时使用
* -t：为该容器分配一个伪终端，通常与-i同时使用
* --name centos7：为容器指定一个名称为nginx
* --dns 8.8.8.8：指定容器使用的DNS服务器，默认不指定和宿主机一致
* --dns-search example.com：指定容器DNS搜索域名，默认和宿主机一致
* -h "localhost"：指定容器的hostname
* -e username=“ritchie”：设置环境变量
* --env-file[]：从指令读入环境变量
* --cpuset="0-2" or --cpuset="0,1,2"：绑定容器到指定CPU运行
* -m：设置容器使用的内存最大值
* --net="bridge"：指定容器的网络连接类型，支持bridge/host/none/container，四种类型
* --link=[]：添加链接到另一容器
* --expose=[]:开放一个端口或一组端口
```
#### 资源限制
```bash
-cpuset-cpus用于设置容器可以使用的 vCPU 核。
-c,--cpu-shares用于设置多个容器竞争 CPU 时，各个容器相对能分配到的 CPU 时间比例。
假设有三个正在运行的容器，这三个容器中的任务都是 CPU 密集型的。
第一个容器的 cpu 共享权值是 1024，其它两个容器的 cpu 共享权值是 512。
第一个容器将得到 50% 的 CPU 时间，而其它两个容器就只能各得到 25% 的 CPU 时间了。

如果再添加第四个 cpu 共享值为 1024 的容器，每个容器得到的 CPU 时间将重新计算。
第一个容器的CPU 时间变为 33%，其它容器分得的 CPU 时间分别为 16.5%、16.5%、33%。
必须注意的是，这个比例只有在 CPU 密集型的任务执行时才有用。
在四核的系统上，假设有四个单进程的容器，它们都能各自使用一个核的 100% CPU 时间，不管它们的 cpu 共享权值是多少。
$ docker run --cpuset-cpus="0-3" --cpu-shares=512 --memory=500m nginx:alpine
```
`docker container ls`：查看正在运行的容器
```bash
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                NAMES
6fd1af39a2b2        nginx               "/docker-entrypoint.…"   56 seconds ago      Up 55 seconds       0.0.0.0:80->80/tcp   naughty_goldwasser
容器ID		镜像名字		初始命令		创建时间		状态	  端口映射		容器名称
```
`docker ps`：查看正在运行的容器 -a 查看所有 -q 静默只显示id
```bash
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 6fd1af39a2b2：获取指定容器IP
```
`docker container stop 6fd1af39a2b2`：停止指定容器
`docker container start 9087b0a0896f`：启动指定容器
`docker kill CONTAINER_ID`：杀死指定容器
`docker exec -it 9087b0a0896f /bin/bash`：调试指定容器
`docker rm 'docker ps -a -q'`：删除所有容器
`docker logs -f d0c3e9bafb35`：跟踪容器centos的日志输出

**ps**：docker容器内的第一个进程（初始命令）必须一直处于前台运行状态（必须夯住），否则这个容器就会处于退出状态！
生产环境：夯住&&启动服务


### 5.3Docker网络管理
```bash
docker port d0c3e9bafb35 #检查指定容器端口映射状态

-p hostPort:containerPort 
指定映射（docker 会自动添加一条iptables规则来实现端口映射）

-p  ip:hostPort:containerPort 
多个容器都想使用80端口[前提主机存在多个ip]

-p ip::containerPort
随机端口[由内核参数控制]
[root@wikifx2 ~]# cat /etc/sysctl.conf | grep ip_local_port_range
net.ipv4.ip_local_port_range = 4000    65000
测试启动容器并随机进行端口映射
docker run -d -p 192.168.200.163::80 nginx
docker run -d -p 192.168.200.163::80 nginx
docker run -d -p 192.168.200.163::80 nginx

[root@wikifx2 /var/lib/docker/overlay2]# netstat -lntup
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 192.168.200.163:4000    0.0.0.0:*               LISTEN      20395/docker-proxy  
tcp        0      0 192.168.200.163:4001    0.0.0.0:*               LISTEN      20510/docker-proxy  
tcp        0      0 192.168.200.163:4002    0.0.0.0:*               LISTEN      20630/docker-proxy 

-p hostPort:containerPort:udp
-p 10.0.0.100::53:udp 使用宿主机的10.0.0.100的这个ip地址的随机端口的udp协议映射容器的udp53端口
-p hostPort:containerPort -p hostPort:containerPort 一个容器映射多个端口
```

### 5.4Docker数据卷使用
数据卷的创建：
官方的解释是：数据卷是一个可供一个或多个容器使用的特殊目录，它绕过 UFS.
1. UFS即UNIX文件系统的简称
2. 数据卷可以在容器之间共享和重用
3. 对数据卷的修改会立马生效
4. 对数据卷的更新，不会影响镜像
5. 数据卷默认会一直存在，即使容器被删除
6. 数据卷的使用，类似于Linux下对目录或文件进行mount，镜像中的被指定为挂载点的目录中的文件会被隐藏掉，能显示看的是挂载的数据卷

docker run 
-v 宿主机绝对目录:容器目录
-v 容器目录			 #创建一个随机卷，来持久化容器的目录下的数据,可添加多个
-v 卷名:容器目录		#创建一个固定名字的卷，来持久化容器的目录下的数据
--volumes-from 	 	#继承一个容器挂载所有的卷

**注意：**如果挂载的数据卷不存在，Docker会自动创建该目录。

1.拷贝本机文件到容器中指定目录：
```bash
docker container cp 本机目录或文件 <容器名字或_ID>:容器内目录
docker cp jenkins.war 5c5aea2de2e4:/opt/
[root@wikifx2 ~]# docker exec -it 5c5aea2de2e4 /bin/bash
root@5c5aea2de2e4:/# ls /opt
jenkins.war
```
2.挂载本机目录到容器内指定目录
```bash
[root@wikifx2 ~]# docker rm -f `docker ps -q -a`
44e79e25ab11
[root@wikifx2 ~]# echo "`hostname -i`______`hostname`" > /opt/index.html   #本地目录写入首页文件
[root@wikifx2 ~]# ls /opt/
gitlab  index.html  nginx.tar.gz  rh
[root@wikifx2 ~]# docker run -d -p 80:80 -v /opt/:/usr/share/nginx/html nginx:latest  #挂载本地目录到容器
f3e1daca1805a9b95d79bac52d9b17d58bf6529eecb89205fae42095cb758ca4
[root@wikifx2 ~]# echo "pincheng.org" >> /opt/index.html #更改本机首页文件

$ docker run --name nginx -d  -v /opt:/opt -v /var/log:/var/log nginx:alpine
$ docker run --name mysql -e MYSQL_ROOT_PASSWORD=123456 -d -v /opt/mysql/:/var/lib/mysql mysql:5.7
```
3.挂载容器数据卷
```bash
[root@wikifx2 ~]# docker rm -f `docker ps -q -a`
f3e1daca1805
[root@wikifx2 ~]# docker volume create pincheng #创建容器数据卷
[root@wikifx2 ~]# docker run -d -p 80:80 -v pincheng:/usr/share/nginx/html nginx:latest #若不存在则自动创建容器数据卷pincheng
b34ceac10eb50f11122df2c303cec951c5168e3b2e38a266f75057cfbd0bfbc4
[root@wikifx2 ~]# docker volume ls #查看所有数据卷
DRIVER              VOLUME NAME
local               pincheng
[root@wikifx2 ~]# docker volume inspect pincheng #查看数据卷详细信息
[
    {
        "CreatedAt": "2020-07-21T14:55:29+08:00",
        "Driver": "local",
        "Labels": null,
        "Mountpoint": "/var/lib/docker/volumes/pincheng/_data", #找到数据卷所在目录
        "Name": "pincheng",
        "Options": null,
        "Scope": "local"
    }
]
[root@wikifx2 ~]# cd /var/lib/docker/volumes/pincheng/_data
[root@wikifx2 /var/lib/docker/volumes/pincheng/_data]# ls
50x.html  index.html
[root@wikifx2 /var/lib/docker/volumes/pincheng/_data]# echo "pincheng.org `date`" > index.html
```
4.挂载相同的目录
```bash
#挂载到之前容器相同目录
docker run -d -p 83:80 —volume-from 容器ID nginx:latest
```
参考文档：https://abcops.cn/254.html