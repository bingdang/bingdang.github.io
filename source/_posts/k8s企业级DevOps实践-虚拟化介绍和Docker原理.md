title: k8s企业级DevOps实践-虚拟化介绍和Docker原理深入
author: 饼铛
cover: images/pasted-6.png
tags:
  - Docker
  - k8s
categories:
  - Web集群
abbrlink: '61316209'
date: 2021-04-11 01:55:00
---
虚拟化核心需要解决的问题：资源隔离与资源限制

- 虚拟机硬件虚拟化技术， 通过一个 hypervisor 层实现对资源的彻底隔离。
- 容器则是操作系统级别的虚拟化，利用的是内核的 Cgroup 和 Namespace 特性，此功能完全通过软件实现。

### Namespace 资源隔离

命名空间是全局资源的一种抽象，将资源放到不同的命名空间中，各个命名空间中的资源是相互隔离的。 通俗来讲，就是docker在启动一个容器的时候，会调用Linux Kernel Namespace的接口，来创建一块虚拟空间，创建的时候，可以支持设置下面这几种（可以随意选择）,docker默认都设置。

- pid：用于进程隔离（PID：进程ID）
- net：管理网络接口（NET：网络）
- ipc：管理对 IPC 资源的访问（IPC：进程间通信（信号量、消息队列和共享内存））
- mnt：管理文件系统挂载点（MNT：挂载）
- uts：隔离主机名和域名
- user：隔离用户和用户组（3.8以后的内核才支持）


```go
func setNamespaces(daemon *Daemon, s *specs.Spec, c *container.Container) error {
    // user
    // network
    // ipc
    // uts
    // pid
    if c.HostConfig.PidMode.IsContainer() {
        ns := specs.LinuxNamespace{Type: "pid"}
        pc, err := daemon.getPidContainer(c)
        if err != nil {
            return err
        }
        ns.Path = fmt.Sprintf("/proc/%d/ns/pid", pc.State.GetPID())
        setNamespace(s, ns)
    } else if c.HostConfig.PidMode.IsHost() {
        oci.RemoveNamespace(s, specs.LinuxNamespaceType("pid"))
    } else {
        ns := specs.LinuxNamespace{Type: "pid"}
        setNamespace(s, ns)
    }
    return nil
}
```

### CGroup 资源限制

通过`namespace`可以保证容器之间的隔离，但是无法控制每个容器可以占用多少资源， 如果其中的某一个容器正在执行 CPU 密集型的任务，那么就会影响其他容器中任务的性能与执行效率，导致多个容器相互影响并且抢占资源。如何对多个容器的资源使用进行限制就成了解决进程虚拟资源隔离之后的主要问题。
![docker](/images/pasted-13.png)

Control Groups（简称 CGroups）就是能够隔离宿主机器上的物理资源，例如 CPU、内存、磁盘 I/O 和网络带宽。每一个 `CGroup` 都是一组被相同的标准和参数限制的进程。而我们需要做的，其实就是把容器这个进程加入到指定的`Cgroup`中。

### UnionFS 联合文件系统

Linux `namespace`和`cgroup`分别解决了容器的资源隔离与资源限制，那么容器是很轻量的，通常每台机器中可以运行几十上百个容器， 这些个容器是共用一个image，还是各自将这个image复制了一份，然后各自独立运行呢？ 如果每个容器之间都是全量的文件系统拷贝，那么会导致至少如下问题：

- 运行容器的速度会变慢
- 容器和镜像对宿主机的磁盘空间的压力

怎么解决这个问题------Docker的存储驱动

- 镜像分层存储
- UnionFS


Docker 镜像是由一系列的层组成的，每层代表 Dockerfile 中的一条指令，比如下面的 Dockerfile 文件：

```dockerfile
FROM ubuntu:15.04
COPY . /app
RUN make /app
CMD python /app/app.py
```

这里的 Dockerfile 包含4条命令，其中每一行就创建了一层，下面显示了上述Dockerfile构建出来的镜像运行的容器层的结构：
![docker](/images/pasted-14.png)

镜像就是由这些层一层一层堆叠起来的，镜像中的这些层都是只读的，当我们运行容器的时候，就可以在这些基础层至上添加新的可写层，也就是我们通常说的`容器层`，对于运行中的容器所做的所有更改（比如写入新文件、修改现有文件、删除文件）都将写入这个容器层。

对容器层的操作，主要利用了写时复制（CoW）技术。CoW就是copy-on-write，表示只在需要写时才去复制，这个是针对已有文件的修改场景。 CoW技术可以让所有的容器共享image的文件系统，所有数据都从image中读取，只有当要对文件进行写操作时，才从image里把要写的文件复制到自己的文件系统进行修改。所以无论有多少个容器共享同一个image，所做的写操作都是对从image中复制到自己的文件系统中的复本上进行，并不会修改image的源文件，且多个容器操作同一个文件，会在每个容器的文件系统里生成一个复本，每个容器修改的都是自己的复本，相互隔离，相互不影响。使用CoW可以有效的提高磁盘的利用率。 
![docker](/images/pasted-15.png)

### Docker网络

docker容器是一块具有隔离性的虚拟系统，容器内可以有自己独立的网络空间，

- 多个容器之间是如何实现通信的呢？
- 容器和宿主机之间又是如何实现的通信呢？
- 使用-p参数是怎么实现的端口映射?

了解docker的网络模型，对于学习docker来说十分必要。

#### 网络模式

我们在使用docker run创建Docker容器时，可以用--net选项指定容器的网络模式，Docker有以下4种网络模式：

- bridge模式，使用--net=bridge指定，默认设置

- host模式，使用--net=host指定，容器内部网络空间共享宿主机的空间，效果类似直接在宿主机上启动一个进程，端口信息和宿主机共用。

- container模式，使用--net=container:NAME_or_ID指定

  指定容器与特定容器共享网络命名空间

- none模式，使用--net=none指定

  网络模式为空，即仅保留网络命名空间，但是不做任何网络相关的配置(网卡、IP、路由等)

#### bridge模式

那我们之前在演示创建docker容器的时候其实是没有指定的网络模式的，如果不指定的话默认就会使用bridge模式，bridge本意是桥的意思，其实就是网桥模式，那我们怎么理解网桥，如果需要做类比的话，我们可以把网桥看成一个二层的交换机设备，我们来看下这张图：

交换机通信简图
![dockernet](/images/pasted-16.png)
网桥模式示意图
docker-bridge.jpeg
![dockernet](/images/pasted-17.png)
网桥在哪，查看网桥

```powershell
$ yum install -y bridge-utils
$ brctl show
bridge name     bridge id               STP enabled     interfaces
docker0         8000.0242b5fbe57b       no              veth3a496ed
```

有了网桥之后，docker在启动一个容器的时候做了哪些事情才能实现容器间的互联互通

Docker 创建一个容器的时候，会执行如下操作：

- 创建一对虚拟接口/网卡，也就是veth pair
- 本地主机一端桥接 到默认的 docker0 或指定网桥上，并具有一个唯一的名字，如 veth9953b75
- 容器一端放到新启动的容器内部，并修改名字作为 eth0，这个网卡/接口只在容器的命名空间可见
- 从网桥可用地址段中（也就是与该bridge对应的network）获取一个空闲地址分配给容器的 eth0
- 配置默认路由到网桥

那整个过程其实是docker自动帮我们完成的，清理掉所有容器，验证：

```bash
## 清掉所有容器
$ docker rm -f `docker ps -aq`
$ docker ps
$ brctl show # 查看网桥中的接口，目前没有

## 创建测试容器test1
$ docker run -d --name test1 nginx:alpine
$ brctl show # 查看网桥中的接口，已经把test1的veth端接入到网桥中
$ ip a |grep veth # 已在宿主机中可以查看到
41: vethff3fbfd@if40: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue master docker0 state UP

$ docker exec -ti test1 sh 
/ # ifconfig  # 查看容器的eth0网卡及分配的容器ip
/ # route -n  # 观察默认网关都指向了网桥的地址，即所有流量都转向网桥，等于是在veth pair接通了网线
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
0.0.0.0         172.17.0.1      0.0.0.0         UG    0      0        0 eth0
172.17.0.0      0.0.0.0         255.255.0.0     U     0      0        0 eth0

# 再来启动一个测试容器，测试容器间的通信
$ docker run -d --name test2 nginx:alpine
$ docker exec -ti test sh
/ # sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
/ # apk add curl
/ # curl 172.17.0.8:80

## 为啥可以通信，因为两个容器是接在同一个网桥中的，通信其实是通过mac地址和端口的的记录来做转发的。test1访问test2，通过test1的eth0发送ARP广播，网桥会维护一份mac映射表，我们可以大概通过命令来看一下，
$ brctl showmacs docker0
## 这些mac地址是主机端的veth网卡对应的mac，可以查看一下
$ ip a 
```

如何知道网桥上的这些虚拟网卡与容器端是如何对应？

通过ifindex，网卡索引号
![dockernet](/images/pasted-18.png)
整理脚本，快速查看对应：

```bash
for container in $(docker ps -q); do
    iflink=`docker exec -it $container sh -c 'cat /sys/class/net/eth0/iflink'`
    iflink=`echo $iflink|tr -d '\r'`
    veth=`grep -l $iflink /sys/class/net/veth*/ifindex`
    veth=`echo $veth|sed -e 's;^.*net/\(.*\)/ifindex$;\1;'`
    echo $container:$veth
done
```

上面介绍了容器之间的通信（类似容器[计算机]接入docker虚拟网桥[交换机]），那么容器与宿主机的通信是如何做的？
![dockernet](/images/pasted-19.png)
添加端口映射：

```bash
## 启动容器的时候通过-p参数添加宿主机端口与容器内部服务端口的映射
$ docker run --name test -d -p 8088:80 nginx:alpine
$ curl localhost:8088
```

端口映射如何实现的？先来回顾iptables链表图

![dockernet](/images/pasted-20.png)

访问本机的8088端口，数据包会从流入方向进入本机，因此涉及到PREROUTING和INPUT链，我们是通过做宿主机与容器之间加的端口映射，所以肯定会涉及到端口转换，那哪个表是负责存储端口转换信息的呢，就是nat表，负责维护网络地址转换信息的。因此我们来查看一下PREROUTING链的nat表：

```bash
[root@55-console ~]# iptables -t nat -nvL PREROUTING
Chain PREROUTING (policy ACCEPT 15080 packets, 1258K bytes)
 pkts bytes target     prot opt in     out     source               destination         
13797  820K DOCKER     all  --  *      *       0.0.0.0/0            0.0.0.0/0            ADDRTYPE match dst-type LOCAL
```

规则利用了iptables的addrtype拓展，匹配网络类型为本地的包，如何确定哪些是匹配本地，

```bash
[root@55-console ~]# ip route show table local type local
127.0.0.0/8 dev lo  proto kernel  scope host  src 127.0.0.1 
127.0.0.1 dev lo  proto kernel  scope host  src 127.0.0.1 
172.17.0.1 dev docker0  proto kernel  scope host  src 172.17.0.1 
192.168.1.55 dev ens192  proto kernel  scope host  src 192.168.1.55
```

也就是说目标地址类型匹配到这些的，会转发到我们的TARGET中，TARGET是动作，意味着对符合要求的数据包执行什么样的操作，最常见的为ACCEPT或者DROP，此处的TARGET为DOCKER，很明显DOCKER不是标准的动作，那DOCKER是什么呢？我们通常会定义自定义的链，这样把某类对应的规则放在自定义链中，然后把自定义的链绑定到标准的链路中，因此此处DOCKER 是自定义的链。那我们现在就来看一下DOCKER这个自定义链上的规则。

```bash
[root@55-console ~]# iptables -t nat -nvL DOCKER
Chain DOCKER (2 references)
 pkts bytes target     prot opt in     out     source               destination         
   77  4620 RETURN     all  --  docker0 *       0.0.0.0/0            0.0.0.0/0           
    0     0 DNAT       tcp  --  !docker0 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:12800 to:172.17.0.2:12800
    1    52 DNAT       tcp  --  !docker0 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:11800 to:172.17.0.2:11800
  133  6916 DNAT       tcp  --  !docker0 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:8080 to:172.17.0.3:8080
```

此条规则就是对主机收到的目的端口为11800的tcp流量进行DNAT转换，将流量发往172.17.0.2:11800，172.17.0.2地址是不是就是我们上面创建的Docker容器的ip地址，流量走到网桥上了，后面就走网桥的转发就ok了。
所以，外界只需访问192.168.1.56:11800就可以访问到容器中的服务了。

数据包在出口方向走POSTROUTING链，我们查看一下规则：

```bash
[root@55-console ~]# iptables -t nat -nvL POSTROUTING
Chain POSTROUTING (policy ACCEPT 335 packets, 19964 bytes)
 pkts bytes target     prot opt in     out     source               destination         
   68 31283 MASQUERADE  all  --  *      !docker0  172.17.0.0/16        0.0.0.0/0           
    0     0 MASQUERADE  tcp  --  *      *       172.17.0.2           172.17.0.2           tcp dpt:12800
    0     0 MASQUERADE  tcp  --  *      *       172.17.0.2           172.17.0.2           tcp dpt:11800
    0     0 MASQUERADE  tcp  --  *      *       172.17.0.3           172.17.0.3           tcp dpt:8080
```

大家注意MASQUERADE这个动作是什么意思，其实是一种更灵活的SNAT，把源地址转换成主机的出口ip地址，那解释一下这条规则的意思:

这条规则会将源地址为172.17.0.0/16的包（也就是从Docker容器产生的包），并且不是从docker0网卡发出的，进行源地址转换，转换成主机网卡的地址。大概的过程就是ACK的包在容器里面发出来，会路由到网桥docker0，网桥根据宿主机的路由规则会转给宿主机网卡eth0，这时候包就从docker0网卡转到eth0网卡了，并从eth0网卡发出去，这时候这条规则就会生效了，把源地址换成了eth0的ip地址。

> 注意一下，刚才这个过程涉及到了网卡间包的传递，那一定要打开主机的ip_forward转发服务，要不然包转不了，服务肯定访问不到。

##### 抓包演示

我们先想一下，我们要抓哪个网卡的包

- 首先访问宿主机的8088端口，我们抓一下宿主机的eth0

  ```powershell
  $ tcpdump -i eth0 port 8088 -w host.cap
  ```

- 然后最终包会流入容器内，那我们抓一下容器内的eth0网卡

  ```bash
  # 容器内安装一下tcpdump
  $ sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
  $ apk add tcpdump
  $ tcpdump -i eth0 port 80 -w container.cap
  ```


到另一台机器访问一下，

```bash
$ curl 172.21.32.6:8088/
```

停止抓包，拷贝容器内的包到宿主机

```bash
$ docker cp test:/root/container.cap /root/
```

把抓到的内容拷贝到本地，使用wireshark进行分析。

```bash
$ scp root@172.21.32.6:/root/*.cap /d/packages
```

（wireshark合并包进行分析）

```bash
宿主机：192.168.1.32
 |__DOCKER Container 172.17.0.n
```

![dockernet](/images/pasted-21.png)

![dockernet](/images/pasted-22.png)

![dockernet](/images/pasted-23.png)



```bash
请求：
No.1_直接访问: 物理机1 172.21.32.9:51594 > 物理机2 172.21.32.15:8088 

No.2_DNAT转换：172.21.32.9:51594 > 172.17.0.4:80 
//将No.1请求报文中的目的ip32.15:8088转为容器的ip0.4:80，利用的是DOCKER自定义的iptables链

响应：
No.3_容器响应：172.17.0.4:80 > 物理机1 172.21.32.9:51594

No.4_SNAT转换：172.21.32.15:8088 > 172.21.32.9:51594
//将No.3请求报文中的目的ip0.4:80转为宿主机的ip32.15:8088，利用的是POSTROUTING链
```

进到容器内的包做`DNAT`，出去的包做`SNAT`，这样对外面来讲，根本就不知道机器内部是谁提供服务，其实这就和一个内网多个机器公用一个外网IP地址上网的效果是一样的，这也属于NAT功能的一个常见的应用场景。

一系列的nat转换后对于其他机器或服务访问本机由docker提供的服务时，对于他们来说就形成了不可知论

#### Host模式

容器内部不会创建网络空间，共享宿主机的网络空间。直接使用宿主机的端口无法判断来源[容器服务/本机服务]。

```bash
$ docker run --net host -d --name mysql -e MYSQL_ROOT_PASSWORD=pincheng mysql:5.7
```

#### Conatiner模式

这个模式指定新创建的容器和已经存在的一个容器共享一个 Network Namespace，而不是和宿主机共享。新创建的容器不会创建自己的网卡，配置自己的 IP，而是和一个指定的容器共享 IP、端口范围等。同样，两个容器除了网络方面，其他的如文件系统、进程列表等还是隔离的。两个容器的进程可以通过 lo 网卡设备通信。 

![dockernet](/images/pasted-24.png)
```bash

## 启动测试容器，共享mysql的网络空间
$ docker run -ti --rm --net=container:mysql busybox sh
/ # ip a
/ # netstat -tlp|grep 3306
/ # telnet localhost 3306
```
#### 实用技巧

1. 清理主机上所有退出的容器

   ```bash
   $ docker rm  $(docker ps -aq)
   ```

2. 调试或者排查容器启动错误

   ```bash
   ## 若有时遇到容器启动失败的情况，可以先使用相同的镜像启动一个临时容器，先进入容器
   $ docker run -ti --rm <image_id> bash
   ## 进入容器后，手动执行该容器对应的ENTRYPOINT或者CMD命令，这样即使出错，容器也不会退出，因为bash作为1号进程，我们只要不退出容器，该容器就不会自动退出
   ```


### 总结

- 为了解决软件交付过程中的环境依赖，同时提供一种更加轻量的虚拟化技术，Docker出现了

- 2013年诞生，15年开始迅速发展，从17.03月开始，使用时间日期管理版本，稳定版以每季度为准

- Docker是一种CS架构的软件产品，可以把代码及依赖打包成镜像，作为交付介质，并且把镜像启动成为容器，提供容器生命周期的管理

- 使用yum部署docker，启动后通过操作docker这个命令行，自动调用docker daemon完成容器相关操作

- 常用操作

   - systemctl  start|stop|restart docker
   - docker build | pull  -> docker tag -> docker push
   - docker run --name my-demo  -d  -p 8080:80 -v  /opt/data:/data  demo:v20200327
   - docker cp  /path/a.txt  mycontainer:/opt
   - docker exec -ti  mycontainer  /bin/sh
   - docker logs -f mycontainer

- 通过dockerfile构建业务镜像，先使用基础镜像，然后通过一系列的指令把我们的业务应用所需要的运行环境和依赖都打包到镜像中，然后通过CMD或者ENTRYPOINT指令把镜像启动时的入口制定好，完成封装即可。有点类似于，先找来一个空的集装箱(基础镜像)，然后把项目依赖的服务都扔到集装箱中，然后设置好服务的启动入口，关闭箱门，即完成了业务镜像的制作。

- 容器的实现依赖于内核模块提供的namespace和control-group的功能，通过namespace创建一块虚拟空间，空间内实现了各类资源(进程、网络、文件系统)的隔离，提供control-group实现了对隔离的空间的资源使用的限制。

- docker镜像使用分层的方式进行存储，根据主机的存储驱动的不同，实现方式会不同，kernel在3.10.0-514以上自动支持overlay2 存储驱动，也是目前Docker推荐的方式。

- 得益于分层存储的模式，多个容器可以通过copy-on-write的策略，在镜像的最上层加一个可写层，实现一个镜像快速启动多个容器的场景

- docker的网络模式分为4种，最常用的为bridge和host模式。bridge模式通过docker0网桥，启动容器的时候通过创建一对虚拟网卡，将容器连接在桥上，同时维护了虚拟网卡与网桥端口的关系，实现容器间的通信。容器与宿主机之间的通信通过iptables端口映射的方式，docker利用iptables的PREROUTING和POSTROUTING的nat功能，实现了SNAT与DNAT，使得容器内部的服务被完美的保护起来。